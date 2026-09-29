/** کلاینت API — همه‌ی درخواست‌ها POST با JSON به /api/* */

// ---------------------------------------------------------------------------
// کاهش تعداد درخواست‌ها به سرور (سقف محدود عملیات Blob)
//
// ۱) ادغام درخواست‌های هم‌زمانِ یکسان (single-flight): چند کامپوننت که در یک
//    لحظه داده‌ی یکسانی می‌خواهند، فقط یک درخواست واقعی می‌فرستند.
// ۲) کش کوتاه‌مدت برای درخواست‌های فقط‌خواندنی: تکرارهای نزدیک به هم
//    (مثلاً چند کامپوننت که content:get را در mount صدا می‌زنند) از کش
//    سرو می‌شوند. هر درخواست نوشتنی کل کش را باطل می‌کند.
// ---------------------------------------------------------------------------

/** TTL کش سمت کلاینت (میلی‌ثانیه) — فقط برای درخواست‌های فقط‌خواندنی */
const CLIENT_CACHE_TTL = 4_000;

const inflight = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { at: number; data: unknown }>();

/** ساخت کلید یکتا برای هر ترکیب endpoint+payload */
function cacheKey(endpoint: string, payload: Record<string, unknown>): string {
  return `${endpoint}:${JSON.stringify(payload)}`;
}

async function call<T = Record<string, unknown>>(
  endpoint: 'auth' | 'data',
  payload: Record<string, unknown>,
  /** درخواست‌های فقط‌خواندنی از کش کوتاه‌مدت سرو می‌شوند */
  cacheable = false,
): Promise<T & { error?: string }> {
  const key = cacheKey(endpoint, payload);

  if (cacheable) {
    const hit = responseCache.get(key);
    if (hit && Date.now() - hit.at < CLIENT_CACHE_TTL) return hit.data as T & { error?: string };
    // درخواست هم‌زمانِ یکسان: منتظر همان درخواستِ در جریان می‌مانیم
    const running = inflight.get(key);
    if (running) return running as Promise<T & { error?: string }>;
  }

  const request = (async () => {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok && !data.error) data.error = 'خطای غیرمنتظره در ارتباط با سرور.';
      if (cacheable && !data.error) responseCache.set(key, { at: Date.now(), data });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  if (cacheable) inflight.set(key, request);
  // هر نوشتنی کشِ خواندنی‌ها را باطل می‌کند تا داده‌ی کهنه سرو نشود
  else responseCache.clear();
  return request;
}

// ---------------------------------------------------------------- auth

export interface StatusInfo {
  firstRegisterOpen: boolean;
}

export const apiStatus = () => call<StatusInfo>('auth', { action: 'status' }, true);

export interface AccountInfo {
  account: import('./types').PublicAccount;
  message?: string;
}

export const apiRegister = (username: string, password: string, inviteCode: string) =>
  call<AccountInfo>('auth', { action: 'register', username, password, inviteCode });

export const apiLogin = (username: string, password: string) =>
  call<AccountInfo>('auth', { action: 'login', username, password });

export const apiLogout = () => call('auth', { action: 'logout' });

export const apiMe = () => call<AccountInfo>('auth', { action: 'me' }, true);

export const apiChangePassword = (currentPassword: string, newPassword: string) =>
  call('auth', { action: 'change-password', currentPassword, newPassword });

// ---------------------------------------------------------------- data

export const apiGetProgress = () =>
  call<{ progress: Record<string, boolean> }>('data', { action: 'progress:get' }, true);

export const apiSetProgress = (progress: Record<string, boolean>) =>
  call<{ progress: Record<string, boolean> }>('data', { action: 'progress:set', progress });

export const apiListComments = (phase: string) =>
  call<{ comments: import('./types').CommentItem[] }>('data', { action: 'comments:list', phase }, true);

export const apiPostComment = (
  phase: string,
  text: string,
  parentId: string | null = null,
  targetUser?: string | null,
) =>
  call<{ comment: import('./types').CommentItem }>('data', {
    action: 'comments:post',
    phase,
    text,
    parentId,
    targetUser,
  });

export const apiListUsers = () =>
  call<{ users: import('./types').PublicAccount[] }>('data', { action: 'users:list' }, true);

export const apiCreateUser = (username: string, password: string, role: 'admin' | 'user', email = '') =>
  call<AccountInfo>('data', { action: 'users:create', username, password, role, email });

export const apiSetUserStatus = (username: string, active: boolean) =>
  call<AccountInfo>('data', { action: 'users:setStatus', username, active });

export const apiResetPassword = (username: string, newPassword: string) =>
  call('data', { action: 'users:resetPassword', username, newPassword });

export const apiRenameUser = (username: string, newUsername: string) =>
  call<AccountInfo>('data', { action: 'users:rename', username, newUsername });

export const apiRenameSelf = (newUsername: string) =>
  call<AccountInfo>('data', { action: 'users:renameSelf', newUsername });

export const apiUsersProgress = () =>
  call<{ rows: import('./types').UserProgressRow[] }>('data', { action: 'users:progress' }, true);

export const apiInspectUser = (username: string) =>
  call<import('./types').UserInspect>('data', { action: 'users:inspect', username }, true);

export const apiListNotifications = () =>
  call<{
    notifications: import('./types').AppNotification[];
    unread: number;
    unreadByActorPhase: Record<string, number>;
  }>('data', {
    action: 'notifications:list',
  }, true);

export const apiMarkNotifications = (ids: string[] = [], all = false) =>
  call<{ marked: number }>('data', { action: 'notifications:markRead', ids, all });

export const apiChatContacts = () =>
  call<{ contacts: import('./types').ChatContact[] }>('data', { action: 'chat:contacts' }, true);

export const apiChatMessages = (targetUsername: string) =>
  call<{ contact: import('./types').PublicAccount; messages: import('./types').ChatMessage[] }>('data', {
    action: 'chat:messages',
    targetUsername,
  });

export const apiChatSend = (targetUsername: string, text: string) =>
  call<{ message: import('./types').ChatMessage }>('data', {
    action: 'chat:send',
    targetUsername,
    text,
  });

// ---------------------------------------------------------------- content (per-admin)

export const apiGetContent = () =>
  call<{
    content: import('./contentTypes').SiteContent | null;
    owner: string | null;
    isCustom: boolean;
    updatedAt?: string;
  }>('data', { action: 'content:get' }, true);

export const apiSetContent = (content: import('./contentTypes').SiteContent) =>
  call<{ message?: string; updatedAt?: string }>('data', { action: 'content:set', content });

export const apiResetContent = () =>
  call<{ message?: string }>('data', { action: 'content:reset' });
