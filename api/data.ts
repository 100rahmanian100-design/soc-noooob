/**
 * Vercel Serverless Function — داده کاربر، کامنت‌ها، مدیریت حساب‌ها
 * منطق اصلی در api/_lib/handlers.ts و api/_lib/core.ts است.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleData, type ApiCtx, type ApiResult } from './_lib/handlers.js';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function cookieHeader(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'فقط POST مجاز است.' });
    return;
  }
  try {
    const ctx: ApiCtx = {
      body: (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>,
      cookies: parseCookies(req.headers.cookie),
      isSecure: process.env.VERCEL === '1',
    };
    const result: ApiResult = await handleData(ctx);
    const secure = process.env.VERCEL === '1';
    if (result.setCookie) {
      const { name, value, maxAge } = result.setCookie;
      res.setHeader('Set-Cookie', cookieHeader(name, value, maxAge, secure));
    } else if (result.clearCookie) {
      res.setHeader('Set-Cookie', cookieHeader(result.clearCookie, '', 0, secure));
    }
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error('[api/data]', e);
    res.status(500).json({ error: 'خطای ذخیره‌سازی. لطفاً دوباره تلاش کنید و در صورت تکرار، Runtime Logs را بررسی کنید.' });
  }
}
