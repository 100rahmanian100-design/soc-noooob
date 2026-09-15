/** کلاینت API — همه‌ی درخواست‌ها POST با JSON به /api/* */

async function call<T = Record<string, unknown>>(
  endpoint: 'auth' | 'data',
  payload: Record<string, unknown>,
): Promise<T & { error?: string }> {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && !data.error) data.error = 'خطای غیرمنتظره در ارتباط با سرور.';
  return data;
}

// ---------------------------------------------------------------- auth

export interface StatusInfo {
  firstRegisterOpen: boolean;
}

export const apiStatus = () => call<StatusInfo>('auth', { action: 'status' });

export interface AccountInfo {
  account: import('./types').PublicAccount;
  message?: string;
}

export const apiRegister = (username: string, password: string, inviteCode: string) =>
  call<AccountInfo>('auth', { action: 'register', username, password, inviteCode });

export const apiLogin = (username: string, password: string) =>
  call<AccountInfo>('auth', { action: 'login', username, password });

export const apiLogout = () => call('auth', { action: 'logout' });

export const apiMe = () => call<AccountInfo>('auth', { action: 'me' });

export const apiChangePassword = (currentPassword: string, newPassword: string) =>
  call('auth', { action: 'change-password', currentPassword, newPassword });

// ---------------------------------------------------------------- data

export const apiGetProgress = () =>
  call<{ progress: Record<string, boolean> }>('data', { action: 'progress:get' });

export const apiSetProgress = (progress: Record<string, boolean>) =>
  call<{ progress: Record<string, boolean> }>('data', { action: 'progress:set', progress });

export const apiListComments = (phase: string) =>
  call<{ comments: import('./types').CommentItem[] }>('data', { action: 'comments:list', phase });

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
  call<{ users: import('./types').PublicAccount[] }>('data', { action: 'users:list' });

export const apiCreateUser = (username: string, password: string, role: 'admin' | 'user', email = '') =>
  call<AccountInfo>('data', { action: 'users:create', username, password, role, email });

export const apiSetUserStatus = (username: string, active: boolean) =>
  call<AccountInfo>('data', { action: 'users:setStatus', username, active });

export const apiResetPassword = (username: string, newPassword: string) =>
  call('data', { action: 'users:resetPassword', username, newPassword });

export const apiUsersProgress = () =>
  call<{ rows: import('./types').UserProgressRow[] }>('data', { action: 'users:progress' });

export const apiInspectUser = (username: string) =>
  call<import('./types').UserInspect>('data', { action: 'users:inspect', username });

export const apiListNotifications = () =>
  call<{
    notifications: import('./types').AppNotification[];
    unread: number;
    unreadByActorPhase: Record<string, number>;
  }>('data', {
    action: 'notifications:list',
  });

export const apiMarkNotifications = (ids: string[] = [], all = false) =>
  call<{ marked: number }>('data', { action: 'notifications:markRead', ids, all });

export const apiChatContacts = () =>
  call<{ contacts: import('./types').ChatContact[] }>('data', { action: 'chat:contacts' });

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
