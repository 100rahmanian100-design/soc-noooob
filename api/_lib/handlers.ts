/**
 * منطق مشترک API — مستقل از فریم‌ورک
 * این توابع هم توسط Vercel Serverless Functions (api/auth.ts و api/data.ts)
 * و هم توسط سرور محلی Express (server.ts) استفاده می‌شوند.
 */
import {
  type Account,
  type Comment,
  type Role,
  INVITE_CODE,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  findAccount,
  getAccounts,
  getComments,
  getUserData,
  hashPassword,
  newId,
  readSession,
  saveAccounts,
  saveComments,
  saveUserData,
  signSession,
  verifyPassword,
} from './core';

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
    role: a.role,
    createdBy: a.createdBy,
    active: a.active,
    createdAt: a.createdAt,
  };
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
      return ok({ comment });
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

      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه لاتین، عدد، خط تیره یا زیرخط باشد.');
      if (password.length < 8) return err(400, 'رمز عبور باید حداقل ۸ نویسه باشد.');
      if (account.role === 'admin' && newRole !== 'user')
        return err(403, 'ادمین فقط می‌تواند کاربر عادی بسازد.');
      if (!['admin', 'user'].includes(newRole)) return err(400, 'نقش نامعتبر است.');

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

    default:
      return err(400, 'action نامعتبر است.');
  }
}

