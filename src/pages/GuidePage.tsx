import { useEffect, useMemo, useState } from 'react';
import { apiChangePassword, apiGetContent, apiGetProgress, apiSetProgress } from '../api';
import type { PublicAccount } from '../types';
import CommentSection from '../components/CommentSection';
import RichText, { SmartLink } from '../components/RichText';
import type { ContentBlock, PageContent, PageId, SiteContent } from '../contentTypes';
import { summarizeWithKeys, taskKeysOfContent } from '../contentTypes';
import { DEFAULT_CONTENT } from '../defaultContent';

export type GuideView = 'home' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'appendix';

interface Props {
  account: PublicAccount;
  view: GuideView;
  navigate: (v: GuideView) => void;
  focusCommentId?: string | null;
  focusNonce?: number;
}

const PHASE_ORDER: PageId[] = ['phase-1', 'phase-2', 'phase-3', 'phase-4'];
const PHASE_EMOJI_FALLBACK: Record<string, string> = {
  'phase-1': '🧭',
  'phase-2': '🌐',
  'phase-3': '💻',
  'phase-4': '🚀',
};

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-line bg-raised px-3 py-2 text-start text-xs font-bold text-muted">
    {children}
  </th>
);

const P = ({ children }: { children: React.ReactNode }) => <p className="text-sm leading-8">{children}</p>;

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-7 flex items-center gap-2 text-base font-bold">
    <span className="inline-block h-4 w-1 rounded bg-accent" />
    {children}
  </h3>
);

const BULLET = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5 leading-8">
    <span className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
    <span className="min-w-0 flex-1 break-words">{children}</span>
  </li>
);

const NOTE = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-line bg-raised px-4 py-3 text-sm leading-7 text-muted">
    {children}
  </p>
);

const TABLE_WRAP = 'table-wrap guide-table overflow-x-auto rounded-xl border border-line';
const PHASE_TABLE_WRAP = `${TABLE_WRAP} phase-resource-table`;

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      className="progress-track w-full"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

const WRAP = 'rounded-2xl border border-line bg-surface p-5 min-w-0';

/* ---------------- رندر بلوک‌ها ---------------- */

function ResourceRow({
  cells,
  taskKeys,
  progress,
  onMarkSeen,
}: {
  cells: string[];
  taskKeys: string[];
  progress: Record<string, boolean>;
  onMarkSeen: (keys: string[]) => void;
}) {
  const seen = taskKeys.length > 0 && taskKeys.every((k) => progress[k] === true);
  return (
    <tr className={`border-b border-line align-top ${seen ? 'guide-row-seen' : ''}`}>
      {cells.map((c, i) => (
        <td key={i} className="break-words px-3 py-3">
          <RichText text={c} />
        </td>
      ))}
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          className={`seen-button ${seen ? 'is-seen' : ''}`}
          onClick={() => onMarkSeen(taskKeys)}
          aria-pressed={seen}
        >
          {seen ? 'مشاهده شد ✓' : 'مشاهده شد'}
        </button>
      </td>
    </tr>
  );
}

function BlocksRenderer({
  blocks,
  progress,
  onMarkSeen,
}: {
  blocks: ContentBlock[];
  progress: Record<string, boolean>;
  onMarkSeen: (keys: string[]) => void;
}) {
  return (
    <>
      {blocks.map((b) => {
        switch (b.type) {
          case 'section-title':
            return <H3 key={b.id}>{b.text}</H3>;
          case 'paragraph':
            return (
              <P key={b.id}>
                <RichText text={b.text} />
              </P>
            );
          case 'note':
            return (
              <div key={b.id} className="mt-5">
                <NOTE>
                  <RichText text={b.text} />
                </NOTE>
              </div>
            );
          case 'bullets':
            return (
              <ul key={b.id} className="mt-2 space-y-1">
                {b.items.map((it, i) => (
                  <BULLET key={i}>
                    <RichText text={it} />
                  </BULLET>
                ))}
              </ul>
            );
          case 'numbered':
            return (
              <ol key={b.id} className="mt-2 flex list-decimal flex-col gap-1 ps-5 pe-1 text-sm leading-8">
                {b.items.map((it, i) => (
                  <li key={i}>
                    <RichText text={it} />
                  </li>
                ))}
              </ol>
            );
          case 'links':
            return (
              <div key={b.id} className="mt-4">
                {b.title && <H3>{b.title}</H3>}
                <div className="flex flex-col gap-2">
                  {b.items.map((l, i) => (
                    <div key={i} className="text-sm">
                      <SmartLink href={l.href}>{l.label}</SmartLink>
                    </div>
                  ))}
                </div>
              </div>
            );
          case 'simple-table': {
            const colCount = b.headers.length;
            return (
              <div key={b.id}>
                {b.title && <H3>{b.title}</H3>}
                <div className={`${TABLE_WRAP} guide-four-column-table`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {b.headers.map((h, i) => (
                          <TH key={i}>{h}</TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r, ri) => (
                        <tr key={ri} className="border-b border-line">
                          {r.cells.slice(0, colCount).map((c, ci) => (
                            <td key={ci} className="px-3 py-3">
                              <RichText text={c} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
          case 'resource-table': {
            return (
              <div key={b.id}>
                {b.title && <H3>{b.title}</H3>}
                <div className={PHASE_TABLE_WRAP}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {b.headers.map((h, i) => (
                          <TH key={i}>{h}</TH>
                        ))}
                        <TH>وضعیت</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r, ri) => (
                        <ResourceRow
                          key={ri}
                          cells={r.cells.slice(0, b.headers.length)}
                          taskKeys={r.taskKeys}
                          progress={progress}
                          onMarkSeen={onMarkSeen}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}

/* ---------------- هدر فاز ---------------- */

function PhaseHeader({ page, phaseId, pct }: { page: PageContent; phaseId: string; pct: number }) {
  const emoji = page.headerEmoji || PHASE_EMOJI_FALLBACK[phaseId] || '📚';
  const hasProgress = pct !== -1;
  return (
    <header className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-xs font-bold text-accent">
            {page.headerKicker || ''}{' '}
            {page.headerPill && <span className="font-medium text-muted">({page.headerPill})</span>}
          </p>
          <h1 className="text-xl font-extrabold">{page.headerTitle}</h1>
        </div>
      </div>
      {hasProgress && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">پیشرفت فاز</span>
            <span className={`font-bold ${pct === 100 ? 'text-ok' : 'text-accent'}`}>{pct}٪</span>
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}
    </header>
  );
}

function PhaseNav({
  prev,
  prevLabel,
  next,
  nextLabel,
  navigate,
}: {
  prev: GuideView;
  prevLabel: string;
  next: GuideView;
  nextLabel: string;
  navigate: (v: GuideView) => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
      <button
        onClick={() => navigate(prev)}
        className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-semibold text-muted transition hover:text-accent"
      >
        {prevLabel}
      </button>
      <button
        onClick={() => navigate(next)}
        className="rounded-lg border-0 bg-accent px-5 py-2 text-sm font-extrabold text-ink transition hover:opacity-90"
      >
        {nextLabel} ←
      </button>
    </div>
  );
}

/* ---------------- میز کار ---------------- */

function HomeView({
  account,
  content,
  summary,
  navigate,
}: {
  account: PublicAccount;
  content: SiteContent;
  summary: ReturnType<typeof summarizeWithKeys>;
  navigate: (v: GuideView) => void;
}) {
  const page = content.pages.home;
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl">{page.headerEmoji || '🏠'}</span>
          <div>
            <p className="text-xs font-bold text-accent">{page.headerKicker || 'DASHBOARD'}</p>
            <h1 className="text-2xl font-extrabold">{page.headerTitle || content.menus.home}</h1>
          </div>
        </div>
        {page.blocks.filter((b) => b.type === 'paragraph').length > 0 && (
          <div className="mt-3 text-sm leading-7 text-muted">
            {page.blocks
              .filter((b) => b.type === 'paragraph')
              .map((b) =>
                b.type === 'paragraph' ? (
                  <p key={b.id} className="mt-1 text-sm leading-7 text-muted">
                    <RichText text={b.text} />
                  </p>
                ) : null,
              )}
          </div>
        )}

        <div className="mt-5 rounded-xl border border-line bg-bg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold">پیشرفت سراسری کل دوره</span>
            <span className="text-lg font-extrabold text-accent">{summary.total.pct}٪</span>
          </div>
          <div className="mt-2">
            <ProgressBar pct={summary.total.pct} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {summary.total.done} از {summary.total.total} منبع مشاهده شده است.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {PHASE_ORDER.map((pid) => {
            const s = summary.perPhase[pid] ?? { done: 0, total: 0, pct: 0 };
            const pg = content.pages[pid];
            return (
              <button
                key={pid}
                onClick={() => navigate(pid as GuideView)}
                className="rounded-xl border border-line bg-bg p-4 text-start transition hover:border-accent/60 hover:bg-raised"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">{pg.headerEmoji || PHASE_EMOJI_FALLBACK[pid]}</span>
                  <span className="text-sm font-bold">{content.menus[pid]}</span>
                  {pg.headerPill && <span className="pill ms-auto">{pg.headerPill}</span>}
                </div>
                {s.total === 0 ? (
                  <p className="mt-3 text-[11px] text-muted">این فاز پایش پیشرفت ندارد.</p>
                ) : (
                  <>
                    <div className="mt-3">
                      <ProgressBar pct={s.pct} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {s.done}/{s.total} منبع · {s.pct}٪
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <h2 className="text-sm font-extrabold text-accent">پرونده پیشنهادی شما</h2>
          <div className="mt-2 text-xs leading-7 text-muted">
            {page.blocks
              .filter((b) => b.type === 'bullets' || b.type === 'numbered')
              .map((b) =>
                b.type === 'bullets' || b.type === 'numbered' ? (
                  <ul key={b.id} className="mt-2 space-y-1">
                    {b.items.map((it, i) => (
                      <li key={i}>
                        <RichText text={it} />
                      </li>
                    ))}
                  </ul>
                ) : null,
              )}
          </div>
          <button
            onClick={() => navigate('phase-1')}
            className="mt-3 w-full rounded-lg border-0 bg-accent px-4 py-2.5 text-sm font-extrabold text-ink transition hover:opacity-90"
          >
            ورود به فاز ۱ ←
          </button>
        </div>
      </header>
      <ChangeOwnPassword />
      <p className="text-xs text-muted">
        کاربر: <strong className="text-text">{account.username}</strong> · نقش:{' '}
        {account.role === 'superadmin' ? 'سوپر ادمین' : account.role === 'admin' ? 'ادمین' : 'کاربر'}
      </p>
    </div>
  );
}

function ChangeOwnPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      if (res.error) {
        setError(res.error);
      } else {
        setMessage(String(res.message ?? 'رمز عبور با موفقیت تغییر کرد.'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        تغییر رمز عبور
      </h2>
      <p className="mb-4 text-xs text-muted">برای تغییر رمز، ابتدا رمز فعلی حساب خود را وارد کنید.</p>
      {message && <p className="mb-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">{message}</p>}
      {error && <p className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      <form onSubmit={submit} autoComplete="off" className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">رمز فعلی</span>
          <input
            dir="ltr"
            name="current-password"
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">رمز جدید</span>
          <input
            dir="ltr"
            name="new-password"
            autoComplete="new-password"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">تکرار رمز جدید</span>
          <input
            dir="ltr"
            name="confirm-password"
            autoComplete="new-password"
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <div className="md:col-span-3 md:flex md:justify-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border-0 bg-accent px-5 py-2.5 font-bold text-ink transition hover:opacity-90 disabled:opacity-50 md:w-auto"
          >
            {busy ? 'در حال ذخیره…' : 'ذخیره رمز جدید'}
          </button>
        </div>
      </form>
    </section>
  );
}

interface BodyProps {
  account: PublicAccount;
  content: SiteContent;
  page: PageContent;
  progress: Record<string, boolean>;
  markRowsSeen: (keys: string[]) => void;
  focusCommentId?: string | null;
  focusNonce?: number;
}

function PhaseBody({ account, page, progress, markRowsSeen, focusCommentId, focusNonce, phaseId }: BodyProps & { phaseId: string }) {
  return (
    <section className={WRAP}>
      <BlocksRenderer blocks={page.blocks} progress={progress} onMarkSeen={markRowsSeen} />
      <CommentSection
        phase={phaseId}
        phaseTitle={page.headerTitle}
        account={account}
        focusId={focusCommentId}
        focusNonce={focusNonce}
      />
    </section>
  );
}

export default function GuidePage({ account, view, navigate, focusCommentId, focusNonce }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    apiGetProgress().then((res) => setProgress(res.progress ?? {}));
  }, []);

  useEffect(() => {
    apiGetContent().then((res) => {
      if (res.content) {
        // ادغام با پیش‌فرض برای مقاومت در برابر نسخه‌های قدیمی
        const merged: SiteContent = {
          menus: { ...DEFAULT_CONTENT.menus, ...(res.content.menus ?? {}) },
          pages: { ...DEFAULT_CONTENT.pages },
        };
        for (const pid of Object.keys(DEFAULT_CONTENT.pages) as PageId[]) {
          const incoming = (res.content.pages as Record<string, PageContent>)[pid];
          if (incoming && typeof incoming === 'object' && Array.isArray(incoming.blocks)) {
            merged.pages[pid] = {
              headerTitle: incoming.headerTitle || DEFAULT_CONTENT.pages[pid].headerTitle,
              headerKicker: incoming.headerKicker ?? DEFAULT_CONTENT.pages[pid].headerKicker,
              headerPill: incoming.headerPill ?? DEFAULT_CONTENT.pages[pid].headerPill,
              headerEmoji: incoming.headerEmoji ?? DEFAULT_CONTENT.pages[pid].headerEmoji,
              blocks: incoming.blocks,
            };
          }
        }
        setContent(merged);
        setIsCustom(!!res.isCustom);
      } else {
        setContent(DEFAULT_CONTENT);
        setIsCustom(false);
      }
    });
  }, []);

  const keysByPhase = useMemo(() => taskKeysOfContent(content), [content]);

  const markRowsSeen = (keys: string[]) => {
    setProgress((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      void apiSetProgress(next);
      return next;
    });
  };

  const summary = useMemo(() => summarizeWithKeys(progress, keysByPhase), [progress, keysByPhase]);

  if (view === 'home')
    return (
      <div>
        {isCustom && (
          <p className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[11px] text-muted">
            محتوای اختصاصی ادمین شما نمایش داده می‌شود.
          </p>
        )}
        <HomeView account={account} content={content} summary={summary} navigate={navigate} />
      </div>
    );
  if (view === 'appendix') {
    const page = content.pages.appendix;
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl">{page.headerEmoji || '📑'}</span>
            <div>
              <p className="text-xs font-bold text-accent">{page.headerKicker || 'APPENDIX ۱'}</p>
              <h1 className="text-xl font-extrabold">{page.headerTitle}</h1>
            </div>
            <span className="pill ms-auto">مرجع</span>
          </div>
        </header>
        <section className={WRAP}>
          <BlocksRenderer blocks={page.blocks} progress={progress} onMarkSeen={markRowsSeen} />
        </section>
        <div className="flex justify-start border-t border-line pt-5">
          <button
            onClick={() => navigate('phase-4')}
            className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-semibold text-muted transition hover:text-accent"
          >
            → فاز قبلی
          </button>
        </div>
      </div>
    );
  }

  const order: GuideView[] = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix'];
  const idx = order.indexOf(view);
  const page = content.pages[view as PageId];
  if (!page) return null;
  const pct = summary.perPhase[view]?.pct;
  const showPct = typeof pct === 'number' && (keysByPhase[view]?.length ?? 0) > 0;
  const prev = order[Math.max(0, idx - 1)];
  const next = order[Math.min(order.length - 1, idx + 1)];

  return (
    <div className="space-y-5">
      {isCustom && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[11px] text-muted">
          محتوای اختصاصی ادمین شما نمایش داده می‌شود.
        </p>
      )}
      <PhaseHeader page={page} phaseId={view} pct={showPct ? (pct as number) : -1} />
      <PhaseBody
        account={account}
        content={content}
        page={page}
        progress={progress}
        markRowsSeen={markRowsSeen}
        focusCommentId={focusCommentId}
        focusNonce={focusNonce}
        phaseId={view}
      />
      <PhaseNav
        prev={prev}
        prevLabel={prev === 'home' ? '→ بازگشت به میز کار' : '→ فاز قبلی'}
        next={next}
        nextLabel={next === 'appendix' ? 'مشاهده پیوست ۱' : `فاز بعدی`}
        navigate={navigate}
      />
    </div>
  );
}
