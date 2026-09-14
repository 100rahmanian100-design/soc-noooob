import { useCallback, useEffect, useState } from 'react';
import { apiLogout, apiMe } from './api';
import type { PublicAccount } from './types';
import AuthPage from './pages/AuthPage';
import GuidePage, { type GuideView } from './pages/GuidePage';
import AdminPage from './pages/AdminPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

/** مسیریابی hash — بدون وابستگی بیرونی */
export type Route = 'auth' | 'admin' | GuideView;

const VALID_VIEWS: Route[] = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix', 'admin', 'auth'];

/** پارس هش: #/phase-2?c=<commentId> */
function parseHash(): { route: Route; focusCommentId: string | null } {
  let raw = window.location.hash.replace(/^#\/?/, '');
  let focusCommentId: string | null = null;
  const m = raw.match(/^(.*)\?c=([0-9a-f]+)$/);
  if (m) {
    raw = m[1] ?? '';
    focusCommentId = m[2] ?? null;
  }
  const base = raw || 'home';
  const route: Route = (VALID_VIEWS as string[]).includes(base) ? (base as Route) : 'home';
  return { route, focusCommentId };
}

export default function App() {
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>(parseHash().route);
  const [focus, setFocus] = useState<{ commentId: string; nonce: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const p = parseHash();
      setRoute(p.route);
      if (p.focusCommentId) {
        setFocus((f) => ({ commentId: p.focusCommentId!, nonce: (f?.nonce ?? 0) + 1 }));
      } else {
        setFocus(null);
      }
    };
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
    if (parseHash().route === r && r !== 'auth') return;
    window.location.hash = `#/${r}`;
    setRoute(r);
    setFocus(null);
  }, []);

  /** پرش مستقیم از اعلان به فاز و پیام مشخص */
  const openComment = useCallback((phase: Route, commentId: string) => {
    window.location.hash = `#/${phase}?c=${commentId}`;
    setRoute(phase);
    setFocus((f) => ({ commentId, nonce: (f?.nonce ?? 0) + 1 }));
  }, []);

  const onLogout = useCallback(async () => {
    await apiLogout();
    setAccount(null);
    window.location.hash = '#/auth';
    setRoute('auth');
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} className="muted">
        در حال بارگذاری…
      </div>
    );
  }

  const isAdmin = account?.role === 'admin' || account?.role === 'superadmin';

  if (!account || route === 'auth') {
    return (
      <AuthPage
        account={account}
        onAuthed={(a) => {
          setAccount(a);
          const nextRoute: Route = a.role === 'admin' || a.role === 'superadmin' ? 'admin' : 'home';
          window.location.hash = `#/${nextRoute}`;
          setRoute(nextRoute);
        }}
        navigate={navigate}
      />
    );
  }

  // ادمین و سوپرادمین فقط پنل مدیریت را می‌بینند؛ حتی با ورود مستقیم به لینک فاز.
  const effectiveRoute: Route = isAdmin ? 'admin' : route === 'admin' ? 'home' : route;
  const showAdmin = isAdmin;
  const guideView: GuideView = (effectiveRoute as GuideView) ?? 'home';

  return (
    <div className="min-h-screen">
      <Sidebar
        view={effectiveRoute}
        account={account}
        isAdmin={isAdmin}
        navigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={() => void onLogout()}
      />

      {/* شل — مطابق سیستم مرجع: .shell + .topbar + .content */}
      <div className="shell">
        <Topbar
          view={effectiveRoute}
          account={account}
          onToggleMenu={() => setMenuOpen((o) => !o)}
          onLogout={() => void onLogout()}
          onOpenComment={openComment}
        />

        <main className="content">
          <div key={effectiveRoute} className="view-enter fade">
            {showAdmin ? (
              <AdminPage account={account} />
            ) : (
              <GuidePage
                account={account}
                view={guideView}
                navigate={navigate}
                focusCommentId={focus?.commentId ?? null}
                focusNonce={focus?.nonce}
              />
            )}
          </div>
        </main>

        <footer className="footnote" style={{ textAlign: 'center' }}>
          SOC Noooob — راهنمای شروع به کار و دوره آزمایشی · شهریور – مهر ۱۴۰۵
        </footer>
      </div>
    </div>
  );
}
