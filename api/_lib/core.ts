/**
 * هسته مشترک بک‌اند
 * — هش رمز عبور (scrypt)، توکن نشست (HMAC)، لایه ذخیره‌سازی
 *
 * ذخیره‌سازی:
 *  - روی Vercel: Vercel Blob (@vercel/blob) — فایل‌های JSON
 *      • accounts.json         → لیست کاربران
 *      • user-data/<user>.json → داده هر کاربر (پیشرفت و ...)
 *      • comments.json         → کامنت‌های فازها
 *    محتوای فایل‌ها پیش از نوشتن در Blob با AES-256-GCM رمزنگاری می‌شود تا
 *    URL عمومی Blob محتوای حساس (هش رمز) را لو ندهد.
 *  - محلی (بدون BLOB_READ_WRITE_TOKEN): فایل‌های خام در پوشه .data/
 */
import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * لایه REST مستقیم Vercel Blob با fetch بومی.
 * — دلیل: باندل ESM ساخته‌شده توسط Vercel برای ‏@vercel/blob‏ (از طریق ‏@vercel/oidc‏ → ‏jose‏)
 *   با خطای «Dynamic require of node:buffer» می‌میرد (FUNCTION_INVOCATION_FAILED).
 *   این کلاینت فقط از fetch و node:crypto استفاده می‌کند و همان پروتکل SDK را پیاده می‌کند:
 *   • نوشتن (put):      PUT https://vercel.com/api/blob/?pathname=<key>
 *                       headers: authorization Bearer توکن، x-api-version، x-api-blob-request-id،
 *                       x-vercel-blob-store-id، x-vercel-blob-access، x-add-random-suffix: 0،
 *                       x-allow-overwrite: 1
 *   • خواندن (private): GET https://<storeId>.private.blob.vercel-storage.com/<key>
 *                       با هدر authorization (همان کاری که متد get در SDK می‌کند).
 */

// ---------------------------------------------------------------------------
// پیکربندی
// ---------------------------------------------------------------------------

export const INVITE_CODE = process.env.INVITE_CODE ?? 'soc-noooob';
const DATA_DIR = join(process.cwd(), '.data');

/** کلید رمزنگاری/امضا: از محیط یا از فایل محلی خوانده می‌شود */
function loadSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // محلی: تولید و ذخیره پایدار
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const secretFile = join(DATA_DIR, 'secret.key');
    if (existsSync(secretFile)) return readFileSync(secretFile, 'utf8').trim();
    const secret = randomBytes(32).toString('hex');
    writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  } catch {
    // فایل‌سیستم فقط‌خواندنی (مثلاً Vercel بدون AUTH_SECRET):
    // کلید پایدار از توکن Blob مشتق می‌شود تا بین فراخوانی‌ها ثابت بماند.
    if (process.env.BLOB_READ_WRITE_TOKEN)
      return createHmac('sha256', 'soc-noooob-fallback-key')
        .update(process.env.BLOB_READ_WRITE_TOKEN)
        .digest('hex');
    return randomBytes(32).toString('hex');
  }
}

export const SECRET = loadSecret();
export const SESSION_COOKIE = 'erm_session';
export const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // دو هفته

// ---------------------------------------------------------------------------
// انواع
// ---------------------------------------------------------------------------

export type Role = 'superadmin' | 'admin' | 'user';

export interface Account {
  username: string;
  passHash: string; // scrypt: salt:hash (hex)
  role: Role;
  /** نام کاربری ادمینی که این حساب را ساخته (برای مسیریابی کامنت‌ها) */
  createdBy: string | null;
  active: boolean;
  createdAt: string;
  /** ایمیل (اختیاری — در پنل ادمین نمایش داده می‌شود) */
  email?: string | null;
}

export interface AccountsFile {
  accounts: Account[];
}

export interface UserData {
  username: string;
  /** وضعیت چک‌باکس‌های راهنما: key → true */
  progress: Record<string, boolean>;
  updatedAt: string;
}

export interface Comment {
  id: string;
  /** شناسه فاز، مثلاً 'phase-1' */
  phase: string;
  /** نویسنده پیام */
  author: string;
  authorRole: Role;
  /** ادمین مقصد (ادمین سازنده‌ی کاربر) — برای کاربر مقدار دارد */
  targetAdmin: string | null;
  parentId: string | null;
  text: string;
  createdAt: string;
  answered: boolean;
}

export interface CommentsFile {
  comments: Comment[];
}

/** اعلان هوشمند (مرکز اعلان‌ها) */
export interface AppNotification {
  id: string;
  /** نام کاربری گیرنده اعلان */
  user: string;
  kind: 'user-question' | 'admin-reply';
  /** فازی که رویداد در آن رخ داده (phase-1..phase-4) */
  phase: string;
  /** شناسه کامنت مرتبط (برای deep-link و highlight) */
  commentId: string;
  /** نام بازیگر مقابل (کاربر سوال‌کننده / ادمین پاسخ‌دهنده) */
  actor: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsFile {
  notifications: AppNotification[];
}

// ---------------------------------------------------------------------------
// لایه ذخیره‌سازی (Blob در پروداکشن / فایل محلی در توسعه)
// ---------------------------------------------------------------------------

const blobToken = (): string | null => {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  return t && t.trim() !== '' ? t.trim() : null;
};

/** storeId از انتهای توکن read_write (همان parseStoreIdFromReadWriteToken در SDK) */
function storeIdFromToken(token: string): string {
  const parts = token.split('_');
  const id = parts[3] ?? '';
  return id.startsWith('store_') ? id.slice('store_'.length) : id;
}

const BLOB_API_BASE =
  process.env.VERCEL_BLOB_API_URL?.trim() || 'https://vercel.com/api/blob';
const BLOB_API_VERSION =
  process.env.VERCEL_BLOB_API_VERSION_OVERRIDE?.trim() || '12';

/** نوشتن مستقیم در Blob — معادل put(key, body, {access:'private', addRandomSuffix:false}) */
async function blobPut(key: string, body: string): Promise<void> {
  const token = blobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  const storeId = storeIdFromToken(token);
  const url = `${BLOB_API_BASE}/?${new URLSearchParams({ pathname: key }).toString()}`;
  const res = await fetch(url, {
    method: 'PUT',
    body,
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': BLOB_API_VERSION,
      'x-api-blob-request-id': `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      'x-vercel-blob-store-id': storeId,
      'x-vercel-blob-access': 'private',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '1',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`blob put failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

/** خواندن مستقیم از Blob خصوصی — معادل get(key, {access:'private'}) */
async function blobGet(key: string): Promise<string | null> {
  const token = blobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  const storeId = storeIdFromToken(token);
  const url = `https://${storeId}.private.blob.vercel-storage.com/${key}?cache=0`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`blob get failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.text();
}

const blobApi = !!blobToken();

const blobKeys = {
  accounts: 'accounts.json.enc',
  comments: 'comments.json.enc',
  notifications: 'notifications.json.enc',
  userData: (u: string) => `user-data/${encodeURIComponent(u)}.json.enc`,
};

function encryptJSON(value: unknown): string {
  const iv = randomBytes(12);
  const key = createHash('sha256').update(SECRET).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    d: enc.toString('base64'),
  });
}

function decryptJSON<T>(raw: string): T | null {
  try {
    const box = JSON.parse(raw) as { iv: string; tag: string; d: string };
    const key = createHash('sha256').update(SECRET).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(box.tag, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(box.d, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(dec.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function readLocalJSON<T>(file: string): T | null {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeLocalJSON(file: string, value: unknown): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const sub = file.includes('/') ? join(DATA_DIR, file.slice(0, file.lastIndexOf('/'))) : DATA_DIR;
  if (sub !== DATA_DIR && !existsSync(sub)) mkdirSync(sub, { recursive: true });
  writeFileSync(join(DATA_DIR, file), JSON.stringify(value, null, 2), 'utf8');
}

/** خواندن یک سند JSON از Blob (یا فایل محلی) — null اگر وجود نداشته باشد */
async function readJSON<T>(key: string): Promise<T | null> {
  if (blobApi) {
    const text = await blobGet(key);
    if (text == null || text === '') return null; // هنوز ساخته نشده
    try {
      return decryptJSON<T>(text) ?? (JSON.parse(text) as T);
    } catch {
      return null;
    }
  }
  return readLocalJSON<T>(key);
}

/** نوشتن یک سند JSON در Blob (یا فایل محلی) */
async function writeJSON(key: string, value: unknown): Promise<void> {
  if (blobApi) {
    await blobPut(key, encryptJSON(value));
    return;
  }
  writeLocalJSON(key, value);
}

// ---------------------------------------------------------------------------
// عملیات حساب‌ها
// ---------------------------------------------------------------------------

export async function getAccounts(): Promise<AccountsFile> {
  const data = await readJSON<AccountsFile>(blobKeys.accounts);
  return data ?? { accounts: [] };
}

export async function saveAccounts(file: AccountsFile): Promise<void> {
  await writeJSON(blobKeys.accounts, file);
}

export async function findAccount(username: string): Promise<Account | null> {
  const { accounts } = await getAccounts();
  return accounts.find((a) => a.username.toLowerCase() === username.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// داده کاربر و کامنت‌ها
// ---------------------------------------------------------------------------

export async function getUserData(username: string): Promise<UserData> {
  const data = await readJSON<UserData>(blobKeys.userData(username));
  return data ?? { username, progress: {}, updatedAt: new Date().toISOString() };
}

export async function saveUserData(data: UserData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await writeJSON(blobKeys.userData(data.username), data);
}

export async function getComments(): Promise<CommentsFile> {
  const data = await readJSON<CommentsFile>(blobKeys.comments);
  return data ?? { comments: [] };
}

export async function saveComments(file: CommentsFile): Promise<void> {
  await writeJSON(blobKeys.comments, file);
}

export async function getNotifications(): Promise<NotificationsFile> {
  const data = await readJSON<NotificationsFile>(blobKeys.notifications);
  return data ?? { notifications: [] };
}

export async function saveNotifications(file: NotificationsFile): Promise<void> {
  await writeJSON(blobKeys.notifications, file);
}

export function newId(): string {
  return randomBytes(8).toString('hex');
}


export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function signSession(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC }),
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u: string;
      exp: number;
    };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.u;
  } catch {
    return null;
  }
}
