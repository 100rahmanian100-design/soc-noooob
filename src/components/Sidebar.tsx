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

const NAV_ITEMS: Array<{ id: Route; emoji: string; label: string; adminOnly?: boolean }> = [
  { id: 'home', emoji: '🏠', label: 'میز کار' },
  { id: 'phase-1', emoji: '🧭', label: 'فاز ۱: آموزش SIEM' },
  { id: 'phase-2', emoji: '🌐', label: 'فاز ۲: آموزش شبکه' },
  { id: 'phase-3', emoji: '💻', label: 'فاز ۳: آموزش Endpoint' },
  { id: 'phase-4', emoji: '🚀', label: 'فاز ۴: Onboarding و OKRها' },
  { id: 'appendix', emoji: '📑', label: 'پیوست ۱: مراجع SANS SEC450' },
  { id: 'admin', emoji: '👥', label: 'پنل مدیریت', adminOnly: true },
];

export default function Sidebar({ view, account, isAdmin, navigate, open, onClose, onLogout }: Props) {
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);

  return (
    <>
      {/* پس‌زمینه تیره هنگام بازبودن در موبایل */}
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-[238px] flex-col border-e border-line bg-side transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* لوگو */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-lg font-extrabold text-ink">
            E
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-extrabold">آکادمی SOC ارمانیان</span>
            <span className="block text-[11px] text-muted">راهنمای دوره آزمایشی</span>
          </div>
        </div>

        {/* ناوبری */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((it) => {
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  navigate(it.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'border border-accent/40 bg-accent/10 font-bold text-accent'
                    : 'border border-transparent text-muted hover:bg-raised hover:text-text'
                }`}
              >
                <span className="text-base">{it.emoji}</span>
                <span>{it.label}</span>
                {active && <span className="ms-auto inline-block h-2 w-2 rounded-full bg-accent" />}
              </button>
            );
          })}
        </nav>

        {/* کاربر */}
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                account.role === 'superadmin'
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : account.role === 'admin'
                    ? 'border-amber/50 bg-amber/10 text-amber'
                    : 'border-line bg-raised text-muted'
              }`}
            >
              {account.role === 'superadmin' ? 'سوپر ادمین' : account.role === 'admin' ? 'ادمین' : 'کاربر'}
            </span>
            <span className="truncate font-bold" dir="ltr">
              {account.username}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:bg-raised hover:text-text"
          >
            خروج از حساب
          </button>
        </div>
      </aside>
    </>
  );
}
