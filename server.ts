/**
 * سرور محلی — فقط برای توسعه. در پروداکشن از Vercel Serverless Functions
 * (api/auth.ts و api/data.ts) استفاده می‌شود.
 *
 * اجرا:  npm run start   (بعد از npm run build)
 * یا در حالت توسعه کامل: npm run start در یک ترمینال + npm run dev در ترمینال دیگر
 * (Vite روی 5173 با پروکسی /api به این سرور روی 8787)
 */
import express from 'express';
import type { Request, Response } from 'express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { handleAuth, handleData, type ApiCtx } from './api/_lib/handlers.js';

const PORT = Number(process.env.PORT ?? 8787);
const app = express();

app.use(express.json({ limit: '256kb' }));

function buildCtx(req: Request): ApiCtx {
  const cookies: Record<string, string> = {};
  const header = req.headers.cookie;
  if (header) {
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return {
    body: (req.body ?? {}) as Record<string, unknown>,
    cookies,
    isSecure: req.secure === true,
  };
}
for (const route of ['/api/auth', '/api/data'] as const) {
  app.post(route, async (req: Request, res: Response) => {
    try {
      const ctx = buildCtx(req);
      const result = route === '/api/auth' ? await handleAuth(ctx) : await handleData(ctx);
      const secure = req.secure === true;
      if (result.setCookie) {
        const { name, value, maxAge } = result.setCookie;
        res.setHeader(
          'Set-Cookie',
          `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
        );
      } else if (result.clearCookie) {
        res.setHeader(
          'Set-Cookie',
          `${result.clearCookie}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
        );
      }
      res.status(result.status).json(result.body);
    } catch (e) {
      console.error(route, e);
      res.status(500).json({ error: 'خطای داخلی سرور.' });
    }
  });
}

// سرو کردن خروجی build شده (dist) به‌صورت SPA
const dist = join(process.cwd(), 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(join(dist, 'index.html'));
  });
} else {
  app.get('/', (_req: Request, res: Response) => {
    res
      .status(200)
      .send('فایل‌های فرانت ساخته نشده‌اند. ابتدا «npm run build» یا «npm run dev» را اجرا کنید.');
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✔ سرور محلی روی http://127.0.0.1:${PORT} اجرا شد`);
  console.log('  (ذخیره‌سازی محلی: پوشه .data — روی Vercel از Vercel Blob استفاده می‌شود)');
});
