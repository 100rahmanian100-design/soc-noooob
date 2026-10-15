/**
 * Vercel Serverless Function — بررسی سلامت (بدون هیچ وابستگی به core/handlers)
 * برای تشخیص اینکه آیا مشکل از محیط/بیلد است یا از منطق برنامه.
 * GET /api/health → { ok: true, ... }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    node: process.version,
    storage: {
      // r2 = مقصد جدید؛ blob = قدیمی (دوران مهاجرت)؛ local = توسعه محلی
      backend: process.env.R2_BUCKET ? 'r2' : process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local',
      hasR2: !!process.env.R2_BUCKET,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    },
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasInviteCode: !!process.env.INVITE_CODE,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
  });
}
