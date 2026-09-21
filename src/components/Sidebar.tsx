import type { PublicAccount } from '../types';
import type { Route } from '../App';

interface Props {
  view: Route;
  account: PublicAccount;
  isAdmin: boolean;
  chatUnread: number;
  navigate: (r: Route) => void;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  menuLabels?: Record<string, string>;
  /** ترتیب منوهای سفارشی ادمین (فقط کاربران) */
  navOrder?: string[];
  /** حالت نمای یوزر ادمین */
  previewAsUser?: boolean;
  onTogglePreview?: () => void;
}

const NAV_ITEMS: Array<{ id: Route; label: string; adminOnly?: boolean }> = [
  { id: 'home', label: 'میز کار' },
  { id: 'phase-1', label: 'فاز ۱: آموزش SIEM' },
  { id: 'phase-2', label: 'فاز ۲: آموزش شبکه' },
  { id: 'phase-3', label: 'فاز ۳: آموزش Endpoint' },
  { id: 'phase-4', label: 'فاز ۴: Onboarding' },
  { id: 'appendix', label: 'پیوست ۱: مراجع SANS SEC450' },
  { id: 'chat', label: 'گفت‌وگو' },
  { id: 'admin', label: 'پنل مدیریت', adminOnly: true },
];

const ROLE_FA: Record<string, string> = {
  superadmin: 'سوپر ادمین',
  admin: 'ادمین',
  user: 'کاربر',
};

export default function Sidebar({ view, account, isAdmin, chatUnread, navigate, open, onClose, onLogout, menuLabels, navOrder, previewAsUser, onTogglePreview }: Props) {
  const label = (id: string) =>
    menuLabels?.[id] ?? NAV_ITEMS.find((n) => n.id === id)?.label ?? id;

  // در نمای یوزر، ادمین دقیقاً همان منوهای کاربران خودش را می‌بیند
  const showUserNav = !isAdmin || previewAsUser;
  const items: Array<{ id: Route; label: string; adminOnly?: boolean }> = showUserNav
    ? navOrder && navOrder.length > 0
      ? [
          ...navOrder.map((id) => ({ id: id as Route, label: label(id) })),
          { id: 'chat' as Route, label: label('chat') === 'chat' ? 'گفت‌وگو' : label('chat') },
        ]
      : NAV_ITEMS.filter((it) => !it.adminOnly)
    : NAV_ITEMS.filter((it) => it.adminOnly || it.id === 'chat');

  return (
    <>
      {/* لایه تیره پشت منو در موبایل — کلیک = بستن منو */}
      {open && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="ناوبری اصلی">
        {/* برند — SOC Noooob + دکمه بستن (فقط موبایل) */}
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <b>SOC NOOOOB</b>
            <small>ACADEMY</small>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="بستن منو"
          >
            ✕
          </button>
        </div>

        <div className="nav-label">
          {isAdmin ? (previewAsUser ? 'نمای یوزر 👁' : 'مدیریت سیستم') : 'دوره آزمایشی'}
        </div>
        <nav className="nav">
          {items.map((it) => (
            <button
              key={it.id}
              className={view === it.id ? 'active' : undefined}
              onClick={() => {
                navigate(it.id);
                onClose();
              }}
            >
              <span>{it.label}</span>
              {it.id === 'chat' && chatUnread > 0 && <span className="dot nav-unread-dot" aria-label="پیام خوانده‌نشده" />}
              {view === it.id && !(it.id === 'chat' && chatUnread > 0) && <span className="dot nav-num" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <div className="identity">
            <span className="avatar" aria-hidden="true">
              {(account.username || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="small" style={{ minWidth: 0 }}>
              <b dir="ltr" style={{ display: 'block', overflowWrap: 'anywhere' }}>
                {account.username}
              </b>
              <span className="muted">{ROLE_FA[account.role] ?? 'کاربر'}</span>
            </div>
          </div>
        <button
          className="plain muted"
          style={{ width: '100%', marginTop: 12 }}
          onClick={onLogout}
        >
          خروج از حساب
        </button>
        {isAdmin && onTogglePreview && (
          <button
            className={previewAsUser ? 'primary' : 'plain'}
            style={{ width: '100%', marginTop: 8, fontSize: 13, fontWeight: 700 }}
            onClick={() => {
              onTogglePreview();
              onClose();
            }}
          >
            {previewAsUser ? '🛡 برگشت به حالت ادمین' : '👁 رفتن به حالت یوزر'}
          </button>
        )}
        </div>
      </aside>
    </>
  );
}
