import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiCreateUser,
  apiInspectUser,
  apiListComments,
  apiListNotifications,
  apiPostComment,
  apiResetPassword,
  apiSetUserStatus,
  apiUsersProgress,
} from '../api';
import type { CommentItem, PublicAccount, UserInspect, UserProgressRow } from '../types';
import { ROLE_LABEL, TASK_KEYS, type Role } from '../types';

interface Props {
  account: PublicAccount;
}

const ALL_PHASES = [
  ['phase-1', 'فاز ۱ — SIEM'],
  ['phase-2', 'فاز ۲ — شبکه'],
  ['phase-3', 'فاز ۳ — Endpoint'],
  ['phase-4', 'فاز ۴ — Onboarding'],
] as const;

const PHASE_FA = ['فاز ۱', 'فاز ۲', 'فاز ۳', 'فاز ۴'] as const;

const TASK_LABELS: Record<string, string> = {
  'p1-sec450': 'مطالعه مبانی تیم آبی و SOC (SEC450)',
  'p1-elastic-course': 'گذراندن دوره رایگان Elastic',
  'p1-elastic-video1': 'ویدئوی ۱ ماژول Elastic (Log Semantics)',
  'p1-elastic-basics': 'تمرین Elastic Stack: The Basics',
  'p1-elastic-query': 'تمرین Elastic: Query Languages',
  'p1-splunk-fund1': 'دوره Splunk Fundamentals 1',
  'p1-splunk-fund2-m10': 'ماژول ۱۰ Splunk Fundamentals 2',
  'p1-splunk-es-videos': 'ویدئوهای ۱ و ۲ آموزش Splunk ES',
  'p1-splunk-basics-room': 'تمرین Splunk Basics - Did you SIEM?',
  'p1-splunk-investigate': 'تمرین Investigating with Splunk',
  'p1-lab-access': 'اتصال به ماشین‌های آزمایشگاه MSSP',
  'p1-real-project': 'تمرین روی پروژه واقعی Elastic/Splunk',
  'p1-review': 'جلسه ارزیابی پایان فاز ۱',
  'p2-sec450-net': 'مطالعه تهدیدات شبکه (SEC450)',
  'p2-net-video': 'ویدئوی تشخیص تهدیدات شبکه',
  'p2-wireshark': 'روم Wireshark: Traffic Analysis',
  'p2-nsm': 'ماژول Network Security Monitoring',
  'p2-dns': 'تهدیدات DNS و ویدئوی DNS',
  'p2-web': 'تهدیدات Web و ویدئوی Web',
  'p2-foundations': 'مسیر Soc T1 D – Foundations',
  'p2-reports': 'گزارش موارد مشکوک به لایه ۳',
  'p2-review': 'جلسه ارزیابی پایان فاز ۲',
  'p3-win-sysmon': 'تهدیدات ویندوز و مستند Sysmon',
  'p3-win-video': 'ویدئوی ویندوز (Log Semantics)',
  'p3-win-mon': 'ماژول Windows Security Monitoring',
  'p3-linux': 'تهدیدات لینوکس و ویدئوی لینوکس',
  'p3-linux-mon': 'ماژول Linux Security Monitoring',
  'p3-hidps-video': 'ویدئوی بررسی هشدارهای HIDPS',
  'p3-scenarios': 'سناریوهای عملی لایه ۳',
  'p3-review': 'جلسه ارزیابی پایان فاز ۳',
  'p4-training': 'آموزش روندهای رصد پروژه‌های رینگ',
  'p4-access': 'دریافت دسترسی پروژه‌های رینگ',
  'p4-shift': 'OKR 1 — رصد یک شیفت اداری',
  'p4-sec-event': 'OKR 2 — تیکت Security Event',
  'p4-fine-tuning': 'OKR 3 — تیکت Fine Tuning',
  'p4-ai': 'OKR 4 — تیکت AI ← Investigate',
};

const roleBadge = (role: Role) =>
  role === 'superadmin'
    ? 'border-accent/50 bg-accent/10 text-accent'
    : role === 'admin'
      ? 'border-amber/50 bg-amber/10 text-amber'
      : 'border-line bg-raised text-muted';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function MiniBar({ pct, small = false }: { pct: number; small?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`progress-track ${small ? 'h-1.5 w-12' : 'w-16'}`}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-bold ${small ? 'text-[10px]' : 'text-[11px]'} ${pct === 100 ? 'text-ok' : 'text-accent'}`}>
        {pct}٪
      </span>
    </div>
  );
}

export default function AdminPage({ account }: Props) {
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-bold tracking-widest text-accent">ADMIN MONITORING</p>
        <h1 className="mt-1 text-2xl font-extrabold">پنل مدیریت و پایش پیشرفت</h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          {account.role === 'superadmin'
            ? 'به‌عنوان سوپر ادمین می‌توانید همه کاربران را ببینید، ادمین و کاربر بسازید و به همه گفت‌وگوها پاسخ دهید.'
            : 'به‌عنوان ادمین می‌توانید کاربران ساخته‌ی خودتان را ببینید، کاربر عادی بسازید و به پیام‌های آنها پاسخ دهید.'}
        </p>
      </header>
      <CreateUserForm account={account} />
      <UsersProgressTable account={account} />
      <CommentInbox account={account} />
    </div>
  );
}

/* ------------------------------------------------ ساخت حساب */
function CreateUserForm({ account }: { account: PublicAccount }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canCreateAdmin = account.role === 'superadmin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await apiCreateUser(username.trim(), password, role, email.trim());
      if (res.error) setError(res.error);
      else {
        setMessage(res.message ?? 'حساب ساخته شد.');
        setUsername('');
        setEmail('');
        setPassword('');
        window.dispatchEvent(new Event('users-changed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        ساخت حساب جدید
      </h2>
      {message && <p className="mb-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">{message}</p>}
      {error && <p className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {canCreateAdmin && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">نقش</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
            >
              <option value="user">کاربر</option>
              <option value="admin">ادمین</option>
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">نام کاربری</span>
          <input
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">ایمیل</span>
          <input
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">رمز عبور</span>
          <input
            dir="ltr"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border-0 bg-accent py-2.5 font-bold text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'در حال ساخت…' : 'ساخت حساب'}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------------------------ جدول پایش پیشرفت کاربران */
function UsersProgressTable({ account }: { account: PublicAccount }) {
  const [rows, setRows] = useState<UserProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectUser, setInspectUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiUsersProgress();
      setRows(res.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('users-changed', refresh);
    return () => window.removeEventListener('users-changed', refresh);
  }, [load]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        پایش پیشرفت کاربران
      </h2>
      <p className="mb-4 text-xs text-muted">
        درصد پیشرفت هر کاربر در فازهای ۱ تا ۴ به‌صورت زنده از چک‌لیست‌های ثبت‌شده محاسبه می‌شود.
      </p>

      {inspectUser && (
        <InspectModal username={inspectUser} onClose={() => setInspectUser(null)} />
      )}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">هنوز کاربری برای پایش وجود ندارد.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-raised">
                <th className="px-3 py-2.5 text-start text-xs font-bold text-muted">کاربر</th>
                <th className="px-3 py-2.5 text-start text-xs font-bold text-muted">ایمیل</th>
                <th className="px-3 py-2.5 text-start text-xs font-bold text-muted">تاریخ عضویت</th>
                {PHASE_FA.map((p) => (
                  <th key={p} className="px-3 py-2.5 text-center text-xs font-bold text-muted">
                    {p}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-bold text-muted">کل دوره</th>
                <th className="px-3 py-2.5 text-start text-xs font-bold text-muted">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const per = ALL_PHASES.map(([id]) => r.summary.perPhase[id]?.pct ?? 0);
                return (
                  <tr key={r.username} className="border-t border-line align-middle">
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold" dir="ltr">
                          {r.username}
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(r.role)}`}>
                          {ROLE_LABEL[r.role] ?? 'کاربر'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs" dir="ltr">
                      {r.email || <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                    {per.map((p, i) => (
                      <td key={i} className="px-3 py-3 text-center">
                        <MiniBar pct={p} small />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-sm font-extrabold ${r.summary.total.pct === 100 ? 'text-ok' : 'text-accent'}`}
                        >
                          {r.summary.total.pct}٪
                        </span>
                        <span className="text-[10px] text-muted">
                          {r.summary.total.done}/{r.summary.total.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <UserActions account={account} row={r} onInspect={() => setInspectUser(r.username)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* عملیات هر کاربر: مشاهده وضعیت + مدیریت */
function UserActions({ account, row, onInspect }: { account: PublicAccount; row: UserProgressRow; onInspect: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const setStatus = async (active: boolean) => {
    setBusy(true);
    setNote('');
    const res = await apiSetUserStatus(row.username, active);
    if (res.error) setNote(res.error);
    else {
      setNote(res.message ?? '');
      window.dispatchEvent(new Event('users-changed'));
    }
    setBusy(false);
  };

  const resetPass = async () => {
    const next = window.prompt(`رمز جدید برای «${row.username}» (حداقل ۸ نویسه):`);
    if (!next) return;
    setNote('');
    const res = await apiResetPassword(row.username, next);
    setNote(String(res.error ?? res.message ?? ''));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={onInspect}
        className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-ink"
      >
        مشاهده وضعیت کاربر
      </button>
      {account.role !== 'user' && (
        <>
          <button
            disabled={busy}
            onClick={() => void setStatus(!row.active)}
            className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:bg-raised"
          >
            {row.active ? 'غیرفعال' : 'فعال'}
          </button>
          <button
            disabled={busy}
            onClick={() => void resetPass()}
            className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:bg-raised"
          >
            تغییر رمز
          </button>
        </>
      )}
      {note && <span className="block w-full text-[10px] text-muted">{note}</span>}
    </div>
  );
}

/* ------------------------------------------------ مودال مشاهده وضعیت کاربر (Inspect) */
function InspectModal({ username, onClose }: { username: string; onClose: () => void }) {
  const [data, setData] = useState<UserInspect | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiInspectUser(username)
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError('خطا در دریافت اطلاعات کاربر.'));
  }, [username]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <span className="inline-block h-5 w-1.5 rounded bg-accent" />
            وضعیت کاربر <code dir="ltr">{username}</code>
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-raised"
          >
            ✕
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!error && !data && <p className="mt-6 text-sm text-muted">در حال بارگذاری…</p>}

        {data && (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-line bg-raised px-2 py-1 text-muted">
                عضو: {fmtDate(data.user.createdAt)}
              </span>
              <span className="rounded-md border border-line bg-raised px-2 py-1 text-muted">
                نقش: {ROLE_LABEL[data.user.role]}
              </span>
              {data.user.email && (
                <span className="rounded-md border border-line bg-raised px-2 py-1 text-muted" dir="ltr">
                  {data.user.email}
                </span>
              )}
            </div>

            {/* پیشرفت کل */}
            <div className="rounded-xl border border-line bg-bg p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">پیشرفت کل</span>
                <span className="text-sm font-extrabold text-accent">{data.summary.total.pct}٪</span>
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${data.summary.total.pct}%` }} />
              </div>
            </div>

            {/* تفکیک فازها */}
            <div className="grid gap-3 sm:grid-cols-2">
              {ALL_PHASES.map(([id, label], i) => {
                const s = data.summary.perPhase[id] ?? { done: 0, total: 0, pct: 0 };
                return (
                  <div key={id} className="rounded-xl border border-line bg-bg p-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold">{PHASE_FA[i]} · {label.replace('فاز ', '')}</span>
                      <span className="font-bold text-accent">{s.pct}٪</span>
                    </div>
                    <div className="progress-track mt-2 h-2">
                      <div className="progress-fill" style={{ width: `${s.pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {s.done}/{s.total} تسک تیک خورده
                    </p>
                  </div>
                );
              })}
            </div>

            {/* چک‌باکس‌های تیک‌خورده */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-muted">وضعیت تسک‌ها و چک‌باکس‌ها</h4>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-bg p-3">
                {ALL_PHASES.flatMap(([id]) => (TASK_KEYS[id] ?? []).map((k) => ({ id, k }))).map(({ id, k }) => {
                  const done = data.progress[k] === true;
                  return (
                    <div key={k} className="flex items-center gap-2 text-xs leading-6">
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${
                          done ? 'border-accent bg-accent text-ink' : 'border-line bg-raised text-muted'
                        }`}
                      >
                        {done ? '✓' : ''}
                      </span>
                      <span className={done ? 'text-text' : 'text-muted'}>
                        <span className="ms-1 rounded bg-raised px-1 py-0.5 text-[9px] font-bold text-muted">
                          {PHASE_FA[ALL_PHASES.findIndex(([p]) => p === id)]!}
                        </span>
                        {TASK_LABELS[k] ?? k}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* پیام‌ها و گزارش‌ها */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-muted">پیام‌ها و گزارش‌های ارسالی کاربر</h4>
              {data.comments.length === 0 ? (
                <p className="rounded-xl border border-line bg-bg px-3 py-3 text-xs text-muted">
                  هنوز هیچ پیام یا گزارشی ثبت نشده است.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line bg-bg p-3">
                  {data.comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-line bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
                        <span className="font-bold text-text" dir="ltr">
                          {c.author}
                        </span>
                        <span className="rounded bg-raised px-1.5 py-0.5 font-bold">
                          {ALL_PHASES.find(([p]) => p === c.phase)?.[1] ?? c.phase}
                        </span>
                        <span>{c.parentId ? '↩ پاسخ' : c.answered ? '✓ پاسخ داده شد' : c.authorRole === 'user' ? 'در انتظار پاسخ' : 'پیام ادمین'}</span>
                        <span className="ms-auto">{fmtDate(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-muted">{c.text}</p>
                    </div>
                  ))}
                  <div className="pt-1 text-center text-[10px] text-muted">
                        نمایش {data.comments.length} پیام از فازهای مختلف
                      </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
  );
}

/* ------------------------------------------------ صندوق پیام‌ها و پاسخ‌ها (کاربر-محور) */
function CommentInbox({ account }: { account: PublicAccount }) {
  const [users, setUsers] = useState<UserProgressRow[]>([]);
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Record<string, CommentItem[]>>>({});
  const [unreadByPhase, setUnreadByPhase] = useState<Record<string, number>>({});
  const [unreadCommentIds, setUnreadCommentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [phaseComments, setPhaseComments] = useState<CommentItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const userKey = (username: string) => username.toLowerCase();
  const phaseUserKey = (username: string, phase: string) => `${userKey(username)}|${phase}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, notificationsRes, ...phaseResponses] = await Promise.all([
        apiUsersProgress(),
        apiListNotifications(),
        ...ALL_PHASES.map(([id]) => apiListComments(id)),
      ]);

      setUsers(usersRes.rows ?? []);

      const grouped: Record<string, Record<string, CommentItem[]>> = {};
      ALL_PHASES.forEach(([phase], index) => {
        for (const comment of phaseResponses[index]?.comments ?? []) {
          if (comment.parentId !== null || comment.authorRole !== 'user') continue;
          const author = userKey(comment.author);
          (grouped[author] ??= {})[phase] ??= [];
          grouped[author][phase].push(comment);
        }
      });
      setMessagesByUser(grouped);

      const nextUnread: Record<string, number> = {
        ...(notificationsRes.unreadByActorPhase ?? {}),
      };
      const nextUnreadIds = new Set<string>();
      for (const notification of notificationsRes.notifications ?? []) {
        if (notification.kind !== 'user-question' || notification.read) continue;
        nextUnreadIds.add(notification.commentId);
      }
      setUnreadByPhase(nextUnread);
      setUnreadCommentIds(nextUnreadIds);
    } catch {
      setError('خطا در دریافت اطلاعات صندوق پیام‌ها.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('users-changed', refresh);
    window.addEventListener('notifications-updated', refresh);
    return () => {
      window.removeEventListener('users-changed', refresh);
      window.removeEventListener('notifications-updated', refresh);
    };
  }, [load]);

  useEffect(() => {
    setPhaseComments([]);
    if (!selectedPhase) {
      return;
    }
    let cancelled = false;
    apiListComments(selectedPhase)
      .then((res) => {
        if (!cancelled) setPhaseComments(res.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('خطا در دریافت پیام‌های این فاز.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPhase]);

  const inboxUsers = useMemo(
    () => users.filter((row) => row.role === 'user'),
    [users],
  );

  const phaseCount = (username: string, phase: string) =>
    messagesByUser[userKey(username)]?.[phase]?.length ?? 0;
  const phaseUnread = (username: string, phase: string) =>
    unreadByPhase[phaseUserKey(username, phase)] ?? 0;
  const userTotal = (username: string) =>
    ALL_PHASES.reduce((sum, [phase]) => sum + phaseCount(username, phase), 0);
  const userUnread = (username: string) =>
    ALL_PHASES.reduce((sum, [phase]) => sum + phaseUnread(username, phase), 0);

  const selectedUserPhases = selectedUser
    ? ALL_PHASES.filter(([phase]) => phaseCount(selectedUser, phase) > 0)
    : [];

  const selectedRoots = useMemo(() => {
    if (!selectedUser || !selectedPhase) return [];
    const username = userKey(selectedUser);
    return phaseComments.filter(
      (comment) => comment.parentId === null && comment.author.toLowerCase() === username,
    );
  }, [phaseComments, selectedPhase, selectedUser]);

  const repliesOf = (rootId: string) =>
    phaseComments.filter((comment) => comment.parentId === rootId);

  const reply = async (parentId: string) => {
    if (!selectedPhase) return;
    const draft = (drafts[parentId] ?? '').trim();
    if (!draft) return;
    setBusyId(parentId);
    setError('');
    const res = await apiPostComment(selectedPhase, draft, parentId);
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDrafts((current) => ({ ...current, [parentId]: '' }));
    await load();
    window.dispatchEvent(new Event('notifications-updated'));
  };

  return (
    <section className="comment-inbox rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        صندوق پیام‌ها و پاسخ‌ها
      </h2>
      <p className="mb-4 text-xs text-muted">
        کاربر را انتخاب کنید، سپس فاز را ببینید و در نهایت رشتهٔ پیام را باز کنید. تعداد پیام‌ها و پیام‌های جدید در هر مرحله مشخص است.
      </p>
      {account.role === 'superadmin' && (
        <p className="mb-3 text-[11px] text-muted">نمایش پیام‌های همهٔ کاربران برای سوپر ادمین فعال است.</p>
      )}
      {error && (
        <p className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : (
        <div className="comment-inbox-layout min-w-0">
          <div className="min-w-0">
            <h3 className="inbox-step-title">۱. انتخاب کاربر</h3>
            {inboxUsers.length === 0 ? (
              <p className="empty">کاربری با پیام پیدا نشد.</p>
            ) : (
              <ul className="space-y-2">
                {[...inboxUsers]
                  .sort((a, b) => userUnread(b.username) - userUnread(a.username) || a.username.localeCompare(b.username))
                  .map((row) => {
                    const selected = selectedUser === row.username;
                    const total = userTotal(row.username);
                    const fresh = userUnread(row.username);
                    return (
                      <li key={row.username}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(row.username);
                            setSelectedPhase(null);
                          }}
                          className={`inbox-user-card ${selected ? 'selected' : ''}`}
                        >
                          <span className="avatar" style={{ width: 30, height: 30, fontSize: 13 }}>
                            {row.username.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 text-start">
                            <span className="block truncate text-sm font-bold" dir="ltr">{row.username}</span>
                            <span className="text-[10px] font-semibold text-muted">{ROLE_LABEL[row.role]}</span>
                          </span>
                          <span className="inbox-counts">
                            <span className="pill">{total} پیام</span>
                            {fresh > 0 && (
                              <span className="pill fresh-pill"><span className="dot" />{fresh} جدید</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="inbox-step-title">۲. انتخاب فاز</h3>
            {!selectedUser ? (
              <p className="empty">ابتدا یک کاربر انتخاب کنید.</p>
            ) : selectedUserPhases.length === 0 ? (
              <p className="empty">این کاربر هنوز پیامی ثبت نکرده است.</p>
            ) : (
              <ul className="space-y-2">
                {selectedUserPhases.map(([phase, label]) => {
                  const selected = selectedPhase === phase;
                  const total = phaseCount(selectedUser, phase);
                  const fresh = phaseUnread(selectedUser, phase);
                  return (
                    <li key={phase}>
                      <button
                        type="button"
                        onClick={() => setSelectedPhase(selected ? null : phase)}
                        className={`inbox-phase-card ${selected ? 'selected' : ''}`}
                      >
                        <span className="min-w-0 flex-1 text-start text-sm font-bold">{label}</span>
                        <span className="inbox-counts">
                          <span className="pill">{total} پیام</span>
                          {fresh > 0 && <span className="pill fresh-pill"><span className="dot" />جدید</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="inbox-step-title">۳. پیام‌ها و پاسخ</h3>
            {!selectedUser || !selectedPhase ? (
              <p className="empty">کاربر و فاز را انتخاب کنید تا پیام‌ها نمایش داده شود.</p>
            ) : selectedRoots.length === 0 ? (
              <p className="empty">پیامی در این فاز نیست.</p>
            ) : (
              <ul className="space-y-3">
                {selectedRoots.map((root) => (
                  <li
                    key={root.id}
                    className={`inbox-thread ${unreadCommentIds.has(root.id) ? 'unread' : ''}`}
                  >
                    <header className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold" dir="ltr">{root.author}</span>
                      {unreadCommentIds.has(root.id) && <span className="pill fresh-pill"><span className="dot" />جدید</span>}
                      <span className="ms-auto text-[10px] text-muted">{fmtDate(root.createdAt)}</span>
                    </header>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6">{root.text}</p>

                    {repliesOf(root.id).map((replyComment) => (
                      <article key={replyComment.id} className="inbox-reply">
                        <header className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold" dir="ltr">{replyComment.author}</span>
                          <span className="pill">{ROLE_LABEL[replyComment.authorRole]}</span>
                          <span className="ms-auto text-[10px] text-muted">{fmtDate(replyComment.createdAt)}</span>
                        </header>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6">{replyComment.text}</p>
                      </article>
                    ))}

                    <div className="mt-3 border-t border-line pt-3">
                      <textarea
                        dir="auto"
                        value={drafts[root.id] ?? ''}
                        onChange={(event) => setDrafts((current) => ({ ...current, [root.id]: event.target.value }))}
                        rows={2}
                        maxLength={4000}
                        placeholder="پاسخ به این پیام…"
                        className="field min-w-0 resize-y text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void reply(root.id)}
                        disabled={busyId === root.id || !(drafts[root.id] ?? '').trim()}
                        className="mt-2 rounded-lg border border-accent bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-ink disabled:opacity-50"
                      >
                        {busyId === root.id ? 'در حال ارسال…' : 'ارسال پاسخ'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
