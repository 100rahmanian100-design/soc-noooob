/**
 * Vercel Serverless Function — مهاجرت یک‌باره Blob/محلی → Cloudflare R2
 *
 * چرا لازم است؟ خواندن self-heal در core.ts اسناد shared (accounts/comments/...)
 * را تنبل منتقل می‌کند، اما فایل‌های user-data/<user> فقط وقتی خوانده شوند
 * منتقل می‌شوند که همان کاربر لاگین کند. این اندپوینت همه را یکجا منتقل می‌کند.
 *
 * استفاده:
 *   GET /api/migrate?token=<AUTH_SECRET>
 * پاسخ: { ok:true, migrated:[...], skipped:[...], errors:[...] }
 *
 * امنیت: توکن باید برابر AUTH_SECRET (یا MIGRATE_TOKEN اگر ست باشد) باشد.
 * بعد از اتمام مهاجرت می‌توانید این فایل را حذف کنید.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SECRET,
  getAccounts,
  getChat,
  getComments,
  getContents,
  getNotifications,
  getUserData,
  saveAccounts,
  saveChat,
  saveComments,
  saveContents,
  saveNotifications,
  saveUserData,
} from './_lib/core.js';
import { r2Enabled } from './_lib/r2.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'فقط GET مجاز است.' });
    return;
  }
  const expected = (process.env.MIGRATE_TOKEN ?? SECRET ?? '').trim();
  const got = String((req.query?.token ?? '') as string).trim();
  if (!expected || got !== expected) {
    res.status(401).json({ error: 'توکن نامعتبر است. ?token=<AUTH_SECRET> را بدهید.' });
    return;
  }
  if (!r2Enabled()) {
    res.status(500).json({
      error: 'R2 تنظیم نشده. متغیرهای R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET را ست کنید.',
    });
    return;
  }
  const migrated: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  // اسناد shared — خواندنشان (self-heal) + بازنویسی صریح در R2
  const shared: Array<[string, () => Promise<unknown>, (v: never) => Promise<void>]> = [
    ['accounts', getAccounts, saveAccounts as (v: never) => Promise<void>],
    ['comments', getComments, saveComments as (v: never) => Promise<void>],
    ['notifications', getNotifications, saveNotifications as (v: never) => Promise<void>],
    ['chat', getChat, saveChat as (v: never) => Promise<void>],
    ['contents', getContents, saveContents as (v: never) => Promise<void>],
  ];
  for (const [name, getter, saver] of shared) {
    try {
      const value = (await getter()) as never;
      await saver(value);
      migrated.push(name);
    } catch (e) {
      errors.push({ key: name, error: String((e as Error)?.message ?? e).slice(0, 300) });
    }
  }

  // داده هر کاربر
  try {
    const { accounts } = await getAccounts();
    if (accounts.length === 0) skipped.push('user-data (no accounts)');
    for (const acc of accounts) {
      const label = `user-data/${acc.username}`;
      try {
        const data = await getUserData(acc.username);
        await saveUserData(data);
        migrated.push(label);
      } catch (e) {
        errors.push({ key: label, error: String((e as Error)?.message ?? e).slice(0, 300) });
      }
    }
  } catch (e) {
    errors.push({ key: 'user-data-list', error: String((e as Error)?.message ?? e).slice(0, 300) });
  }

  res.status(200).json({ ok: errors.length === 0, migrated, skipped, errors });
}
