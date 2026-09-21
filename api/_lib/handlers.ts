/**
 * منطق مشترک API — مستقل از فریم‌ورک
 * این توابع هم توسط Vercel Serverless Functions (api/auth.ts و api/data.ts)
 * و هم توسط سرور محلی Express (server.ts) استفاده می‌شوند.
 */
import {
  type Account,
  type AppNotification,
  type ChatMessage,
  type Comment,
  type Role,
  INVITE_CODE,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  findAccount,
  getAccounts,
  getComments,
  getChat,
  getContents,
  getNotifications,
  getUserData,
  hashPassword,
  newId,
  readSession,
  saveAccounts,
  saveComments,
  saveChat,
  saveContents,
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

/** کلیدهای منابع هر فاز — مبنای محاسبه درصد پیشرفت */
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

function progressSummary(progress: Record<string, boolean>, keysByPhase?: Record<string, string[]>) {
  const source = keysByPhase ?? PROGRESS_TASK_KEYS;
  const perPhase: Record<string, { done: number; total: number; pct: number }> = {};
  let doneAll = 0;
  let totalAll = 0;
  for (const [phase, keys] of Object.entries(source)) {
    const done = keys.filter((k) => progress[k] === true).length;
    const total = keys.length;
    perPhase[phase] = { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    doneAll += done;
    totalAll += total;
  }
  return { perPhase, total: { done: doneAll, total: totalAll, pct: totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100) } };
}

/** مالک محتوای هر حساب: کاربر → ادمین سازنده؛ ادمین/سوپرادمین → خودش */
function contentOwnerOf(account: Account): string | null {
  if (account.role === 'user') return account.createdBy ? account.createdBy.toLowerCase() : null;
  return account.username.toLowerCase();
}

/** استخراج taskKeyها از محتوای ذخیره‌شده (ساختار دیتا-محور فرانت — شامل صفحات سفارشی) */
function taskKeysFromStored(stored: unknown): Record<string, string[]> | null {
  try {
    const c = stored as {
      pages?: Record<string, { blocks?: Array<{ type?: string; rows?: Array<{ taskKeys?: unknown }> }> }>;
      pageOrder?: unknown;
    };
    if (!c || typeof c !== 'object' || !c.pages) return null;
    const ids = Array.isArray(c.pageOrder) && c.pageOrder.length > 0
      ? (c.pageOrder as unknown[]).filter((x): x is string => typeof x === 'string')
      : Object.keys(c.pages);
    const out: Record<string, string[]> = {};
    for (const pid of ids) {
      const keys: string[] = [];
      for (const b of c.pages[pid]?.blocks ?? []) {
        if (b && b.type === 'resource-table' && Array.isArray(b.rows)) {
          for (const r of b.rows ?? []) {
            const tks = (r as { taskKeys?: unknown }).taskKeys;
            if (Array.isArray(tks)) for (const k of tks) if (typeof k === 'string' && k) keys.push(k);
          }
        }
      }
      out[pid] = keys;
    }
    return out;
  } catch {
    return null;
  }
}

async function taskKeysForOwnerLower(ownerLower: string | null): Promise<Record<string, string[]>> {
  if (!ownerLower) return PROGRESS_TASK_KEYS;
  try {
    const file = await getContents();
    const entry = file.contents[ownerLower];
    if (!entry) return PROGRESS_TASK_KEYS;
    const custom = taskKeysFromStored(entry.content);
    return custom ?? PROGRESS_TASK_KEYS;
  } catch {
    return PROGRESS_TASK_KEYS;
  }
}

/** اعتبارسنجی سبک محتوای ارسالی ادمین — جلوگیری از داده خراب/خیلی بزرگ */
function validateSiteContent(raw: unknown): { ok: boolean; error?: string } {
  const DEFAULT_IDS = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix'];
  const isCustomId = (id: string) => /^custom-[a-z0-9-]{1,32}$/.test(id);
  const isPageId = (id: string) => DEFAULT_IDS.includes(id) || isCustomId(id);
  try {
    const c = raw as {
      menus?: Record<string, unknown>;
      pages?: Record<string, { headerTitle?: unknown; blocks?: unknown }>;
      pageOrder?: unknown;
    };
    if (!c || typeof c !== 'object') return { ok: false, error: 'ساختار محتوا نامعتبر است.' };
    const json = JSON.stringify(c);
    if (json.length > 220_000) return { ok: false, error: 'حجم محتوا بیش از حد مجاز است.' };
    if (!c.menus || typeof c.menus !== 'object') return { ok: false, error: 'منوها یافت نشد.' };
    if (!c.pages || typeof c.pages !== 'object') return { ok: false, error: 'صفحات یافت نشد.' };
    // pageOrder اختیاری است (سازگاری با نسخه قدیمی) ولی اگر آمد باید معتبر باشد
    let order: string[];
    if (typeof c.pageOrder === 'undefined') {
      order = DEFAULT_IDS;
    } else {
      if (!Array.isArray(c.pageOrder)) return { ok: false, error: 'ترتیب منوها نامعتبر است.' };
      order = c.pageOrder as string[];
      if (order.length === 0 || order.length > 26) return { ok: false, error: 'تعداد منوها باید بین ۱ تا ۲۶ باشد.' };
      const seen = new Set<string>();
      for (const id of order) {
        if (typeof id !== 'string' || !isPageId(id)) return { ok: false, error: `شناسه منو «${String(id)}» نامعتبر است.` };
        if (seen.has(id)) return { ok: false, error: 'منوی تکراری در ترتیب منوها وجود دارد.' };
        seen.add(id);
      }
      for (const id of DEFAULT_IDS) {
        if (!seen.has(id)) return { ok: false, error: `صفحه اصلی «${id}» نباید حذف شود.` };
      }
    }
    const customCount = order.filter((id) => isCustomId(id)).length;
    if (customCount > 20) return { ok: false, error: 'حداکثر ۲۰ منوی سفارشی می‌توانید بسازید.' };
    for (const pid of order) {
      const menu = c.menus[pid];
      if (typeof menu !== 'string' || menu.trim().length === 0 || menu.length > 80)
        return { ok: false, error: `لیبل منوی «${pid}» باید بین ۱ تا ۸۰ نویسه باشد.` };
      const page = c.pages[pid];
      if (!page || typeof page !== 'object') return { ok: false, error: `صفحه «${pid}» یافت نشد.` };
      if (typeof page.headerTitle !== 'string' || page.headerTitle.length > 120)
        return { ok: false, error: `عنوان صفحه «${pid}» نامعتبر است.` };
      if (!Array.isArray(page.blocks)) return { ok: false, error: `بلوک‌های صفحه «${pid}» نامعتبر است.` };
      if (page.blocks.length > 120) return { ok: false, error: `تعداد بلوک‌های صفحه «${pid}» بیش از حد مجاز است.` };
      for (const b of page.blocks as Array<{ type?: unknown; text?: unknown; items?: unknown; headers?: unknown; rows?: unknown; title?: unknown }>) {
        if (!b || typeof b.type !== 'string') return { ok: false, error: 'نوع بلوک نامعتبر است.' };
        if (!['section-title', 'paragraph', 'note', 'bullets', 'numbered', 'links', 'resource-table', 'simple-table'].includes(b.type))
          return { ok: false, error: `نوع بلوک «${String(b.type)}» پشتیبانی نمی‌شود.` };
        if (typeof b.title !== 'undefined' && typeof b.title !== 'string')
          return { ok: false, error: 'عنوان بلوک نامعتبر است.' };
        if (b.title && (b.title as string).length > 200) return { ok: false, error: 'عنوان بلوک خیلی طولانی است.' };
        if (b.type === 'section-title' || b.type === 'paragraph' || b.type === 'note') {
          if (typeof b.text !== 'string' || b.text.length > 6000)
            return { ok: false, error: 'متن بلوک نامعتبر یا خیلی طولانی است.' };
        }
        if (b.type === 'bullets' || b.type === 'numbered') {
          if (!Array.isArray(b.items) || b.items.length > 80) return { ok: false, error: 'آیتم‌های لیست نامعتبر است.' };
          for (const it of b.items as unknown[]) {
            if (typeof it !== 'string' || it.length > 4000) return { ok: false, error: 'متن آیتم لیست نامعتبر است.' };
          }
        }
        if (b.type === 'links') {
          if (!Array.isArray(b.items) || (b.items as unknown[]).length > 60)
            return { ok: false, error: 'لیست لینک‌ها نامعتبر است.' };
          for (const it of b.items as Array<{ label?: unknown; href?: unknown }>) {
            if (!it || typeof it.label !== 'string' || typeof it.href !== 'string')
              return { ok: false, error: 'لینک نامعتبر است.' };
            if (it.label.length > 200 || it.href.length > 600)
              return { ok: false, error: 'لینک خیلی طولانی است.' };
          }
        }
        if (b.type === 'resource-table' || b.type === 'simple-table') {
          if (!Array.isArray(b.headers) || (b.headers as unknown[]).length > 8)
            return { ok: false, error: 'سرستون‌های جدول نامعتبر است.' };
          for (const h of b.headers as unknown[]) {
            if (typeof h !== 'string' || h.length > 120) return { ok: false, error: 'سرستون جدول نامعتبر است.' };
          }
          if (!Array.isArray(b.rows) || (b.rows as unknown[]).length > 80)
            return { ok: false, error: 'ردیف‌های جدول بیش از حد مجاز است.' };
          const colCount = (b.headers as unknown[]).length;
          for (const r of b.rows as Array<{ cells?: unknown; taskKeys?: unknown }>) {
            if (!r || !Array.isArray(r.cells) || (r.cells as unknown[]).length !== colCount)
              return { ok: false, error: 'تعداد سلول‌های ردیف باید با سرستون‌ها برابر باشد.' };
            for (const cell of r.cells as unknown[]) {
              if (typeof cell !== 'string' || cell.length > 4000)
                return { ok: false, error: 'متن سلول جدول نامعتبر است.' };
            }
            if (b.type === 'resource-table') {
              if (!Array.isArray(r.taskKeys) || (r.taskKeys as unknown[]).length === 0 || (r.taskKeys as unknown[]).length > 12)
                return { ok: false, error: 'هر ردیف منابع باید حداقل یک کلید پیشرفت داشته باشد.' };
              for (const k of r.taskKeys as unknown[]) {
                if (typeof k !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(k))
                  return { ok: false, error: 'کلید پیشرفت ردیف نامعتبر است.' };
              }
            }
          }
        }
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'ساختار محتوا نامعتبر است.' };
  }
}

async function currentAccount(ctx: ApiCtx): Promise<Account | null> {
  const username = readSession(ctx.cookies[SESSION_COOKIE]);
  if (!username) return null;
  const account = await findAccount(username);
  if (!account || !account.active) return null;
  return account;
}

function chatPairKey(first: string, second: string): string {
  return [first.toLowerCase(), second.toLowerCase()].sort().join('|');
}

async function chatTargetFor(account: Account, targetUsername: string): Promise<Account | null> {
  const { accounts } = await getAccounts();
  const target = accounts.find((a) => a.username.toLowerCase() === targetUsername.toLowerCase());
  if (!target || !target.active || target.username.toLowerCase() === account.username.toLowerCase()) return null;

  if (account.role === 'superadmin') return target.role === 'user' ? target : null;
  if (account.role === 'admin') {
    return target.role === 'user' && target.createdBy?.toLowerCase() === account.username.toLowerCase()
      ? target
      : null;
  }
  return target.role === 'admin' || target.role === 'superadmin'
    ? account.createdBy?.toLowerCase() === target.username.toLowerCase()
      ? target
      : null
    : null;
}

async function chatContactsFor(account: Account) {
  const { accounts } = await getAccounts();
  let targets: Account[];
  if (account.role === 'user') {
    targets = accounts.filter(
      (a) =>
        a.active &&
        (a.role === 'admin' || a.role === 'superadmin') &&
        a.username.toLowerCase() === account.createdBy?.toLowerCase(),
    );
  } else if (account.role === 'admin') {
    targets = accounts.filter(
      (a) => a.active && a.role === 'user' && a.createdBy?.toLowerCase() === account.username.toLowerCase(),
    );
  } else {
    targets = accounts.filter((a) => a.active && a.role === 'user');
  }

  const chat = await getChat();
  return targets.map((target) => {
    const messages = chat.messages.filter((message) => chatPairKey(message.sender, message.recipient) === chatPairKey(account.username, target.username));
    const last = messages[messages.length - 1];
    return {
      ...publicAccount(target),
      unreadCount: messages.filter((message) => message.recipient.toLowerCase() === account.username.toLowerCase() && !message.read).length,
      lastMessageAt: last?.createdAt ?? null,
    };
  }).sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '') || a.username.localeCompare(b.username));
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
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه و فقط شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');
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
    // پیام‌های خود کاربر + پیام‌های مستقیمی که ادمین برای او فرستاده
    // + پاسخ‌های ادمین به هرکدام از این رشته‌ها
    const myRootIds = new Set(
      inPhase
        .filter(
          (c) =>
            c.parentId === null &&
            (c.author.toLowerCase() === account.username.toLowerCase() ||
              c.targetUser?.toLowerCase() === account.username.toLowerCase()),
        )
        .map((c) => c.id),
    );
    return inPhase.filter(
      (c) =>
        (c.parentId === null && myRootIds.has(c.id)) ||
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
      const targetUsername = str(ctx.body.targetUser);
      const file = await getComments();

      let targetAdmin: string | null = null;
      let targetUser: string | null = null;
      let parent: Comment | undefined;

      if (parentId) {
        parent = file.comments.find((c) => c.id === parentId && c.phase === phase);
        if (!parent) return err(404, 'پیام اصلی پیدا نشد.');

        if (account.role === 'user') {
          // کاربر فقط می‌تواند به پیام مستقیمی که ادمین برای خودش فرستاده
          // پاسخ بدهد؛ پاسخ در همان رشتهٔ کامنت ذخیره می‌شود.
          const isDirectMessageForUser =
            parent.parentId === null &&
            parent.authorRole !== 'user' &&
            parent.targetUser?.toLowerCase() === account.username.toLowerCase();
          if (!isDirectMessageForUser)
            return err(403, 'فقط می‌توانید به پیام مدیر برای خودتان پاسخ دهید.');
          targetAdmin = parent.targetAdmin ?? account.createdBy;
        } else {
          // پاسخ ادمین/سوپر ادمین فقط روی پیام‌های قابل‌مشاهدهٔ خودش
          if (!adminCanSeeComment(parent, account))
            return err(404, 'پیام اصلی پیدا نشد.');
          targetAdmin = parent.targetAdmin ?? null;
        }
        parent.answered = true;
      } else if (account.role === 'user') {
        // پیام کاربر به ادمینِ سازنده‌ی خودش ارسال می‌شود
        if (!account.createdBy) return err(400, 'ادمین مقصد برای این حساب یافت نشد.');
        targetAdmin = account.createdBy;
      } else {
        // ادمین می‌تواند حتی در فازی که کاربر هنوز پیامی ندارد، یک رشتهٔ جدید
        // را برای همان کاربر آغاز کند.
        if (!targetUsername) return err(400, 'کاربر مقصد پیام را انتخاب کنید.');
        const accounts = await getAccounts();
        const target = accounts.accounts.find(
          (a) => a.username.toLowerCase() === targetUsername.toLowerCase(),
        );
        if (!target || target.role !== 'user' || !target.active)
          return err(404, 'کاربر مقصد پیدا نشد.');
        if (account.role === 'admin' && target.createdBy?.toLowerCase() !== account.username.toLowerCase())
          return err(403, 'ادمین فقط می‌تواند برای کاربران خودش پیام بفرستد.');
        targetUser = target.username;
        targetAdmin = account.username;
      }

      const comment: Comment = {
        id: newId(),
        phase,
        author: account.username,
        authorRole: account.role,
        targetAdmin,
        targetUser,
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
          if (parent && parent.author.toLowerCase() !== account.username.toLowerCase()) {
            await pushNotification({
              user: parent.author,
              kind: account.role === 'user' ? 'user-question' : 'admin-reply',
              phase,
              commentId: comment.id,
              actor: account.username,
              text:
                account.role === 'user'
                  ? `پاسخ جدید از «${account.username}» در ${phaseLabel(phase)}`
                  : `پاسخ جدید از مدیر در ${phaseLabel(phase)}`,
            });
          }
        } else {
          // سوال کاربر برای ادمین‌ها، یا پیام جدید ادمین برای کاربر مقصد
          const recipients = account.role === 'user'
            ? await adminRecipientsForUser(account)
            : targetUser
              ? [targetUser]
              : [];
          for (const r of recipients) {
            await pushNotification({
              user: r,
              kind: account.role === 'user' ? 'user-question' : 'admin-reply',
              phase,
              commentId: comment.id,
              actor: account.username,
              text:
                account.role === 'user'
                  ? `پیام جدید از «${account.username}» در ${phaseLabel(phase)}`
                  : `پیام جدید از مدیر در ${phaseLabel(phase)}`,
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

    // ---------------- گفت‌وگوی مستقیم کاربر و ادمین ----------------
    case 'chat:contacts': {
      return ok({ contacts: await chatContactsFor(account) });
    }

    case 'chat:messages': {
      const targetUsername = str(ctx.body.targetUsername);
      const target = await chatTargetFor(account, targetUsername);
      if (!target) return err(403, 'این گفت‌وگو برای حساب شما مجاز نیست.');

      const file = await getChat();
      const pair = chatPairKey(account.username, target.username);
      let changed = false;
      for (const message of file.messages) {
        if (
          chatPairKey(message.sender, message.recipient) === pair &&
          message.recipient.toLowerCase() === account.username.toLowerCase() &&
          !message.read
        ) {
          message.read = true;
          changed = true;
        }
      }
      if (changed) await saveChat(file);

      const notifications = await getNotifications();
      let notificationsChanged = false;
      for (const notification of notifications.notifications) {
        if (
          notification.user.toLowerCase() === account.username.toLowerCase() &&
          notification.kind === 'chat-message' &&
          notification.actor.toLowerCase() === target.username.toLowerCase() &&
          !notification.read
        ) {
          notification.read = true;
          notificationsChanged = true;
        }
      }
      if (notificationsChanged) await saveNotifications(notifications);

      const messages = file.messages
        .filter((message) => chatPairKey(message.sender, message.recipient) === pair)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return ok({ contact: publicAccount(target), messages });
    }

    case 'chat:send': {
      const targetUsername = str(ctx.body.targetUsername);
      const text = str(ctx.body.text);
      const target = await chatTargetFor(account, targetUsername);
      if (!target) return err(403, 'این گفت‌وگو برای حساب شما مجاز نیست.');
      if (!text) return err(400, 'متن پیام نمی‌تواند خالی باشد.');
      if (text.length > 4000) return err(400, 'متن پیام نباید بیشتر از ۴۰۰۰ نویسه باشد.');

      const message: ChatMessage = {
        id: newId(),
        sender: account.username,
        senderRole: account.role,
        recipient: target.username,
        text,
        createdAt: new Date().toISOString(),
        read: false,
      };
      const file = await getChat();
      file.messages.push(message);
      if (file.messages.length > 10000) file.messages = file.messages.slice(-10000);
      await saveChat(file);

      await pushNotification({
        user: target.username,
        kind: 'chat-message',
        phase: 'chat',
        commentId: message.id,
        actor: account.username,
        text: `پیام جدید از «${account.username}»`,
      });
      return ok({ message });
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

      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه و فقط شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');
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

    case 'users:rename': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const username = str(ctx.body.username);
      const newUsername = str(ctx.body.newUsername);
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(newUsername))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه و فقط شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');

      const accountsFile = await getAccounts();
      const target = accountsFile.accounts.find(
        (a) => a.username.toLowerCase() === username.toLowerCase(),
      );
      if (!target) return err(404, 'کاربر پیدا نشد.');
      if (target.role !== 'user') return err(403, 'فقط نام کاربری کاربران عادی قابل ویرایش است.');
      if (account.role === 'admin' && target.createdBy?.toLowerCase() !== account.username.toLowerCase())
        return err(403, 'ادمین فقط می‌تواند نام کاربری کاربران خودش را تغییر دهد.');
      if (target.username.toLowerCase() === newUsername.toLowerCase())
        return ok({ account: publicAccount(target), message: 'نام کاربری تغییری نکرد.' });
      if (
        accountsFile.accounts.some(
          (a) => a.username.toLowerCase() === newUsername.toLowerCase(),
        )
      )
        return err(409, 'این نام کاربری قبلاً استفاده شده است.');

      const oldUsername = target.username;
      const oldKey = oldUsername.toLowerCase();
      const userData = await getUserData(oldUsername);
      userData.username = newUsername;
      await saveUserData(userData);

      const commentsFile = await getComments();
      for (const comment of commentsFile.comments) {
        if (comment.author.toLowerCase() === oldKey) comment.author = newUsername;
        if (comment.targetAdmin?.toLowerCase() === oldKey) comment.targetAdmin = newUsername;
        if (comment.targetUser?.toLowerCase() === oldKey) comment.targetUser = newUsername;
      }
      await saveComments(commentsFile);

      const notificationsFile = await getNotifications();
      for (const notification of notificationsFile.notifications) {
        if (notification.user.toLowerCase() === oldKey) notification.user = newUsername;
        if (notification.actor.toLowerCase() === oldKey) notification.actor = newUsername;
      }
      await saveNotifications(notificationsFile);

      const chatFile = await getChat();
      for (const message of chatFile.messages) {
        if (message.sender.toLowerCase() === oldKey) message.sender = newUsername;
        if (message.recipient.toLowerCase() === oldKey) message.recipient = newUsername;
      }
      await saveChat(chatFile);

      target.username = newUsername;
      await saveAccounts(accountsFile);
      return ok({ account: publicAccount(target), message: `نام کاربری به «${newUsername}» تغییر کرد.` });
    }

    case 'users:renameSelf': {
      // تغییر نام کاربری حساب جاری (ادمین/سوپرادمین در صفحه پروفایل)
      const newUsername = str(ctx.body.newUsername);
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(newUsername))
        return err(400, 'نام کاربری باید ۳ تا ۳۲ نویسه و فقط شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');
      const oldUsername = account.username;
      const oldKey = oldUsername.toLowerCase();
      if (newUsername.toLowerCase() === oldKey)
        return ok({ account: publicAccount(account), message: 'نام کاربری تغییری نکرد.' });

      const accountsFile = await getAccounts();
      if (accountsFile.accounts.some((a) => a.username.toLowerCase() === newUsername.toLowerCase()))
        return err(409, 'این نام کاربری قبلاً استفاده شده است.');
      const target = accountsFile.accounts.find((a) => a.username === account.username)!;

      // همه ارجاع‌ها به نام قبلی منتقل می‌شود تا مالکیت کاربران، پیام‌ها و محتوای اختصاصی حفظ شود
      for (const a of accountsFile.accounts) {
        if (a.createdBy?.toLowerCase() === oldKey) a.createdBy = newUsername;
      }
      target.username = newUsername;
      await saveAccounts(accountsFile);

      const userData = await getUserData(oldUsername);
      userData.username = newUsername;
      await saveUserData(userData);

      const commentsFile = await getComments();
      for (const comment of commentsFile.comments) {
        if (comment.author.toLowerCase() === oldKey) comment.author = newUsername;
        if (comment.targetAdmin?.toLowerCase() === oldKey) comment.targetAdmin = newUsername;
        if (comment.targetUser?.toLowerCase() === oldKey) comment.targetUser = newUsername;
      }
      await saveComments(commentsFile);

      const notificationsFile = await getNotifications();
      for (const notification of notificationsFile.notifications) {
        if (notification.user.toLowerCase() === oldKey) notification.user = newUsername;
        if (notification.actor.toLowerCase() === oldKey) notification.actor = newUsername;
      }
      await saveNotifications(notificationsFile);

      const chatFile = await getChat();
      for (const message of chatFile.messages) {
        if (message.sender.toLowerCase() === oldKey) message.sender = newUsername;
        if (message.recipient.toLowerCase() === oldKey) message.recipient = newUsername;
      }
      await saveChat(chatFile);

      const contentsFile = await getContents();
      const entry = contentsFile.contents[oldKey];
      if (entry) {
        contentsFile.contents[newUsername.toLowerCase()] = entry;
        delete contentsFile.contents[oldKey];
        await saveContents(contentsFile);
      }

      // نشست جدید برای نام جدید تا کاربر لاگین بماند
      return {
        ...ok({ account: publicAccount(target), message: `نام کاربری به «${newUsername}» تغییر کرد.` }),
        setCookie: sessionCookie(signSession(newUsername)),
      };
    }

    // ---------------- محتوای آموزشی per-admin ----------------
    case 'content:get': {
      // کاربر: محتوای ادمین سازنده خودش؛ ادمین/سوپرادمین: محتوای خودش
      const ownerLower = contentOwnerOf(account);
      if (!ownerLower) return ok({ content: null, owner: null, isCustom: false });
      const file = await getContents();
      const entry = file.contents[ownerLower];
      if (!entry) return ok({ content: null, owner: ownerLower, isCustom: false });
      return ok({ content: entry.content, owner: ownerLower, isCustom: true, updatedAt: entry.updatedAt });
    }

    case 'content:set': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const content = ctx.body.content;
      const v = validateSiteContent(content);
      if (!v.ok) return err(400, v.error ?? 'محتوای نامعتبر است.');
      const file = await getContents();
      const key = account.username.toLowerCase();
      file.contents[key] = { updatedAt: new Date().toISOString(), content: content as Record<string, unknown> };
      await saveContents(file);
      return ok({ message: 'محتوا ذخیره شد. فقط کاربران ساخته‌شده توسط شما این نسخه را می‌بینند.', updatedAt: file.contents[key].updatedAt });
    }

    case 'content:reset': {
      if (account.role === 'user') return err(403, 'دسترسی مجاز نیست.');
      const file = await getContents();
      const key = account.username.toLowerCase();
      if (file.contents[key]) {
        delete file.contents[key];
        await saveContents(file);
      }
      return ok({ message: 'محتوا به نسخه پیش‌فرض برگشت.' });
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
        const ownerLower = t.role === 'user'
          ? (t.createdBy ? t.createdBy.toLowerCase() : null)
          : t.username.toLowerCase();
        const keys = await taskKeysForOwnerLower(ownerLower);
        rows.push({
          username: t.username,
          email: t.email ?? null,
          role: t.role,
          createdAt: t.createdAt,
          active: t.active,
          summary: progressSummary(data.progress ?? {}, keys),
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
      const ownerLower = target.role === 'user'
        ? (target.createdBy ? target.createdBy.toLowerCase() : null)
        : target.username.toLowerCase();
      const keys = await taskKeysForOwnerLower(ownerLower);
      const { comments } = await getComments();
      let thread: Comment[] = [];
      if (target.role === 'user') {
        const roots = comments.filter(
          (c) =>
            c.parentId === null &&
            (c.author.toLowerCase() === target.username.toLowerCase() ||
              c.targetUser?.toLowerCase() === target.username.toLowerCase()),
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
        summary: progressSummary(data.progress ?? {}, keys),
        comments: thread,
      });
    }

    default:
      return err(400, 'action نامعتبر است.');
  }
}
