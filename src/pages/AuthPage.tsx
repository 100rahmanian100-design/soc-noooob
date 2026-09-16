import { useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiStatus, type StatusInfo } from '../api';
import type { PublicAccount } from '../types';

interface Props {
  account: PublicAccount | null;
  onAuthed: (a: PublicAccount) => void;
}

export default function AuthPage({ account, onAuthed }: Props) {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* پنل معرفی — پس‌زمینه اکسنت، دقیقاً مطابق سیستم مرجع */}
      <div className="auth-copy">
        <div>
          <div className="brand" style={{ justifyContent: 'flex-start', marginBottom: 0 }}>
            <div className="brand-mark">S</div>
            <div>
              <b>SOC NOOOOB</b>
              <small>ACADEMY</small>
            </div>
          </div>
          <h2>SOC Noooob</h2>
          <p className="small" style={{ color: 'var(--ink)', opacity: 0.9, maxWidth: '38ch' }}>
            راهنمای شروع به کار و دوره آزمایشی — ورود به سامانه
          </p>
        </div>
        <p className="small" style={{ color: 'var(--ink)', opacity: 0.9, margin: 0 }}>
          ثبت‌نام عمومی بسته است؛ حساب‌های کاربری توسط ادمین سیستم ساخته می‌شوند.
        </p>
      </div>

      {/* فرم — با کلاس‌های .auth-form و .field مرجع */}
      <div className="auth-form">
        <p className="eyebrow accent">{mode === 'login' ? 'ورود' : 'ثبت‌نام'}</p>
        <h1>خوش آمدید</h1>

        {!status?.firstRegisterOpen && (
          <div className="filters" style={{ marginTop: 20 }}>
            <button
              type="button"
              className={mode === 'login' ? 'active' : undefined}
              onClick={() => setMode('login')}
            >
              ورود
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : undefined}
              onClick={() => setMode('register')}
            >
              ثبت‌نام
            </button>
          </div>
        )}

        {notice && <p className="notice warn">{notice}</p>}
        {error && (
          <p className="notice" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}

        <form onSubmit={submit}>
          <label htmlFor="auth-username">نام کاربری</label>
          <input
            id="auth-username"
            className="field"
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="auth-password">رمز عبور</label>
          <input
            id="auth-password"
            className="field"
            dir="ltr"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'register' && (
            <>
              <label htmlFor="auth-invite">کد دعوتی</label>
              <input
                id="auth-invite"
                className="field"
                dir="ltr"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <span className="small muted">نخستین ثبت‌نام با کد دعوتی، حساب سوپر ادمین می‌سازد.</span>
            </>
          )}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        {account && (
          <p className="small muted" style={{ marginTop: 16 }}>
            شما با حساب «{account.username}» وارد هستید.
          </p>
        )}
      </div>
    </div>
  );
}
