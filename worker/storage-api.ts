/**
 * Canonical Cloudflare Worker for soc-tier1-database (D1 table app_data).
 *
 * Deploy: copy this file into your Cloudflare Worker, set binding DB ->
 * soc-tier1-database and secret STORAGE_API_TOKEN to the same value as the
 * Vercel STORAGE_API_TOKEN env var.
 *
 * API: GET /v1/blob?key=<key> -> 200 raw encrypted string, 404 if missing
 *      PUT /v1/blob?key=<key> { key?, value } -> 200 { ok: true }
 * Auth: Authorization: Bearer <STORAGE_API_TOKEN> (timing-safe compare).
 */

export interface Env {
  DB: D1Database;
  STORAGE_API_TOKEN: string;
}

const FIXED_KEYS = new Set([
  'accounts.json.enc',
  'comments.json.enc',
  'notifications.json.enc',
  'chat.json.enc',
  'contents.json.enc',
]);

export function isAllowedKey(key: string): boolean {
  if (FIXED_KEYS.has(key)) return true;
  const m = /^user-data\/([^/\\]+)\.json\.enc$/.exec(key);
  if (!m) return false;
  const seg = m[1];
  if (!seg || seg.length > 256) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(seg);
  } catch {
    return false;
  }
  if (!decoded || decoded.includes('/') || decoded.includes('\\')) return false;
  if (/(^|\/)\.\.($|\/)/.test(decoded)) return false;
  return /^[A-Za-z0-9._~%!$&'()*+,;=@-]+$/.test(seg);
}

function unauthorized(): Response {
  return new Response('unauthorized', { status: 401 });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkAuth(req: Request, env: Env): boolean {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) return false;
  const token = m[1].trim();
  const expected = (env.STORAGE_API_TOKEN ?? '').trim();
  if (!expected) return false;
  return timingSafeEqual(token, expected);
}

const MAX_VALUE_BYTES = 5 * 1024 * 1024;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/v1/blob') return new Response('not found', { status: 404 });
    if (!checkAuth(req, env)) return unauthorized();
    const key = url.searchParams.get('key') ?? '';
    if (!isAllowedKey(key)) return new Response('disallowed key', { status: 400 });

    if (req.method === 'GET') {
      const row = await env.DB.prepare('SELECT value FROM app_data WHERE key = ?')
        .bind(key)
        .first<{ value: string }>();
      if (!row) return new Response('not found', { status: 404 });
      return new Response(row.value, {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    if (req.method === 'PUT') {
      let value: unknown;
      try {
        const body = (await req.json()) as Record<string, unknown>;
        value = body.value ?? body.data ?? body.body;
        if (typeof body.key === 'string' && body.key !== key) {
          return new Response('key mismatch', { status: 400 });
        }
      } catch {
        return new Response('invalid json', { status: 400 });
      }
      if (typeof value !== 'string' || value === '') {
        return new Response('missing value', { status: 400 });
      }
      if (new TextEncoder().encode(value).length > MAX_VALUE_BYTES) {
        return new Response('payload too large', { status: 413 });
      }
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO app_data (key, value, updated_at) VALUES (?, ?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      )
        .bind(key, value, now)
        .run();
      return Response.json({ ok: true });
    }

    return new Response('method not allowed', { status: 405 });
  },
};

