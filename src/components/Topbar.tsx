import { useCallback, useEffect, useRef, useState } from 'react';
import { apiListNotifications, apiMarkNotifications } from '../api';
import type { AppNotification, PublicAccount } from '../types';
import type { Route } from '../App';

interface Props {
  view: Route;
  account: PublicAccount;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleMenu: () => void;
  onLogout: () => void;
  /** برای deep-link و پرش به فاز + پیام مربوطه */
  onOpenComment: (phase: Route, commentId: string) => void;
}

const VIEW_TITLES: Record<string, string> = {
  home: 'میز کار',
  'phase-1': 'فاز ۱: آموزش SIEM',
  'phase-2': 'فاز ۲: آموزش شبکه',
  'phase-3': 'فاز ۳: آموزش Endpoint',
  'phase-4': 'فاز ۴: Onboarding و OKRها',
  appendix: 'پیوست ۱: مراجع SANS SEC450',
  admin: 'پنل مدیریت',
};

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (diff < 60_000) return 'چند لحظه پیش';
  if (min < 60) return `${min} دقیقه پیش`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} ساعت پیش`;
  try {
    return new Date(iso).toLocaleString('fa-IR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function Topbar({ view, account, theme, onToggleTheme, onToggleMenu, onLogout, onOpenComment }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiListNotifications();
      setNotifications(res.notifications ?? []);
      setUnread(res.unread ?? 0);
    } catch {
      /* خطای شبکه — خاموش */
    }
  }, []);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    const onOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('notifications-updated', onRefresh);
    window.addEventListener('mousedown', onOutside);
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      window.removeEventListener('notifications-updated', onRefresh);
      window.removeEventListener('mousedown', onOutside);
      window.clearInterval(timer);
    };
  }, [load]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      await load();
      // با باز شدن پنل، همه اعلان‌ها خوانده‌شده می‌شوند
      if (unread > 0) {
        await apiMarkNotifications([], true);
        setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
        setUnread(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const openNotification = (n: AppNotification) => {
    setOpen(false);
    onOpenComment(n.phase as Route, n.commentId);
  };

  const isAdmin = account.role === 'admin' || account.role === 'superadmin';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggleMenu}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-sm transition hover:bg-raised lg:hidden"
          aria-label="باز کردن منو"
        >
          ☰
        </button>

        <h1 className="truncate text-sm font-extrabold">{VIEW_TITLES[view] ?? 'راهنما'}</h1>

        <div className="ms-auto flex items-center gap-2">
          {/* کلید تم */}
          <button
            onClick={onToggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-base transition hover:bg-raised"
            title={theme === 'dark' ? 'تم روشن' : 'تم تیره'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* زنگوله اعلان‌ها */}
          <div className="relative" ref={boxRef}>
            <button
              onClick={() => void toggle()}
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-line text-base transition hover:bg-raised"
              aria-label="اعلان‌ها"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -end-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">
                  {unread > 99 ? '۹۹+' : unread.toLocaleString('fa-IR')}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute end-0 top-full z-50 mt-2 max-h-[70vh] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="text-sm font-extrabold">مرکز اعلان‌ها</span>
                  <button
                    onClick={() => void apiMarkNotifications([], true).then(() => load())}
                    className="text-[11px] font-semibold text-muted transition hover:text-accent"
                  >
                    علامت‌گذاری همه
                  </button>
                </div>
                <div className="max-h-[58vh] overflow-y-auto p-2">
                  {loading ? (
                    <p className="px-3 py-8 text-center text-xs text-muted">در حال بارگذاری…</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-muted">اعلانی وجود ندارد.</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-start transition hover:bg-raised ${
                          n.read ? 'opacity-70' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <span>{n.kind === 'user-question' ? '💬' : '✅'}</span>
                          <span className="font-bold">{n.text}</span>
                          {!n.read && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-ink">
                              جدید
                            </span>
                          )}
                        </span>
                        <span className="flex items-center justify-between text-[10px] text-muted">
                          <span>از: {n.actor}</span>
                          <span>{fmtRelative(n.createdAt)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {(!isAdmin || notifications.length > 0) && (
                  <div className="border-t border-line px-4 py-2 text-center text-[10px] text-muted">
                    کلیک روی هر اعلان → پرش مستقیم به همان پیام در همان فاز
                  </div>
                )}
              </div>
            )}
          </div>

          {/* کاربر و خروج (دسکتاپ) */}
          <span className="hidden items-center gap-2 md:flex">
            <span className="text-xs text-muted">
              <span className="font-bold text-text" dir="ltr">
                {account.username}
              </span>
            </span>
          </span>
          <button
            onClick={() => void onLogout()}
            className="hidden rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:bg-raised hover:text-text md:block"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}
