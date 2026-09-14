import { useCallback, useEffect, useRef, useState } from 'react';
import { apiListNotifications, apiMarkNotifications } from '../api';
import type { AppNotification, PublicAccount } from '../types';
import type { Route } from '../App';

interface Props {
  view: Route;
  account: PublicAccount;
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
  'phase-4': 'فاز ۴: Onboarding',
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

export default function Topbar({ view, account, onToggleMenu, onLogout, onOpenComment }: Props) {
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
    <header className="topbar">
      {/* بردکرامب — مطابق سیستم مرجع */}
      <div className="breadcrumb">
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{VIEW_TITLES[view] ?? 'راهنما'}</span>
      </div>
      <div className="top-tools">
        {/* منوی موبایل — فقط در نمایش ≤۸۰۰px دیده می‌شود (کلاس مرجع) */}
        <button
          className="mobile-menu plain icon"
          onClick={onToggleMenu}
          aria-label="باز و بسته کردن منو"
        >
          ☰
        </button>

        {/* زنگوله اعلان‌ها */}
        <div style={{ position: 'relative' }} ref={boxRef}>
          <button className="plain icon" onClick={() => void toggle()} aria-label="اعلان‌ها">
            🔔
            {unread > 0 && (
              <span className="pill" style={{ position: 'absolute', top: -6, insetInlineEnd: -6, padding: '0 6px', background: 'var(--red)', color: 'oklch(97% .007 105)', borderColor: 'transparent', fontSize: 11 }}>
                {unread > 99 ? '۹۹+' : unread.toLocaleString('fa-IR')}
              </span>
            )}
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                insetInlineEnd: 0,
                top: '100%',
                zIndex: 50,
                marginTop: 8,
                maxHeight: '70vh',
                width: 'min(92vw, 24rem)',
                overflow: 'hidden',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                boxShadow: '0 18px 48px oklch(12% .008 105 / .5)',
              }}
            >
              <div className="row between" style={{ borderBottom: '1px solid var(--line)', padding: '12px 16px' }}>
                <span className="small" style={{ fontWeight: 700 }}>
                  مرکز اعلان‌ها
                </span>
                <button
                  onClick={() => void apiMarkNotifications([], true).then(() => load())}
                  className="plain muted"
                  style={{ minHeight: 32, padding: '2px 8px', fontSize: 12 }}
                >
                  علامت‌گذاری همه
                </button>
              </div>
              <div style={{ maxHeight: '56vh', overflowY: 'auto', padding: 8 }}>
                {loading ? (
                  <p className="small muted" style={{ textAlign: 'center', padding: '32px 12px' }}>
                    در حال بارگذاری…
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="small muted" style={{ textAlign: 'center', padding: '32px 12px' }}>
                    اعلانی وجود ندارد.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className="plain"
                      style={{
                        display: 'flex',
                        width: '100%',
                        flexDirection: 'column',
                        gap: 4,
                        alignItems: 'flex-start',
                        textAlign: 'start',
                        padding: '10px 12px',
                        marginBottom: 4,
                        borderRadius: 9,
                        opacity: n.read ? 0.7 : 1,
                      }}
                    >
                      <span className="row small" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span>{n.kind === 'user-question' ? '💬' : '✅'}</span>
                        <span style={{ fontWeight: 700 }}>{n.text}</span>
                        {!n.read && (
                          <span className="pill" style={{ color: 'var(--ink)', background: 'var(--accent)', borderColor: 'transparent' }}>
                            جدید
                          </span>
                        )}
                      </span>
                      <span className="small muted" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11 }}>
                        <span>از: {n.actor}</span>
                        <span>{fmtRelative(n.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
              {(!isAdmin || notifications.length > 0) && (
                <div className="small muted" style={{ borderTop: '1px solid var(--line)', padding: '8px 16px', textAlign: 'center', fontSize: 11 }}>
                  کلیک روی هر اعلان → پرش مستقیم به همان پیام در همان فاز
                </div>
              )}
            </div>
          )}
        </div>

        {/* خروج */}
        <button className="plain muted small" onClick={() => void onLogout()}>
          خروج
        </button>
      </div>
    </header>
  );
}
