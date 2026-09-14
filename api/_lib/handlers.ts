/**
 * منطق مشترک API — مستقل از فریم‌ورک
 * این توابع هم توسط Vercel Serverless Functions (api/auth.ts و api/data.ts)
 * و هم توسط سرور محلی Express (server.ts) استفاده می‌شوند.
 */
import {
  type Account,
  type AppNotification,
  type Comment,
  type Role,
  INVITE_CODE,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  findAccount,
  getAccounts,
  getComments,
  getNotifications,
  getUserData,
  hashPassword,
  newId,
  readSession,
  saveAccounts,
  saveComments,
  saveNotifications,
  saveUserData,
  signSession,
  verifyPassword,
} from './core.js';

export interface ApiCtx {
  body: Record<string, unknown>;
  cookies: Record<string, string>;
  /** true اگر اتصال HTTPS باشد (تنظیم Secure روی کوکی) */
  isSecure: boolean;
}

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
  setCookie?: { name: string; value: string; maxAge: number };
  clearCookie?: string;
}

const ok = (body: Record<string, unknown> = {}): ApiResult => ({ status: 200, body });
const err = (status: number, message: string): ApiResult => ({ status, body: { error: message } });

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function publicAccount(a: Account) {
  return {
    username: a.username,
    email: a.email ?? null,
    role: a.role,
    createdBy: a.createdBy,
    active: a.active,
    createdAt: a.createdAt,
  };
}

/** برچسب فارسی فاز برای متن اعلان‌ها */
function phaseLabel(phase: string): string {
  switch (phase) {
    case 'phase-1':
      return 'فاز ۱: آموزش SIEM';
    case 'phase-2':
      return 'فاز ۲: آموزش شبکه';
    case 'phase-3':
      return 'فاز ۳: آموزش Endpoint';
    case 'phase-4':
      return 'فاز ۴: Onboarding';
    default:
      return phase;
  }
}

function publicNotification(n: AppNotification) {
  return { ...n };
}

/** ساخت اعلان برای یک کاربر (بدون تکرار برای همان کامنت/گیرنده) */
async function pushNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  const file = await getNotifications();
  const dup = file.notifications.some(
    (x) => x.user.toLowerCase() === n.user.toLowerCase() && x.commentId === n.commentId && x.kind === n.kind,
  );
  if (dup) return;
  file.notifications.push({ ...n, id: newId(), createdAt: new Date().toISOString(), read: false });
  // سقف نگه‌داری: ۵۰۰ اعلان آخر
  if (file.notifications.length > 500) {
    file.notifications = file.notifications.slice(file.notifications.length - 500);
  }
  await saveNotifications(file);
}

/** گیرندگان ادمین برای سوال جدید کاربر: ادمین سازنده + همه سوپرادمین‌ها */
async function adminRecipientsForUser(author: Account): Promise<string[]> {
  const { accounts } = await getAccounts();
  const out = new Set<string>();
  if (author.createdBy) {
    const maker = accounts.find((a) => a.username.toLowerCase() === author.createdBy!.toLowerCase());
    if (maker && maker.active) out.add(maker.username);
  }
  for (const a of accounts) {
    if ((a.role === 'admin' || a.role === 'superadmin') && a.active && a.username !== author.username) {
      // ادمین سازنده حتماً، سوپرادمین‌ها همیشه
      if (a.role === 'superadmin' || (author.createdBy && a.username.toLowerCase() === author.createdBy.toLowerCase())) {
        out.add(a.username);
      }
    }
  }
  return [...out];
}

/** کلیدهای تسک هر فاز — مبنای محاسبه درصد پیشرفت */
export const PROGRESS_TASK_KEYS: Record<string, string[]> = {
  'phase-1': [
    'p1-sec450',
    'p1-elastic-course',
    'p1-elastic-video1',
    'p1-elastic-basics',
    'p1-elastic-query',
    'p1-splunk-fund1',
    'p1-splunk-fund2-m10',
    'p1-splunk-es-videos',
    'p1-splunk-basics-room',
    'p1-splunk-investigate',
  ],
  'phase-2': [
    'p2-sec450-net',
    'p2-net-video',
    'p2-wireshark',
    'p2-nsm',
    'p2-dns',
    'p2-web',
    'p2-foundations',
  ],
  'phase-3': [
    'p3-win-sysmon',
    'p3-win-video',
    'p3-win-mon',
    'p3-linux',
    'p3-linux-mon',
    'p3-hidps-video',
  ],
  'phase-4': [],
};

function progressSummary(progress: Record<string, boolean>) {
  const perPhase: Record<string, { done: number; total: number; pct: number }> = {};
  let doneAll = 0;
  let totalAll = 0;
  for (const [phase, keys] of Object.entries(PROGRESS_TASK_KEYS)) {
    const done = keys.filter((k) => progress[k] === true).length;
    const total = keys.length;
    perPhase[phase] = { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    doneAll += done;
    totalAll += total;
  }
  return { perPhase, total: { done: doneAll, total: totalAll, pct: totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100) } };
}

async function currentAccount(ctx: ApiCtx): Promise<Account | null> {
  const username = readSession(ctx.cookies[SESSION_COOKIE]);
  if (!username) return null;
  const account = await findAccount(username);
  if (!account || !account.active) return null;
  return account;
}

export function sessionCookie(value: string): ApiResult['setCookie'] {
  return { name: SESSION_COOKIE, value, maxAge: SESSION_TTL_SEC };
}

// ---------------------------------------------------------------------------
// /api/auth — ورود، ثبت‌نام، تغییر رمز
// ---------------------------------------------------------------------------

export async function handleAuth(ctx: ApiCtx): Promise<ApiResult> {
  const action = str(ctx.body.action);

  switch (action) {
    // ---------------- ثبت‌نام ----------------
    case 'register': {
      const username = str(ctx.body.username);
      const password = str(ctx.body.password);
      const inviteCode = str(ctx.body.inviteCode);

      if (inviteCode !== INVITE_CODE) return err(403, 'کد دعوتی نامعتبر است.');
      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه لاتین، عدد، خط تیره یا زیرخط باشد.');
      if (password.length < 8) return err(400, 'رمز عبور باید حداقل ۸ نویسه باشد.');

      const file = await getAccounts();
      if (file.accounts.some((a) => a.username.toLowerCase() === username.toLowerCase()))
        return err(409, 'این نام کاربری قبلاً ثبت شده است.');

      // فقط نخستین ثبت‌نام (با کد دعوتی) سوپر ادمین می‌شود؛ پس از آن
      // حساب‌های جدید فقط از طریق پنل ادمین ساخته می‌شوند.
      const isFirst = file.accounts.length === 0;
      if (!isFirst)
        return err(403, 'ثبت‌نام عمومی بسته است؛ حساب شما باید توسط ادمین سیستم ساخته شود.');

      const account: Account = {
        username,
        passHash: hashPassword(password),
        role: isFirst ? 'superadmin' : 'user',
        createdBy: null,
        active: true,
        createdAt: new Date().toISOString(),
      };
      file.accounts.push(account);
      await saveAccounts(file);

      return {
        ...ok({
          account: publicAccount(account),
          message: isFirst
            ? 'ثبت‌نام موفق — شما سوپر ادمین سیستم هستید. خوش آمدید!'
            : 'ثبت‌نام موفق بود. خوش آمدید!',
        }),
        setCookie: sessionCookie(signSession(account.username)),
      };
    }

    // ---------------- ورود ----------------
    case 'login': {
      const username = str(ctx.body.username);
      const password = str(ctx.body.password);
      const account = await findAccount(username);
      if (!account || !verifyPassword(password, account.passHash))
        return err(401, 'نام کاربری یا رمز عبور اشتباه است.');
      if (!account.active) return err(403, 'این حساب غیرفعال شده است. با مدیر سیستم تماس بگیرید.');
      return {
        ...ok({ account: publicAccount(account) }),
        setCookie: sessionCookie(signSession(account.username)),
      };
    }

    // ---------------- خروج ----------------
    case 'logout':
      return { ...ok({ message: 'خارج شدید.' }), clearCookie: SESSION_COOKIE };

    // ---------------- کاربر جاری ----------------
    case 'me': {
      const account = await currentAccount(ctx);
      if (!account) return err(401, 'وارد نشده‌اید.');
      return ok({ account: publicAccount(account) });
    }

    // ---------------- وضعیت عمومی سیستم ----------------
    case 'status': {
      const file = await getAccounts();
      return ok({ firstRegisterOpen: file.accounts.length === 0 });
    }

    // ---------------- تغییر رمز ----------------
    case 'change-password': {
      const account = await currentAccount(ctx);
      if (!account) return err(401, 'وارد نشده‌اید.');
      const currentPassword = str(ctx.body.currentPassword);
      const newPassword = str(ctx.body.newPassword);
      if (!verifyPassword(currentPassword, account.passHash))
        return err(403, 'رمز عبور فعلی اشتباه است.');
      if (newPassword.length < 8) return err(400, 'رمز عبور جدید باید حداقل ۸ نویسه باشد.');
      const file = await getAccounts();
      const target = file.accounts.find((a) => a.username === account.username)!;
      target.passHash = hashPassword(newPassword);
      await saveAccounts(file);
      return ok({ message: 'رمز عبور با موفقیت تغییر کرد.' });
    }

    default:
      return err(400, 'action نامعتبر است.');
  }
}

// ---------------------------------------------------------------------------
// /api/data — داده کاربر، کامنت‌های فازها، مدیریت حساب‌ها
// ---------------------------------------------------------------------------

/** آیا «ادمین» روی این کامنت دید دارد؟ */
function adminCanSeeComment(c: Comment, admin: Account): boolean {
  if (admin.role === 'superadmin') return true;
  return c.targetAdmin === admin.username || c.author === admin.username;
}

/** کامنت‌های قابل مشاهده برای کاربر جاری در یک فاز */
async function visibleComments(account: Account, phase: string): Promise<Comment[]> {
  const { comments } = await getComments();
  const inPhase = comments.filter((c) => c.phase === phase);

  if (account.role === 'user') {
    // پیام‌های خود کاربر + پاسخ‌های ادمین به همان پیام‌ها
    const myRootIds = new Set(
      inPhase
        .filter((c) => c.author === account.username && c.parentId === null)
        .map((c) => c.id),
    );
    return inPhase.filter(
      (c) =>
        (c.author === account.username && c.parentId === null) ||
        (c.parentId !== null && myRootIds.has(c.parentId)),
    );
  }

  if (account.role === 'admin') {
    // کامنت‌های کاربرانی که این ادمین ساخته + پاسخ‌های خودش
    return inPhase.filter((c) => adminCanSeeComment(c, account));
  }

  // سوپر ادمین: همه
  return inPhase;
}

export async function handleData(ctx: ApiCtx): Promise<ApiResult> {
  const account = await currentAccount(ctx);
  if (!account) return err(401, 'ابتدا وارد شوید.');
  const action = str(ctx.body.action);
  const phase = str(ctx.body.phase);

  switch (action) {
    // ---------------- پیشرفت چک‌لیست راهنما ----------------
    case 'progress:get': {
      const data = await getUserData(account.username);
      return ok({ progress: data.progress });
    }

    case 'progress:set': {
      const raw = (ctx.body.progress ?? {}) as Record<string, unknown>;
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'boolean') clean[k] = v;
      await saveUserData({
        username: account.username,
        progress: clean,
        updatedAt: new Date().toISOString(),
      });
      return ok({ progress: clean });
    }

    // ---------------- کامنت‌های فاز ----------------
    case 'comments:list': {
      if (!phase) return err(400, 'شناسه فاز لازم است.');
      const list = await visibleComments(account, phase);
      return ok({ comments: list });
    }

    case 'comments:post': {
      if (!phase) return err(400, 'شناسه فاز لازم است.');
      const text = str(ctx.body.text);
      if (!text) return err(400, 'متن پیام خالی است.');
      if (text.length > 4000)
        return err(400, 'متن پیام بیش از حد طولانی است (حداکثر ۴۰۰۰ نویسه).');

      const parentId = str(ctx.body.parentId) || null;
      const file = await getComments();

      let targetAdmin: string | null = null;

      if (parentId) {
        // پاسخ به یک پیام — فقط ادمین/سوپر ادمین روی پیام‌های قابل‌مشاهده خودش
        if (account.role === 'user')
          return err(403, 'کاربر عادی اجازه پاسخ به پیام دیگران را ندارد.');
        const parent = file.comments.find((c) => c.id === parentId && c.phase === phase);
        if (!parent || !adminCanSeeComment(parent, account))
          return err(404, 'پیام اصلی پیدا نشد.');
        parent.answered = true;
        targetAdmin = parent.targetAdmin ?? null;
      } else if (account.role === 'user') {
        // پیام کاربر به ادمینِ سازنده‌ی خودش ارسال می‌شود
        if (!account.createdBy) return err(400, 'ادمین مقصد برای این حساب یافت نشد.');
        targetAdmin = account.createdBy;
      } else {
        return err(400, 'ادمین باید روی یک پیام مشخص پاسخ دهد.');
      }

      const comment: Comment = {
        id: newId(),
        phase,
        author: account.username,
        authorRole: account.role,
        targetAdmin,
        parentId,
        text,
        createdAt: new Date().toISOString(),
        answered: false,
      };
      file.comments.push(comment);
      await saveComments(file);

      // ---- اعلان هوشمند ----
      try {
        if (parentId) {
          // پاسخ ادمین به کاربر: اعلان برای نویسنده پیام اصلی
          const parent = file.comments.find((c) => c.id === parentId);
          if (parent && parent.author.toLowerCase() !== account.username.toLowerCase()) {
            await pushNotification({
              user: parent.author,
              kind: 'admin-reply',
              phase,
              commentId: comment.id,
              actor: account.username,
              text: `پاسخ جدید از مدیر در ${phaseLabel(phase)}`,
            });
          }
        } else {
          // سوال/گزارش جدید کاربر: اعلان فوری برای ادمین آنلاین (سازنده + سوپرادمین‌ها)
          const recipients = await adminRecipientsForUser(account);
          for (const r of recipients) {
            await pushNotification({
              user: r,
              kind: 'user-question',
              phase,
              commentId: comment.id,
              actor: account.username,
              text: `پیام جدید از «${account.username}» در ${phaseLabel(phase)}`,
            });
          }
        }
      } catch (e) {
        console.error('[notifications] push failed', e);
      }

      return ok({ comment });
    }

    // ---------------- مرکز اعلان‌ها ----------------
    case 'notifications:list': {
      const file = await getNotifications();
      const allMine = file.notifications
        .filter((n) => n.user.toLowerCase() === account.username.toLowerCase())
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const unread = allMine.filter((n) => !n.read).length;
      const unreadByActorPhase: Record<string, number> = {};
      for (const notification of allMine) {
        if (notification.read || notification.kind !== 'user-question') continue;
        const key = `${notification.actor.toLowerCase()}|${notification.phase}`;
        unreadByActorPhase[key] = (unreadByActorPhase[key] ?? 0) + 1;
      }
      const mine = allMine.slice(0, 50).map(publicNotification);
      return ok({ notifications: mine, unread, unreadByActorPhase });
    }

    case 'notifications:markRead': {
      const ids = Array.isArray(ctx.body.ids)
        ? (ctx.body.ids as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const markAll = ctx.body.all === true;
      const file = await getNotifications();
      let changed = 0;
      for (const n of file.notifications) {
        if (n.user.toLowerCase() !== account.username.toLowerCase()) continue;
        if (markAll || ids.includes(n.id)) {
          if (!n.read) {
            n.read = true;
            changed++;
          }
        }
      }
      if (changed > 0) await saveNotifications(file);
      return ok({ marked: changed });
    }

    // ---------------- مدیریت حساب‌ها (ادمین/سوپر ادمین) ----------------
    case 'users:list': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const file = await getAccounts();
      let list = file.accounts.map(publicAccount);
      if (account.role === 'admin')
        list = list.filter(
          (a) => a.createdBy === account.username || a.username === account.username,
        );
      return ok({ users: list });
    }

    case 'users:create': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const username = str(ctx.body.username);
      const password = str(ctx.body.password);
      const newRole = str(ctx.body.role) as Role;
      const email = str(ctx.body.email) || null;

      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه لاتین، عدد، خط تیره یا زیرخط باشد.');
      if (password.length < 8) return err(400, 'رمز عبور باید حداقل ۸ نویسه باشد.');
      if (account.role === 'admin' && newRole !== 'user')
        return err(403, 'ادمین فقط می‌تواند کاربر عادی بسازد.');
      if (!['admin', 'user'].includes(newRole)) return err(400, 'نقش نامعتبر است.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return err(400, 'ایمیل معتبر نیست.');

      const file = await getAccounts();
      if (file.accounts.some((a) => a.username.toLowerCase() === username.toLowerCase()))
        return err(409, 'این نام کاربری قبلاً ثبت شده است.');

      const created: Account = {
        username,
        passHash: hashPassword(password),
        role: newRole,
        createdBy: account.username,
        active: true,
        createdAt: new Date().toISOString(),
        email,
      };
      file.accounts.push(created);
      await saveAccounts(file);
      return ok({ account: publicAccount(created), message: `حساب «${username}» ساخته شد.` });
    }

    case 'users:setStatus': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const username = str(ctx.body.username);
      const active = ctx.body.active === true;
      const file = await getAccounts();
      const target = file.accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
      if (!target) return err(404, 'کاربر پیدا نشد.');
      if (target.role === 'superadmin' && account.role !== 'superadmin')
        return err(403, 'اجازه تغییر وضعیت سوپر ادمین را ندارید.');
      if (account.role === 'admin' && target.createdBy !== account.username)
        return err(403, 'ادمین فقط کاربران ساخته‌ی خودش را مدیریت می‌کند.');
      if (target.username === account.username)
        return err(400, 'نمی‌توانید حساب خودتان را غیرفعال کنید.');
      target.active = active;
      await saveAccounts(file);
      return ok({
        account: publicAccount(target),
        message: active ? 'حساب فعال شد.' : 'حساب غیرفعال شد.',
      });
    }

    case 'users:resetPassword': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const username = str(ctx.body.username);
      const newPassword = str(ctx.body.newPassword);
      if (newPassword.length < 8) return err(400, 'رمز عبور جدید باید حداقل ۸ نویسه باشد.');
      const file = await getAccounts();
      const target = file.accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
      if (!target) return err(404, 'کاربر پیدا نشد.');
      if (target.role === 'superadmin' && account.role !== 'superadmin')
        return err(403, 'اجازه تغییر رمز سوپر ادمین را ندارید.');
      if (account.role === 'admin' && target.createdBy !== account.username)
        return err(403, 'ادمین فقط کاربران ساخته‌ی خودش را مدیریت می‌کند.');
      target.passHash = hashPassword(newPassword);
      await saveAccounts(file);
      return ok({ message: `رمز عبور «${username}» بازنشانی شد.` });
    }

    // ---------------- پایش پیشرفت کاربران (پنل ادمین) ----------------
    case 'users:progress': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const file = await getAccounts();
      let targets = file.accounts;
      if (account.role === 'admin') {
        targets = targets.filter(
          (a) => a.role === 'user' && a.createdBy === account.username,
        );
      }
      // سوپر ادمین: همه حساب‌ها شامل ادمین‌ها هم نمایش داده می‌شوند
      const rows = [] as Array<{
        username: string;
        email: string | null;
        role: string;
        createdAt: string;
        active: boolean;
        summary: ReturnType<typeof progressSummary>;
      }>;
      for (const t of targets) {
        const data = await getUserData(t.username);
        rows.push({
          username: t.username,
          email: t.email ?? null,
          role: t.role,
          createdAt: t.createdAt,
          active: t.active,
          summary: progressSummary(data.progress ?? {}),
        });
      }
      rows.sort((a, b) => a.username.localeCompare(b.username));
      return ok({ rows });
    }

    // ---------------- جزئیات یک کاربر (Inspect) ----------------
    case 'users:inspect': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const username = str(ctx.body.username);
      const file = await getAccounts();
      const target = file.accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
      if (!target) return err(404, 'کاربر پیدا نشد.');
      if (
        account.role === 'admin' &&
        !(target.role === 'user' && target.createdBy === account.username)
      )
        return err(403, 'ادمین فقط کاربران ساخته‌ی خودش را مشاهده می‌کند.');
      const data = await getUserData(target.username);
      const { comments } = await getComments();
      let thread: Comment[] = [];
      if (target.role === 'user') {
        const roots = comments.filter(
          (c) => c.author.toLowerCase() === target.username.toLowerCase() && c.parentId === null,
        );
        const rootIds = new Set(roots.map((c) => c.id));
        thread = comments
          .filter((c) => rootIds.has(c.id) || (c.parentId !== null && rootIds.has(c.parentId)))
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      } else {
        thread = comments
          .filter((c) => c.author.toLowerCase() === target.username.toLowerCase())
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
          .slice(0, 100);
      }
      return ok({
        user: publicAccount(target),
        progress: data.progress ?? {},
        summary: progressSummary(data.progress ?? {}),
        comments: thread,
      });
    }

    default:
      return err(400, 'action نامعتبر است.');
  }
}
