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

// ---------------------------------------------------------------------------
// پیکربندی
// ---------------------------------------------------------------------------

export const INVITE_CODE = process.env.INVITE_CODE ?? 'ermanian';
const DATA_DIR = join(process.cwd(), '.data');

/** کلید رمزنگاری/امضا: از محیط یا از فایل محلی خوانده می‌شود */
function loadSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // محلی: تولید و ذخیره پایدار
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const secretFile = join(DATA_DIR, 'secret.key');
  if (existsSync(secretFile)) return readFileSync(secretFile, 'utf8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(secretFile, secret, { mode: 0o600 });
  return secret;
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

// ---------------------------------------------------------------------------
// لایه ذخیره‌سازی (Blob در پروداکشن / فایل محلی در توسعه)
// ---------------------------------------------------------------------------

let blobApi: typeof import('@vercel/blob') | null | undefined;

async function getBlob() {
  if (blobApi !== undefined) return blobApi;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      blobApi = await import('@vercel/blob');
    } catch {
      blobApi = null;
    }
  } else {
    blobApi = null;
  }
  return blobApi;
}

const blobKeys = {
  accounts: 'accounts.json.enc',
  comments: 'comments.json.enc',
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
  const blob = await getBlob();
  if (blob) {
    try {
      const meta = await blob.head(key);
      // در استورهای Private، خواندن URL نیاز به توکن دارد؛ در استور Public بی‌ضرر است
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const res = await fetch(meta.url, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return null;
      const text = await res.text();
      if (!text) return null;
      try {
        return decryptJSON<T>(text) ?? (JSON.parse(text) as T);
      } catch {
        return null;
      }
    } catch {
      return null; // پیدا نشد
    }
  }
  return readLocalJSON<T>(key);
}

/** نوشتن یک سند JSON در Blob (یا فایل محلی) */
async function writeJSON(key: string, value: unknown): Promise<void> {
  const blob = await getBlob();
  if (blob) {
    await blob.put(key, encryptJSON(value), { access: 'public', addRandomSuffix: false });
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
