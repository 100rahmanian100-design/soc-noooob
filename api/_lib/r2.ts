/**
 * کلاینت سبک Cloudflare R2 (سازگار با S3) — فقط fetch بومی + node:crypto.
 * عمداً بدون هیچ وابستگی (aws-sdk) تا باندل Vercel سبک بماند و خطای
 * «Dynamic require» ندهد (مشابه مشکلی که با @vercel/blob داشتیم).
 *
 * متغیرهای محیطی:
 *  - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (اجباری)
 *  - R2_ENDPOINT (اختیاری — پیش‌فرض https://<ACCOUNT>.r2.cloudflarestorage.com)
 *  - R2_PREFIX (اختیاری — مثلاً prod/ برای namespacing)
 *
 * آدرس S3: PUT/GET https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
 * امضا: AWS SigV4 با region=auto و service=s3
 */
import { createHash, createHmac } from 'node:crypto';

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function r2Config(): {
  accountId: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
  prefix: string;
} | null {
  const accountId = env('R2_ACCOUNT_ID');
  const accessKey = env('R2_ACCESS_KEY_ID');
  const secretKey = env('R2_SECRET_ACCESS_KEY');
  const bucket = env('R2_BUCKET');
  if (!accountId || !accessKey || !secretKey || !bucket) return null;
  const endpoint = env('R2_ENDPOINT') || `https://${accountId}.r2.cloudflarestorage.com`;
  const prefix = env('R2_PREFIX');
  return { accountId, accessKey, secretKey, bucket, endpoint, prefix };
}

export const r2Enabled = (): boolean => r2Config() !== null;

/** کلید نهایی داخل باکت (با پیشوند اختیاری) */
export function r2ObjectKey(key: string): string {
  const cfg = r2Config();
  const prefix = cfg?.prefix ?? '';
  if (!prefix) return key;
  const p = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return `${p}${key}`;
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

/** انکد کردن path با حفظ اسلش (هر سگمنت جداگانه encode می‌شود) */
function encodeKeyPath(fullPath: string): string {
  return fullPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

interface SignedHeaders {
  'x-amz-content-sha256': string;
  'x-amz-date': string;
  host: string;
}

function signS3Request(
  method: 'GET' | 'PUT',
  url: URL,
  payloadHash: string,
  accessKey: string,
  secretKey: string,
): { authorization: string; amzDate: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const datestamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

  const canonicalUri = encodeKeyPath(url.pathname);
  const canonicalQuery = ''; // بدون query
  const host = url.host;
  const signedHeadersList = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders =
    `host:${host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeadersList,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${secretKey}`, datestamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeadersList}, Signature=${signature}`;
  return { authorization, amzDate };
}

/** خواندن خام یک آبجکت از R2 — null اگر وجود نداشته باشد */
export async function r2Get(key: string): Promise<string | null> {
  const cfg = r2Config();
  if (!cfg) throw new Error('R2 is not configured');
  const objectKey = r2ObjectKey(key);
  const url = new URL(`${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${encodeKeyPath(objectKey)}`);
  // نکته: امضا روی pathname خام انجام می‌شود، پس URL را از همین اجزا می‌سازیم
  const payloadHash = sha256Hex('');
  const { authorization, amzDate } = signS3Request('GET', url, payloadHash, cfg.accessKey, cfg.secretKey);
  const res = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // R2 خطای NoSuchKey را گاهی با 404 و بدنه XML برمی‌گرداند
    if (text.includes('NoSuchKey')) return null;
    throw new Error(`r2 get failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.text();
}

/** نوشتن خام یک آبجکت در R2 (overwrite) */
export async function r2Put(key: string, body: string): Promise<void> {
  const cfg = r2Config();
  if (!cfg) throw new Error('R2 is not configured');
  const objectKey = r2ObjectKey(key);
  const url = new URL(`${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${encodeKeyPath(objectKey)}`);
  const payloadHash = sha256Hex(new TextEncoder().encode(body));
  const { authorization, amzDate } = signS3Request('PUT', url, payloadHash, cfg.accessKey, cfg.secretKey);
  const res = await fetch(url.toString(), {
    method: 'PUT',
    body,
    headers: {
      authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'content-type': 'application/octet-stream',
      'content-length': String(new TextEncoder().encode(body).length),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`r2 put failed (${res.status}): ${text.slice(0, 500)}`);
  }
}
