import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetContent, apiListNotifications, apiLogout, apiMarkNotifications, apiMe } from './api';
import type { AppNotification, PublicAccount } from './types';
import AuthPage from './pages/AuthPage';
import GuidePage, { type GuideView } from './pages/GuidePage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

/** مسیریابی hash — بدون وابستگی بیرونی */
export type CustomPageRoute = `custom-${string}`;
export type Route = 'auth' | 'admin' | 'chat' | GuideView | CustomPageRoute;

const VALID_VIEWS: Route[] = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix', 'admin', 'chat', 'auth'];

function isCustomRoute(base: string): base is CustomPageRoute {
  return /^custom-[a-z0-9-]{1,32}$/.test(base);
}

/** پارس هش: #/phase-2?c=<commentId> */
function parseHash(): { route: Route; focusCommentId: string | null; chatUser: string | null } {
  let raw = window.location.hash.replace(/^#\/?/, '');
  let focusCommentId: string | null = null;
  let chatUser: string | null = null;
  const queryIndex = raw.indexOf('?');
  if (queryIndex >= 0) {
    const query = new URLSearchParams(raw.slice(queryIndex + 1));
    raw = raw.slice(0, queryIndex);
    focusCommentId = query.get('c');
    chatUser = query.get('u');
  }
  const base = raw || 'home';
  const route: Route =
    (VALID_VIEWS as string[]).includes(base) || isCustomRoute(base) ? (base as Route) : 'home';
  return { route, focusCommentId, chatUser };
}

export default function App() {
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>(parseHash().route);
  const [focus, setFocus] = useState<{ commentId: string; nonce: number } | null>(null);
  const [chatUser, setChatUser] = useState<string | null>(parseHash().chatUser);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuLabels, setMenuLabels] = useState<Record<string, string> | undefined>(undefined);
  const [navOrder, setNavOrder] = useState<string[] | undefined>(undefined);
  /** حالت «نمای یوزر» ادمین: منوها و محتوا دقیقاً مثل کاربران ساخته‌ی خودش */
  const [previewAsUser, setPreviewAsUser] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('admin-preview-as-user') === '1';
    } catch {
      return false;
    }
  });
  const notificationRequest = useRef<Promise<void> | null>(null);
  const lastNotificationLoadAt = useRef(0);

  useEffect(() => {
    const onHash = () => {
      const p = parseHash();
      setRoute(p.route);
      setChatUser(p.chatUser);
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

  useEffect(() => {
    if (!account) {
      setMenuLabels(undefined);
      setNavOrder(undefined);
      return;
    }
    // محتوای اختصاصی مالک: کاربر → ادمین سازنده، ادمین → خودش (برای نمای یوزر هم لازم است)
    apiGetContent().then((res) => {
      if (res.content) {
        if (res.content.menus) setMenuLabels(res.content.menus as Record<string, string>);
        if (Array.isArray((res.content as { pageOrder?: unknown }).pageOrder)) {
          setNavOrder((res.content as { pageOrder: string[] }).pageOrder);
        }
      }
    });
  }, [account]);

  const loadNotifications = useCallback(async (force = false) => {
    if (!account) return;
    // Blob Hobby has a 10k/month read quota. Reuse the current browser state for
    // five minutes; local app events can still force an immediate refresh.
    if (!force && Date.now() - lastNotificationLoadAt.current < 5 * 60_000) return;
    if (notificationRequest.current) return notificationRequest.current;
    const request = (async () => {
      try {
        const res = await apiListNotifications();
        const next = res.notifications ?? [];
        setNotifications(next);
        setUnreadNotifications(res.unread ?? 0);
        setChatUnread(next.filter((n) => n.kind === 'chat-message' && !n.read).length);
        lastNotificationLoadAt.current = Date.now();
      } finally {
        notificationRequest.current = null;
      }
    })();
    notificationRequest.current = request;
    return request;
  }, [account]);

  const markAllNotificationsRead = useCallback(async () => {
    const res = await apiMarkNotifications([], true);
    if (!res.error) {
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadNotifications(0);
      setChatUnread(0);
    }
  }, []);

  useEffect(() => {
    if (!account) {
      setChatUnread(0);
      setNotifications([]);
      setUnreadNotifications(0);
      lastNotificationLoadAt.current = 0;
      return;
    }
    void loadNotifications();
    const refresh = () => void loadNotifications(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    window.addEventListener('notifications-updated', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('notifications-updated', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [account, loadNotifications]);

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

  const openChat = useCallback((username: string) => {
    window.location.hash = `#/chat?u=${encodeURIComponent(username)}`;
    setRoute('chat');
    setChatUser(username);
    setFocus(null);
  }, []);

  const onLogout = useCallback(async () => {
    await apiLogout();
    setAccount(null);
    setChatUnread(0);
    setNotifications([]);
    setUnreadNotifications(0);
    lastNotificationLoadAt.current = 0;
    window.location.hash = '#/auth';
    setRoute('auth');
  }, []);

  const togglePreviewAsUser = useCallback(() => {
    setPreviewAsUser((prev) => {
      const next = !prev;
      try {
        if (next) sessionStorage.setItem('admin-preview-as-user', '1');
        else sessionStorage.removeItem('admin-preview-as-user');
      } catch {
        /* ignore */
      }
      // رفتن به نمای یوزر → میز کار؛ برگشت → پنل مدیریت
      const target: Route = next ? 'home' : 'admin';
      window.location.hash = `#/${target}`;
      setRoute(target);
      setFocus(null);
      return next;
    });
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
      />
    );
  }

  // ادمین و سوپرادمین (در حالت عادی) فقط پنل مدیریت را می‌بینند؛
  // در «نمای یوزر» مثل کاربران خودشان همه صفحات آموزشی را می‌بینند.
  const previewing = isAdmin && previewAsUser;
  const effectiveRoute: Route =
    isAdmin && !previewAsUser
      ? route === 'chat'
        ? 'chat'
        : 'admin'
      : route === 'admin'
        ? 'home'
        : route;
  const showAdmin = effectiveRoute === 'admin' && isAdmin && !previewAsUser;
  const showChat = effectiveRoute === 'chat';
  // صفحات سفارشی ادمین هم مثل صفحات راهنما رندر می‌شوند
  const guideView: GuideView | CustomPageRoute = (effectiveRoute as GuideView | CustomPageRoute) ?? 'home';
  const customTitle = isCustomRoute(effectiveRoute) ? (menuLabels?.[effectiveRoute] ?? 'صفحه آموزشی') : undefined;

  return (
    <div className="min-h-screen">
      <Sidebar
        view={effectiveRoute}
        account={account}
        isAdmin={isAdmin}
        chatUnread={chatUnread}
        navigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={() => void onLogout()}
        menuLabels={menuLabels}
        navOrder={navOrder}
        previewAsUser={previewing}
        onTogglePreview={togglePreviewAsUser}
      />

      {/* شل — مطابق سیستم مرجع: .shell + .topbar + .content */}
      <div className="shell">
        <Topbar
          view={effectiveRoute}
          account={account}
          onToggleMenu={() => setMenuOpen((o) => !o)}
          onLogout={() => void onLogout()}
          onOpenComment={openComment}
          onOpenChat={openChat}
          notifications={notifications}
          unread={unreadNotifications}
          onRefreshNotifications={loadNotifications}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          customTitle={customTitle}
        />

        <main className="content">
          {previewing && !showChat && (
            <p className="preview-banner" role="status">
              👁 حالت نمای یوزر — منوها و مطالب دقیقاً مثل کاربران شماست. برای بازگشت، دکمه «برگشت به حالت ادمین» در
              پایین منو را بزنید.
            </p>
          )}
          <div key={effectiveRoute} className="view-enter fade">
            {showAdmin ? (
              <AdminPage account={account} onAccountChange={setAccount} />
            ) : showChat ? (
              <ChatPage account={account} focusUser={chatUser} />
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
