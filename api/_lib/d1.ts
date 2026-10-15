/**
 * Cloudflare D1 storage client via Worker API — server-side only.
 * Contract: GET/PUT {base}/v1/blob?key=<enc(key)> + Authorization Bearer.
 * Never import from frontend. Never log tokens, payloads, or user data.
 */

const GET_TIMEOUT_MS = Number(process.env.STORAGE_API_TIMEOUT_MS ?? 8_000) || 8_000;
const PUT_TIMEOUT_MS = Number(process.env.STORAGE_API_TIMEOUT_MS ?? 10_000) || 10_000;

/** Max encrypted payload accepted from / sent to D1 (5 MiB — app docs are KBs). */
export const D1_MAX_VALUE_BYTES = 5 * 1024 * 1024;

/** Fixed docs + per-user docs. Must stay in sync with core.ts blobKeys. */
const FIXED_KEYS = new Set([
  'accounts.json.enc',
  'comments.json.enc',
  'notifications.json.enc',
  'chat.json.enc',
  'contents.json.enc',
]);

/**
 * Allowlist: fixed keys OR user-data/<encodeURIComponent(username)>.json.enc
 * Usernames: /^[a-zA-Z0-9._-]{3,32}$/ (handlers.ts). Lenient single-segment
 * match so legacy keys are never stranded; rejects traversal/slashes.
 */
export function isAllowedStorageKey(key: string): boolean {
  if (FIXED_KEYS.has(key)) return true;
  const m = /^user-data\/([^/\\]+)\.json\.enc$/.exec(key);
  if (!m) return false;
  const seg = m[1];
  if (seg.length === 0 || seg.length > 256) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(seg);
  } catch {
    return false;
  }
  if (decoded.length === 0) return false;
  if (decoded.includes('/') || decoded.includes('\\') || decoded === '..') return false;
  if (/(^|\/)\.\.($|\/)/.test(decoded)) return false;
  return /^[A-Za-z0-9._~%!$&'()*+,;=@-]+$/.test(seg);
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function d1Config(): { baseUrl: string; token: string } | null {
  const baseUrl = env('STORAGE_API_URL').replace(/\/+$/, '');
  const token = env('STORAGE_API_TOKEN');
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

export function storageBackend(): 'd1' | 'blob' | 'local' {
  const explicit = env('STORAGE_BACKEND').toLowerCase();
  if (explicit === 'd1' || explicit === 'blob' || explicit === 'local') return explicit;
  if (env('BLOB_READ_WRITE_TOKEN')) return 'blob';
  return 'local';
}

function assertHttps(url: string): void {
  if (!/^https:\/\//i.test(url)) throw new Error('STORAGE_API_URL must use https://');
}

function byteLength(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

/** Extract encrypted payload string from the various shapes a Worker may return. */
function extractValue(bodyText: string): string | null {
  if (bodyText.trim() === '') return null;
  const t = bodyText.trim();
  if (!t.startsWith('{')) return bodyText;
  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    for (const f of ['value', 'data', 'body']) {
      if (typeof obj[f] === 'string') return obj[f] as string;
    }
    return null;
  } catch {
    return bodyText;
  }
}

export function d1Enabled(): boolean {
  return d1Config() !== null;
}

export async function d1Get(key: string): Promise<string | null> {
  if (!isAllowedStorageKey(key)) throw new Error(`disallowed storage key: ${key}`);
  const cfg = d1Config();
  if (!cfg) throw new Error('D1 is not configured (STORAGE_API_URL / STORAGE_API_TOKEN missing)');
  assertHttps(cfg.baseUrl);
  const url = `${cfg.baseUrl}/v1/blob?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { authorization: `Bearer ${cfg.token}` },
    signal: AbortSignal.timeout(GET_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) {
    throw new Error(`d1 get unauthorized (http ${res.status})`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`d1 get failed (http ${res.status}): ${text.slice(0, 200)}`);
  }
  const bodyText = await res.text();
  if (byteLength(bodyText) > D1_MAX_VALUE_BYTES + 1024) {
    throw new Error(`d1 get payload too large for key ${key}`);
  }
  return extractValue(bodyText);
}

export async function d1Put(key: string, body: string): Promise<void> {
  if (!isAllowedStorageKey(key)) throw new Error(`disallowed storage key: ${key}`);
  const cfg = d1Config();
  if (!cfg) throw new Error('D1 is not configured (STORAGE_API_URL / STORAGE_API_TOKEN missing)');
  assertHttps(cfg.baseUrl);
  if (byteLength(body) > D1_MAX_VALUE_BYTES) {
    throw new Error(`payload too large for key ${key} (${byteLength(body)} bytes)`);
  }
  const url = `${cfg.baseUrl}/v1/blob?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    body: JSON.stringify({ key, value: body }),
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(PUT_TIMEOUT_MS),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`d1 put unauthorized (http ${res.status})`);
  }
  if (res.status === 400 || res.status === 413) {
    const text = await res.text().catch(() => '');
    throw new Error(`d1 put rejected (http ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`d1 put failed (http ${res.status}): ${text.slice(0, 200)}`);
  }
}

