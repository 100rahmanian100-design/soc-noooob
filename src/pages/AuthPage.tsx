import { useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiStatus, type StatusInfo } from '../api';
import type { PublicAccount } from '../types';
import type { Route } from '../App';

interface Props {
  account: PublicAccount | null;
  onAuthed: (a: PublicAccount) => void;
  navigate: (r: Route) => void;
}

export default function AuthPage({ account, onAuthed, navigate }: Props) {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiStatus().then(setStatus).catch(() => setStatus({ firstRegisterOpen: false }));
  }, []);

  useEffect(() => {
    if (status && status.firstRegisterOpen) {
      setMode('register');
      setNotice(
        'سیستم هنوز هیچ حسابی ندارد. با کد دعوتی، نخستین ثبت‌نام را انجام دهید تا سوپر ادمین شوید.',
      );
    }
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await apiLogin(username, password)
          : await apiRegister(username, password, inviteCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.account) {
        onAuthed(res.account);
        navigate('home');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(225,29,46,0.14),transparent)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl font-extrabold text-ink shadow-lg shadow-accent/30">
            E
          </span>
          <h1 className="text-2xl font-extrabold">SOC Noooob</h1>
          <p className="mt-1 text-sm text-muted">
            راهنمای شروع به کار و دوره آزمایشی — ورود به سامانه
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/30">
          {!status?.firstRegisterOpen && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-bg p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === 'login' ? 'bg-raised text-white' : 'text-muted hover:text-ink'
                }`}
              >
                ورود
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === 'register' ? 'bg-raised text-white' : 'text-muted hover:text-ink'
                }`}
              >
                ثبت‌نام
              </button>
            </div>
          )}

          {notice && (
            <p className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs leading-6 text-warn">
              {notice}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs leading-6 text-danger">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">نام کاربری</span>
              <input
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </label>

            {mode === 'register' && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">کد دعوتی</span>
                <input
                  dir="ltr"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
                />
                <span className="mt-1 block text-[11px] text-muted">
                  نخستین ثبت‌نام با کد دعوتی، حساب سوپر ادمین می‌سازد.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg border-0 bg-accent py-2.5 font-bold text-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
            </button>
          </form>

          {account && (
            <p className="mt-4 text-center text-xs text-muted">
              شما با حساب «{account.username}» وارد هستید.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-6 text-muted">
          کاربران عادی از طریق ادمین سیستم ساخته می‌شوند؛ ثبت‌نام عمومی فقط برای نخستین سوپر ادمین
          باز است.
        </p>
      </div>
    </div>
  );
}

