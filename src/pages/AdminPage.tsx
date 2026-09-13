import { useCallback, useEffect, useState } from 'react';
import {
  apiCreateUser,
  apiListComments,
  apiListUsers,
  apiPostComment,
  apiResetPassword,
  apiSetUserStatus,
} from '../api';
import type { CommentItem, PublicAccount, Role } from '../types';
import { ROLE_LABEL } from '../types';

interface Props {
  account: PublicAccount;
}

const ALL_PHASES = [
  ['phase-1', 'فاز ۱ — SIEM'],
  ['phase-2', 'فاز ۲ — شبکه'],
  ['phase-3', 'فاز ۳ — Endpoint'],
  ['phase-4', 'فاز ۴ — Onboarding'],
] as const;

const roleBadge = (role: Role) =>
  role === 'superadmin'
    ? 'border-brand/60 bg-brand/10 text-brand-soft'
    : role === 'admin'
      ? 'border-warn/50 bg-warn/10 text-warn'
      : 'border-line bg-raised text-muted';

export default function AdminPage({ account }: Props) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold tracking-widest text-brand-soft">ADMIN PANEL</p>
        <h1 className="mt-1 text-2xl font-extrabold">پنل مدیریت</h1>
        <p className="mt-1 text-sm text-muted">
          {account.role === 'superadmin'
            ? 'به‌عنوان سوپر ادمین می‌توانید ادمین و کاربر عادی بسازید و همه گفت‌وگوها را ببینید.'
            : 'به‌عنوان ادمین می‌توانید کاربر عادی بسازید و به پیام‌های کاربران خودتان پاسخ دهید.'}
        </p>
      </header>
      <CreateUserForm account={account} />
      <UsersList account={account} />
      <CommentInbox account={account} />
    </div>
  );
}

/* ------------------------------------------------ ساخت حساب */
function CreateUserForm({ account }: { account: PublicAccount }) {
  const [username, setUsername] = useState('');
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
      const res = await apiCreateUser(username.trim(), password, role);
      if (res.error) setError(res.error);
      else {
        setMessage(res.message ?? 'حساب ساخته شد.');
        setUsername('');
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
        <span className="inline-block h-5 w-1.5 rounded bg-brand" />
        ساخت حساب جدید
      </h2>
      {message && (
        <p className="mb-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-xs text-brand-soft">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">نام کاربری</span>
          <input
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">رمز عبور (حداقل ۸)</span>
          <input
            dir="ltr"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">نقش</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="user">کاربر عادی</option>
            {canCreateAdmin && <option value="admin">ادمین</option>}
          </select>
          {!canCreateAdmin && (
            <span className="mt-1 block text-[11px] text-muted">
              ادمین فقط می‌تواند کاربر عادی بسازد.
            </span>
          )}
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border-0 bg-brand py-2 font-bold text-white transition hover:bg-brand-soft disabled:opacity-50"
          >
            {busy ? 'در حال ساخت…' : 'ساخت حساب'}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------------------------ فهرست کاربران */
function UsersList({ account }: { account: PublicAccount }) {
  const [users, setUsers] = useState<PublicAccount[]>([]);
  const [error, setError] = useState('');
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

  const load = useCallback(async () => {
    const res = await apiListUsers();
    if (res.error) setError(res.error);
    else setUsers(res.users ?? []);
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('users-changed', onChange);
    return () => window.removeEventListener('users-changed', onChange);
  }, [load]);

  const toggleActive = async (u: PublicAccount) => {
    const res = await apiSetUserStatus(u.username, !u.active);
    if (res.error) setError(res.error);
    else setError('');
    await load();
  };

  const doReset = async (username: string) => {
    const res = await apiResetPassword(username, newPass);
    if (res.error) setError(res.error);
    else {
      setError('');
      setResetFor(null);
      setNewPass('');
    }
    await load();
  };

  const canManage = (u: PublicAccount) =>
    account.role === 'superadmin' ||
    (account.role === 'admin' && u.createdBy === account.username);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-brand" />
        حساب‌ها
      </h2>
      {error && (
        <p className="mb-3 rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-xs text-brand-soft">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-raised text-xs text-muted">
              <th className="px-3 py-2 text-start font-bold">نام کاربری</th>
              <th className="px-3 py-2 text-start font-bold">نقش</th>
              <th className="px-3 py-2 text-start font-bold">ساخته‌شده توسط</th>
              <th className="px-3 py-2 text-start font-bold">وضعیت</th>
              <th className="px-3 py-2 text-start font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-t border-line">
                <td className="px-3 py-2.5 font-semibold" dir="ltr">
                  {u.username}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(u.role)}`}
                  >
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted" dir="ltr">
                  {u.createdBy ?? '—'}
                </td>
                <td className="px-3 py-2.5">
                  {u.active ? (
                    <span className="text-xs font-semibold text-ok">فعال</span>
                  ) : (
                    <span className="text-xs font-semibold text-brand-soft">غیرفعال</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {canManage(u) && u.username !== account.username && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded-md border border-line px-2.5 py-1 text-[11px] transition hover:bg-raised"
                      >
                        {u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                      </button>
                      <button
                        onClick={() => {
                          setResetFor(resetFor === u.username ? null : u.username);
                          setNewPass('');
                        }}
                        className="rounded-md border border-line px-2.5 py-1 text-[11px] transition hover:bg-raised"
                      >
                        بازنشانی رمز
                      </button>
                      {resetFor === u.username && (
                        <span className="flex items-center gap-2">
                          <input
                            dir="ltr"
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="رمز جدید"
                            className="rounded-md border border-line bg-bg px-2 py-1 text-xs outline-none focus:border-brand"
                          />
                          <button
                            onClick={() => doReset(u.username)}
                            disabled={newPass.length < 8}
                            className="rounded-md border-0 bg-brand px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            ثبت
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  حسابی یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------ صندوق گفت‌وگوها */
function CommentInbox({ account }: { account: PublicAccount }) {
  const [phase, setPhase] = useState<string>('phase-1');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiListComments(phase);
      if (res.error) setError(res.error);
      else {
        setError('');
        setComments(res.comments ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [phase]);

  useEffect(() => {
    void load();
  }, [load]);

  const reply = async (parentId: string) => {
    const text = (drafts[parentId] ?? '').trim();
    if (!text) return;
    const res = await apiPostComment(phase, text, parentId);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError('');
    setDrafts((d) => ({ ...d, [parentId]: '' }));
    await load();
  };

  const roots = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <span className="inline-block h-5 w-1.5 rounded bg-brand" />
          گفت‌وگوهای کاربران
        </h2>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {ALL_PHASES.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-xs text-brand-soft">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : roots.length === 0 ? (
        <p className="text-sm text-muted">در این فاز پیامی ثبت نشده است.</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((root) => (
            <li key={root.id} className="rounded-xl border border-line bg-bg p-4">
              <header className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{root.author}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(root.authorRole)}`}
                >
                  {ROLE_LABEL[root.authorRole]}
                </span>
                {root.answered ? (
                  <span className="rounded-md border border-ok/40 bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
                    ✓ پاسخ داده شد
                  </span>
                ) : (
                  <span className="rounded-md border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
                    ⏳ در انتظار پاسخ
                  </span>
                )}
              </header>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{root.text}</p>

              {repliesOf(root.id).map((r) => (
                <div key={r.id} className="mt-3 ms-6 border-e-2 border-line pe-3">
                  <header className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold">{r.author}</span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(r.authorRole)}`}
                    >
                      {ROLE_LABEL[r.authorRole]}
                    </span>
                    <span className="text-[10px] text-muted">↩ پاسخ</span>
                  </header>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{r.text}</p>
                </div>
              ))}

              <div className="mt-3 ms-6">
                <textarea
                  dir="auto"
                  value={drafts[root.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [root.id]: e.target.value }))}
                  rows={2}
                  maxLength={4000}
                  placeholder="پاسخ به این پیام…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  onClick={() => reply(root.id)}
                  disabled={!(drafts[root.id] ?? '').trim()}
                  className="mt-2 rounded-lg border border-brand bg-brand/10 px-4 py-1.5 text-xs font-bold text-brand-soft transition hover:bg-brand hover:text-white disabled:opacity-50"
                >
                  ارسال پاسخ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}




