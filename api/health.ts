/**
 * Vercel Serverless Function — بررسی سلامت (بدون هیچ وابستگی به core/handlers)
 * برای تشخیص اینکه آیا مشکل از محیط/بیلد است یا از منطق برنامه.
 * GET /api/health → { ok: true, ... }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  // No core import here (keeps health dependency-free, like before).
  const explicit = (process.env.STORAGE_BACKEND ?? '').trim().toLowerCase();
  const backend =
    explicit === 'd1' || explicit === 'blob' || explicit === 'local'
      ? explicit
      : process.env.BLOB_READ_WRITE_TOKEN
        ? 'blob'
        : 'local';
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    node: process.version,
    storageBackend: backend,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasD1Config: !!process.env.STORAGE_API_URL && !!process.env.STORAGE_API_TOKEN,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasInviteCode: !!process.env.INVITE_CODE,
  });
}
