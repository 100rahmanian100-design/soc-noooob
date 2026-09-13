/**
 * Vercel Serverless Function — دیباگ مرحله‌ای برای ریشه‌یابی FUNCTION_INVOCATION_FAILED
 * هر مرحله try/catch جدا دارد تا دقیقاً مشخص شود کدام خط می‌میرد.
 * GET /api/debug → { steps: [...] }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Step {
  name: string;
  ok: boolean;
  detail?: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const t0 = Date.now();
  const steps: Step[] = [];
  const push = (name: string, ok: boolean, detail?: string) => {
    steps.push({ name, ok, detail });
  };

  // مرحله ۱: خود هندلر بالا آمد
  push('handler-enter', true, `node ${process.version}`);

  // مرحله ۲: ایمپورت node:crypto
  try {
    const c = await import('node:crypto');
    const h = c.createHash('sha256').update('x').digest('hex').slice(0, 8);
    push('import-node-crypto', true, h);
  } catch (e) {
    push('import-node-crypto', false, String(e).slice(0, 300));
    res.status(200).json({ steps, ms: Date.now() - t0 });
    return;
  }

  // مرحله ۳: ایمپورت node:fs و node:path
  try {
    const fs = await import('node:fs');
    const p = await import('node:path');
    push('import-node-fs-path', true, `existsSync=${typeof fs.existsSync} join=${typeof p.join}`);
  } catch (e) {
    push('import-node-fs-path', false, String(e).slice(0, 300));
    res.status(200).json({ steps, ms: Date.now() - t0 });
    return;
  }

  // مرحله ۴: خواندن env
  try {
    push('read-env', true, `blob=${!!process.env.BLOB_READ_WRITE_TOKEN} secret=${!!process.env.AUTH_SECRET} invite=${!!process.env.INVITE_CODE}`);
  } catch (e) {
    push('read-env', false, String(e).slice(0, 300));
    res.status(200).json({ steps, ms: Date.now() - t0 });
    return;
  }

  // مرحله ۵: ایمپورت core (جایی که loadSecret و توابع crypto اجرا می‌شوند)
  try {
    const core = (await import('./_lib/core')) as Record<string, unknown>;
    push('import-core', true, `exports=${Object.keys(core).slice(0, 8).join(',')}`);
    // مرحله ۶: صدا زدن یک تابع سبک core
    try {
      const h = (core.hashPassword as (p: string) => string)('test-password-123');
      push('core-hashPassword', true, `len=${h.length}`);
    } catch (e) {
      push('core-hashPassword', false, String(e).slice(0, 300));
    }
  } catch (e) {
    push('import-core', false, String((e as Error)?.stack ?? e).slice(0, 800));
    res.status(200).json({ steps, ms: Date.now() - t0 });
    return;
  }

  // مرحله ۷: ایمپورت handlers
  try {
    const handlers = (await import('./_lib/handlers')) as Record<string, unknown>;
    push('import-handlers', true, `exports=${Object.keys(handlers).join(',')}`);
  } catch (e) {
    push('import-handlers', false, String((e as Error)?.stack ?? e).slice(0, 800));
    res.status(200).json({ steps, ms: Date.now() - t0 });
    return;
  }

  res.status(200).json({ steps, ms: Date.now() - t0 });
}
