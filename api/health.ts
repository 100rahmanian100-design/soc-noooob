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
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasInviteCode: !!process.env.INVITE_CODE,
  });
}
