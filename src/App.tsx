import { useCallback, useEffect, useState } from 'react';
import { apiLogout, apiMe } from './api';
import type { PublicAccount } from './types';
import AuthPage from './pages/AuthPage';
import GuidePage from './pages/GuidePage';
import AdminPage from './pages/AdminPage';

/** مسیریابی ساده مبتنی بر hash — بدون وابستگی بیرونی */
export type Route = 'guide' | 'admin' | 'auth';

function readHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'admin' || h === 'auth') return h;
  return 'guide';
}

export default function App() {
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>(readHash());

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    apiMe()
      .then((res) => {
        if (res.account) setAccount(res.account);
      })
      .finally(() => setLoading(false));
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = `#/${r}`;
    setRoute(r);
  }, []);

  const onLogout = useCallback(async () => {
    await apiLogout();
    setAccount(null);
    navigate('auth');
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        در حال بارگذاری…
      </div>
    );
  }

  if (!account || route === 'auth') {
    return <AuthPage account={account} onAuthed={setAccount} navigate={navigate} />;
  }

  const isAdmin = account.role === 'admin' || account.role === 'superadmin';

  return (
    <div className="min-h-screen">
      {/* هدر */}
      <header className="sticky top-0 z-40 border-b border-line bg-side/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('guide')}
            className="flex items-center gap-2 border-0 bg-transparent p-0"
            title="راهنمای شروع به کار"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-extrabold text-white">
              E
            </span>
            <span className="text-start leading-tight">
              <span className="block text-sm font-bold">SOC Noooob</span>
              <span className="block text-[11px] text-muted">راهنمای شروع به کار و دوره آزمایشی</span>
            </span>
          </button>

          <nav className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => navigate('guide')}
              className={`rounded-lg border border-line px-3 py-2 text-sm transition hover:bg-raised ${
                route === 'guide' ? 'bg-raised font-bold text-white' : 'text-muted'
              }`}
            >
              راهنمای شروع به کار
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                className={`rounded-lg border border-line px-3 py-2 text-sm transition hover:bg-raised ${
                  route === 'admin' ? 'bg-raised font-bold text-white' : 'text-muted'
                }`}
              >
                پنل ادمین
              </button>
            )}
            <span
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                account.role === 'superadmin'
                  ? 'border-brand/60 bg-brand/10 text-brand-soft'
                  : account.role === 'admin'
                    ? 'border-warn/50 bg-warn/10 text-warn'
                    : 'border-line bg-surface text-muted'
              }`}
            >
              {account.role === 'superadmin'
                ? 'سوپر ادمین'
                : account.role === 'admin'
                  ? 'ادمین'
                  : 'کاربر'}
              : {account.username}
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-raised hover:text-ink"
            >
              خروج
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {route === 'admin' && isAdmin ? (
          <AdminPage account={account} />
        ) : (
          <GuidePage account={account} />
        )}
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        SOC Noooob — راهنمای شروع به کار و دوره آزمایشی · شهریور–مهر ۱۴۰۵
      </footer>
    </div>
  );
}
