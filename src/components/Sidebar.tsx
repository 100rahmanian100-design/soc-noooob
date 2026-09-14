import type { PublicAccount } from '../types';
import type { Route } from '../App';

interface Props {
  view: Route;
  account: PublicAccount;
  isAdmin: boolean;
  navigate: (r: Route) => void;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{ id: Route; label: string; adminOnly?: boolean }> = [
  { id: 'home', label: 'میز کار' },
  { id: 'phase-1', label: 'فاز ۱: آموزش SIEM' },
  { id: 'phase-2', label: 'فاز ۲: آموزش شبکه' },
  { id: 'phase-3', label: 'فاز ۳: آموزش Endpoint' },
  { id: 'phase-4', label: 'فاز ۴: Onboarding' },
  { id: 'appendix', label: 'پیوست ۱: مراجع SANS SEC450' },
  { id: 'admin', label: 'پنل مدیریت', adminOnly: true },
];

const ROLE_FA: Record<string, string> = {
  superadmin: 'سوپر ادمین',
  admin: 'ادمین',
  user: 'کاربر',
};

export default function Sidebar({ view, account, isAdmin, navigate, open, onClose, onLogout }: Props) {
  const items = isAdmin
    ? NAV_ITEMS.filter((it) => it.adminOnly)
    : NAV_ITEMS.filter((it) => !it.adminOnly);

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="ناوبری اصلی">
      {/* برند — SOC Noooob */}
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <b>SOC NOOOOB</b>
          <small>ACADEMY</small>
        </div>
      </div>

      <div className="nav-label">{isAdmin ? 'مدیریت سیستم' : 'دوره آزمایشی'}</div>
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
            {view === it.id && <span className="dot nav-num" aria-hidden="true" />}
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
      </div>
    </aside>
  );
}
