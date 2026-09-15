import { useEffect, useMemo, useState } from 'react';
import { apiChangePassword, apiGetProgress, apiSetProgress } from '../api';
import type { PublicAccount } from '../types';
import { summarizeProgress } from '../types';
import CommentSection from '../components/CommentSection';

export type GuideView = 'home' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'appendix';

/** مسیرهای واقعی Share ویندوز که با کلیک در کلیپ‌بورد قرار می‌گیرند. */
const SHARE_LINKS = {
  elasticCourse: '\\\\ShareFolder\\mssp\\Ring 2 - Roadmap\\1 - Elastic Security for SIEM',
  elasticLogSemantics: '\\\\ShareFolder\\mssp\\Log Semantics\\Elastic',
  splunkFundamentals1: '\\\\ShareFolder\\mssp\\0-11-Splunk\\1-splunk\\Splunk Fundamentals 1 - Mohammad Ghanbari',
  splunkFundamentals2: '\\\\ShareFolder\\mssp\\0-11-Splunk\\1-splunk\\Splunk Fundamentals 2 - Mohammad Ghanbari',
  splunkEs: '\\\\ShareFolder\\mssp\\0-11-Splunk\\5- Splunk-ES Basiri',
  logSemantics: '\\\\ShareFolder\\mssp\\Log Semantics',
  sec450Handout: '\\\\ShareFolder\\mssp\\450\\SEC450 - Blue Team Fundamentals Security Operations and Analysis',
  sec450Lian: '\\\\ShareFolder\\mssp\\450',
  sec450Ravin: '\\\\ShareFolder\\mssp\\1-4-SOC Teir 1',
} as const;

interface Props {
  account: PublicAccount;
  view: GuideView;
  navigate: (v: GuideView) => void;
  /** نشانه pass-شده از مرکز اعلان برای هايلایت پیام */
  focusCommentId?: string | null;
  focusNonce?: number;
}

/** لینک اینترنتی را باز می‌کند و لینک Share داخلی را برای کپی آماده می‌کند. */
function L({ href, children }: { href: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">
        {children}
      </a>
    );
  }

  const copyShareLink = async () => {
    const shareUrl = /^\\\\/.test(href)
      ? href
      : `\\\\ShareFolder\\${href.replace(/^\/+/, '').replace(/\//g, '\\')}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = shareUrl;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3200);
  };

  return (
    <>
      <button type="button" className="guide-link share-link" onClick={() => void copyShareLink()} title="کپی لینک Share">
        {children}
      </button>
      {copied && (
        <span className="toast share-copy-toast" role="status" aria-live="polite">
          لینک کپی شد؛ آن را در Run یا مرورگر وارد کنید.
        </span>
      )}
    </>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-line bg-raised px-3 py-2 text-start text-xs font-bold text-muted">
    {children}
  </th>
);

function TRow({
  topic,
  learn,
  practice,
  taskKeys,
  progress,
  onMarkSeen,
}: {
  topic: string;
  learn: React.ReactNode;
  practice: React.ReactNode;
  taskKeys: string[];
  progress: Record<string, boolean>;
  onMarkSeen: (keys: string[]) => void;
}) {
  const seen = taskKeys.length > 0 && taskKeys.every((key) => progress[key] === true);
  return (
    <tr className={`border-b border-line align-top ${seen ? 'guide-row-seen' : ''}`}>
      <td className="break-words px-3 py-3 font-semibold">{topic}</td>
      <td className="px-3 py-3">{learn}</td>
      <td className="px-3 py-3">{practice}</td>
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

const PHASE_META: Array<{
  id: GuideView;
  no: string;
  title: string;
  pill: string;
  emoji: string;
  next: GuideView;
  nextLabel: string;
  prev: GuideView;
  prevLabel: string;
}> = [
  {
    id: 'phase-1',
    no: 'فاز ۱',
    title: 'آموزش SIEM',
    pill: 'بازه زمانی: ۲ هفته',
    emoji: '🧭',
    next: 'phase-2',
    nextLabel: 'فاز بعدی: آموزش شبکه',
    prev: 'home',
    prevLabel: '→ بازگشت به میز کار',
  },
  {
    id: 'phase-2',
    no: 'فاز ۲',
    title: 'آموزش شبکه',
    pill: 'بازه زمانی: ۲ هفته',
    emoji: '🌐',
    next: 'phase-3',
    nextLabel: 'فاز بعدی: آموزش Endpoint',
    prev: 'phase-1',
    prevLabel: '→ فاز قبلی',
  },
  {
    id: 'phase-3',
    no: 'فاز ۳',
    title: 'آموزش Endpoint',
    pill: 'بازه زمانی: ۱ هفته',
    emoji: '💻',
    next: 'phase-4',
    nextLabel: 'فاز بعدی: Onboarding',
    prev: 'phase-2',
    prevLabel: '→ فاز قبلی',
  },
  {
    id: 'phase-4',
    no: 'فاز ۴',
    title: 'Onboarding',
    pill: 'بازه زمانی: ۱ هفته',
    emoji: '🚀',
    next: 'appendix',
    nextLabel: 'مشاهده پیوست ۱',
    prev: 'phase-3',
    prevLabel: '→ فاز قبلی',
  },
];

function PhaseHeader({ meta, pct }: { meta: (typeof PHASE_META)[number]; pct: number }) {
  const hasProgress = meta.id !== 'phase-4';
  return (
    <header className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div>
          <p className="text-xs font-bold text-accent">
            {meta.no} <span className="font-medium text-muted">({meta.pill.replace('بازه زمانی: ', '')})</span>
          </p>
          <h1 className="text-xl font-extrabold">{meta.title}</h1>
        </div>
      </div>
      {hasProgress && <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">پیشرفت فاز</span>
          <span className={`font-bold ${pct === 100 ? 'text-ok' : 'text-accent'}`}>{pct}٪</span>
        </div>
        <ProgressBar pct={pct} />
      </div>}
    </header>
  );
}

function PhaseNav({ meta, navigate }: { meta: (typeof PHASE_META)[number]; navigate: (v: GuideView) => void }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
      <button
        onClick={() => navigate(meta.prev)}
        className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-semibold text-muted transition hover:text-accent"
      >
        {meta.prevLabel}
      </button>
      <button
        onClick={() => navigate(meta.next)}
        className="rounded-lg border-0 bg-accent px-5 py-2 text-sm font-extrabold text-ink transition hover:opacity-90"
      >
        {meta.nextLabel} ←
      </button>
    </div>
  );
}

/** 🏠 میز کار — خلاصه کل دوره و وضعیت کلی */
function HomeView({
  account,
  summary,
  navigate,
}: {
  account: PublicAccount;
  summary: ReturnType<typeof summarizeProgress>;
  navigate: (v: GuideView) => void;
}) {
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl">🏠</span>
          <div>
            <p className="text-xs font-bold text-accent">DASHBOARD</p>
            <h1 className="text-2xl font-extrabold">میز کار</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">
          خلاصه دوره آزمایشی و وضعیت کلی پیشرفت شما.
          با ثبت وضعیت منابع هر فاز، نوار پیشرفت به‌صورت زنده به‌روزرسانی می‌شود.
        </p>

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
          {PHASE_META.map((m) => {
            const s = summary.perPhase[m.id] ?? { done: 0, total: 0, pct: 0 };
            return (
              <button
                key={m.id}
                onClick={() => navigate(m.id)}
                className="rounded-xl border border-line bg-bg p-4 text-start transition hover:border-accent/60 hover:bg-raised"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-sm font-bold">
                    {m.no} — {m.title}
                  </span>
                  <span className="pill ms-auto">{m.pill.replace('بازه زمانی: ', '')}</span>
                </div>
                {m.id === 'phase-4' ? (
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
          <ul className="mt-2 space-y-1 text-xs leading-7 text-muted">
            <li>اکانت فعال در ماشین‌های Elastic و Splunk آزمایشگاه MSSP (برای تمرین)</li>
            <li>دسترسی پروژه‌های واقعی Elastic و Splunk (ارسال توسط کارشناس لایه ۳)</li>
            <li>جلسات ارزیابی نظری و عملی پایان هر فاز با کارشناس لایه ۳</li>
            <li>ورود منظم و ثبت پیشرفت در هر فاز تا پایان مهرماه</li>
          </ul>
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

export default function GuidePage({ account, view, navigate, focusCommentId, focusNonce }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiGetProgress().then((res) => setProgress(res.progress ?? {}));
  }, []);

  const markRowsSeen = (keys: string[]) => {
    setProgress((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      void apiSetProgress(next);
      return next;
    });
  };

  const summary = useMemo(() => summarizeProgress(progress), [progress]);
  const meta = PHASE_META.find((m) => m.id === view);

  if (view === 'home') return <HomeView account={account} summary={summary} navigate={navigate} />;
  if (view === 'appendix') return <AppendixView account={account} navigate={navigate} />;

  if (meta) {
    const pct = summary.perPhase[view]?.pct ?? 0;
    const bodyProps = {
      account,
      progress,
      markRowsSeen,
      focusCommentId,
      focusNonce,
    };
    return (
      <div className="space-y-5">
        <PhaseHeader meta={meta} pct={pct} />
        {view === 'phase-1' && <Phase1Body {...bodyProps} />}
        {view === 'phase-2' && <Phase2Body {...bodyProps} />}
        {view === 'phase-3' && <Phase3Body {...bodyProps} />}
        {view === 'phase-4' && <Phase4Body {...bodyProps} />}
        <PhaseNav meta={meta} navigate={navigate} />
      </div>
    );
  }

  return null;
}

interface BodyProps {
  account: PublicAccount;
  progress: Record<string, boolean>;
  markRowsSeen: (keys: string[]) => void;
  focusCommentId?: string | null;
  focusNonce?: number;
}

const WRAP = 'rounded-2xl border border-line bg-surface p-5 min-w-0';

/* ------------------------------------------------ فاز ۱: آموزش SIEM */
function Phase1Body({ account, progress, markRowsSeen, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۱</H3>
      <div className={PHASE_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
              <TH>وضعیت</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="مبانی تیم آبی و SOC"
              taskKeys={['p1-sec450']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={<>مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱</>}
              practice={<span className="text-muted">—</span>}
            />
            <TRow
              topic="آموزش استفاده از Elastic"
              taskKeys={['p1-elastic-course', 'p1-elastic-video1', 'p1-elastic-basics', 'p1-elastic-query']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <div className="space-y-2">
                  <div><L href={SHARE_LINKS.elasticCourse}>دوره آموزشی سایت Elastic</L></div>
                  <div><L href={SHARE_LINKS.elasticLogSemantics}>ویدئوی شماره یک ماژول Elastic از ویدئوهای Log Semantics</L></div>
                </div>
              }
              practice={
                <div className="space-y-2">
                  <div><L href="https://tryhackme.com/room/elasticstackthebasics">Elastic Stack: The Basics</L></div>
                  <div><L href="https://tryhackme.com/room/elasticquerylanguages">Elastic: Query Languages</L></div>
                </div>
              }
            />
            <TRow
              topic="آموزش استفاده از Splunk"
              taskKeys={['p1-splunk-fund1', 'p1-splunk-fund2-m10', 'p1-splunk-es-videos', 'p1-splunk-basics-room', 'p1-splunk-investigate']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <div className="space-y-2">
                  <div><L href={SHARE_LINKS.splunkFundamentals1}>دوره Splunk Fundamentals 1</L></div>
                  <div><L href={SHARE_LINKS.splunkFundamentals2}>ماژول ۱۰ دوره Splunk Fundamentals 2</L></div>
                  <div><L href={SHARE_LINKS.splunkEs}>ویدئوهای شماره ۱ و ۲ آموزش ES</L></div>
                </div>
              }
              practice={
                <div className="space-y-2">
                  <div><L href="https://tryhackme.com/room/splunk100">Splunk Basics - Did you SIEM?</L></div>
                  <div><L href="https://tryhackme.com/room/investigatingwithsplunk">Investigating with Splunk</L></div>
                </div>
              }
            />
          </tbody>
        </table>
      </div>

      <H3>روند ادامهٔ کار و ارزیابی فاز ۱</H3>
      <ul className="mt-2 space-y-1">
        <BULLET>دسترسی <L href="https://tryhackme.com">TryHackMe</L> از طرف کارشناس لایه سه ارسال خواهد شد.</BULLET>
        <BULLET>با آغاز این فاز دسترسی به ۴ ماشین SIEM به‌صورت آزمایشی برقرار خواهد شد؛ لطفاً برای تمرین از این ماشین‌ها استفاده کنید.</BULLET>
        <BULLET>دسترسی به Elastic و Splunk آزمایشگاه MSSP (<L href="/docs/mssp-lab-access-guide">راهنمای دسترسی</L>)</BULLET>
        <BULLET>دسترسی به یک پروژه Elastic و Splunk واقعی (توسط کارشناس لایه سه ارسال خواهد شد)</BULLET>
        <BULLET>پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.</BULLET>
      </ul>

      <CommentSection
        phase="phase-1"
        phaseTitle="فاز ۱"
        account={account}
        focusId={focusCommentId}
        focusNonce={focusNonce}
      />
    </section>
  );
}

/* ------------------------------------------------ فاز ۲: آموزش شبکه */
function Phase2Body({ account, progress, markRowsSeen, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۲</H3>
      <div className={PHASE_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
              <TH>وضعیت</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="تشخیص تهدیدات شبکه"
              taskKeys={['p2-sec450-net', 'p2-net-video', 'p2-wireshark', 'p2-nsm']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <>
                  <div>مطابق با سرفصل ارائه شده SANS SEC 450 در پیوست ۱</div>
                  <div><L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L></div>
                </>
              }
              practice={
                <>
                  <div><L href="https://tryhackme.com/room/wiresharktrafficanalysis">Wireshark: Traffic Analysis</L></div>
                  <div><L href="https://tryhackme.com/module/network-security-monitoring">Network Security Monitoring (except Snort)</L></div>
                </>
              }
            />
            <TRow
              topic="تشخیص تهدیدات DNS"
              taskKeys={['p2-dns']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                </>
              }
              practice={<span className="text-muted">—</span>}
            />
            <TRow
              topic="تشخیص تهدیدات Web"
              taskKeys={['p2-web', 'p2-foundations']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  <br />
                  <L href="/portal/soc-t1-d-foundations">مسیر Soc T1 D – Foundations در پرتال آموزشی</L>
                </>
              }
              practice={<span className="text-muted">—</span>}
            />
          </tbody>
        </table>
      </div>

      <H3>روند ادامهٔ کار و ارزیابی فاز ۲</H3>
      <ul className="mt-2 space-y-1">
        <BULLET>
          دسترسی <L href="https://tryhackme.com">TryHackMe</L> و <L href="/portal">پرتال آموزشی</L> از طرف کارشناس لایه سه ارسال خواهد شد.
        </BULLET>
        <BULLET>لطفاً در حین یادگیری، روی پروژه‌های واقعی نیز یوزکیس‌های آموزش‌داده‌شده بررسی شوند و موارد مشکوک مشاهده‌شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آیند.</BULLET>
        <BULLET>پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.</BULLET>
      </ul>

      <CommentSection
        phase="phase-2"
        phaseTitle="فاز ۲"
        account={account}
        focusId={focusCommentId}
        focusNonce={focusNonce}
      />
    </section>
  );
}

/* ------------------------------------------------ فاز ۳: آموزش Endpoint */
function Phase3Body({ account, progress, markRowsSeen, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۳</H3>
      <div className={PHASE_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
              <TH>وضعیت</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="تشخیص تهدیدات ویندوز"
              taskKeys={['p3-win-sysmon', 'p3-win-video', 'p3-win-mon']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <L href="/tools/sysmon-guide">Sysmon</L>
                  <br />
                  <L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                </>
              }
              practice={
                <L href="https://tryhackme.com/module/windows-security-monitoring">Windows Security Monitoring</L>
              }
            />
            <TRow
              topic="تشخیص تهدیدات لینوکس"
              taskKeys={['p3-linux', 'p3-linux-mon']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                </>
              }
              practice={
                <L href="https://tryhackme.com/module/linux-security-monitoring">Linux Security Monitoring</L>
              }
            />
            <TRow
              topic="بررسی هشدارهای HIDPS"
              taskKeys={['p3-hidps-video']}
              progress={progress}
              onMarkSeen={markRowsSeen}
              learn={<L href={SHARE_LINKS.logSemantics}>ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>}
              practice={<span className="text-muted">—</span>}
            />
          </tbody>
        </table>
      </div>

      <H3>روند ادامهٔ کار و ارزیابی فاز ۳</H3>
      <ul className="mt-2 space-y-1">
        <BULLET>دسترسی <L href="https://tryhackme.com">TryHackMe</L> از طرف کارشناس لایه سه ارسال خواهد شد.</BULLET>
        <BULLET>لطفاً در حین یادگیری، روی پروژه‌های واقعی نیز یوزکیس‌های آموزش‌داده‌شده بررسی شوند و موارد مشکوک مشاهده‌شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آیند.</BULLET>
        <BULLET>در این فاز چند سناریوی عملی نیز توسط کارشناس لایه سه ارسال خواهند شد. این سناریوها بایستی در محیط آزمایشگاه پیاده‌سازی شده و نتیجه آن در قالب گزارش به کارشناس لایه سه ارسال گردد. این گزارش بخشی از مرحله ارزیابی این فاز به حساب می‌آید.</BULLET>
        <BULLET>پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.</BULLET>
      </ul>

      <CommentSection
        phase="phase-3"
        phaseTitle="فاز ۳"
        account={account}
        focusId={focusCommentId}
        focusNonce={focusNonce}
      />
    </section>
  );
}

/* ------------------------------------------------ فاز ۴: Onboarding */
function Phase4Body({ account, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>شرح فرآیندها و آموزش‌ها</H3>
      <ul className="space-y-1">
        <BULLET>در این فاز روندها و فرآیندهای تکمیلی و سیاست‌های رصد و پایش مختص پروژه‌های رینگ توسط کارشناس لایه دو و مدیر سرویس رینگ مربوطه آموزش داده خواهد شد.</BULLET>
        <BULLET>در این فاز دسترسی پروژه‌های رینگ از طرف کارشناس لایه دو و مدیر سرویس ارسال خواهد شد.</BULLET>
        <BULLET>
          ارزیابی این فاز توسط کارشناس لایه دو و مدیر سرویس رینگ بر پایه{' '}
          <strong className="text-accent">OKRهای</strong> زیر صورت خواهد پذیرفت.
        </BULLET>
      </ul>

      <H3>روند ارزیابی و OKRهای فاز ۴</H3>
      <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 pe-1 text-sm">
        <li>
          <strong>OKR 1:</strong> رصد و پایش هر پروژه حداقل به اندازه یک شیفت اداری
        </li>
        <li>
          <strong>OKR 2:</strong> ثبت یک تیکت Security Event به ازای هر پروژه در سامانه جیرا
        </li>
        <li>
          <strong>OKR 3:</strong> ثبت حداقل یک تیکت Fine Tuning به ازای هر فناوری SIEM (یک تیکت برای Elastic و یک تیکت برای Splunk) در سامانه جیرا
        </li>
      </ol>

      <CommentSection
        phase="phase-4"
        phaseTitle="فاز ۴"
        account={account}
        focusId={focusCommentId}
        focusNonce={focusNonce}
      />
    </section>
  );
}

/* ------------------------------------------------ پیوست ۱ */
function AppendixView({ account, navigate }: { account: PublicAccount; navigate: (v: GuideView) => void }) {
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl">📑</span>
          <div>
            <p className="text-xs font-bold text-accent">APPENDIX ۱</p>
            <h1 className="text-xl font-extrabold">پیوست ۱: مراجع SANS SEC450</h1>
          </div>
          <span className="pill ms-auto">مرجع</span>
        </div>
      </header>

      <section className={WRAP}>
        <H3>جدول تطبیقی جلسات، جزوات و ویدئوهای لیان و راوین</H3>
        <Sec450Table />

        <H3>منابع و دانلودها</H3>
        <P>
          بنا به تشخیص و صلاح‌دید می‌توانید جهت تکمیل دوره ۴۵۰ از یکی از منابع ذکر شده استفاده کنید:
        </P>
        <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 pe-1 text-sm leading-8">
          <li>
            <L href={SHARE_LINKS.sec450Handout}>دانلود جزوه و اسلایدهای دوره</L>
          </li>
          <li>
            <L href={SHARE_LINKS.sec450Lian}>دانلود ویدئوهای دوره - موسسه لیان</L>
          </li>
          <li>
            <L href={SHARE_LINKS.sec450Ravin}>دانلود ویدئوهای دوره - موسسه راوین</L>
          </li>
        </ol>

        <div className="mt-5">
          <NOTE>
            <strong className="text-text">نکته تمرین در منزل:</strong> جهت تمرین‌های تکمیلی دوره،
            ماشین مجازی (VM) دوره در منزل در اختیار شما قرار می‌گیرد. برای هماهنگی دریافت آن با
            کارشناس لایه ۳ هماهنگ کنید.
          </NOTE>
        </div>
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

function Sec450Table() {
  return (
    <div className={`${TABLE_WRAP} guide-four-column-table`}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <TH>مبحث</TH>
            <TH>جزوه</TH>
            <TH>ویدئو (لیان)</TH>
            <TH>ویدئو (راوین)</TH>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <td className="px-3 py-3 font-semibold">مبانی تیم آبی و SOC</td>
            <td className="px-3 py-3">شماره ۱ (از صفحه ۵ تا ۵۱)</td>
            <td className="px-3 py-3">شماره ۱</td>
            <td className="px-3 py-3">—</td>
          </tr>
          <tr className="border-b border-line">
            <td className="px-3 py-3 font-semibold">تشخیص تهدیدات شبکه</td>
            <td className="px-3 py-3">شماره ۲ (از صفحه ۷ تا ۳۶)</td>
            <td className="px-3 py-3">شماره ۳ (از دقیقه ۱:۱۳ تا پایان)</td>
            <td className="px-3 py-3">
              • روز ۲ بخش ۴ (از ابتدا تا دقیقه ۱:۰۰)
              <br />• روز ۵ بخش ۲ (از ابتدا تا دقیقه ۰:۳۳)
            </td>
          </tr>
          <tr className="border-b border-line">
            <td className="px-3 py-3 font-semibold">تشخیص تهدیدات DNS</td>
            <td className="px-3 py-3">شماره ۲ (از صفحه ۳۷ تا ۹۳)</td>
            <td className="px-3 py-3">شماره ۴</td>
            <td className="px-3 py-3">از روز ۲ بخش ۴ دقیقه ۱:۱۵ تا پایان روز ۳ بخش ۳</td>
          </tr>
          <tr>
            <td className="px-3 py-3 font-semibold">تشخیص تهدیدات Web</td>
            <td className="px-3 py-3">شماره ۲ (از صفحه ۹۴ تا ۱۵۰)</td>
            <td className="px-3 py-3">شماره ۵</td>
            <td className="px-3 py-3">
              • روز ۳ بخش ۴ (از ابتدا تا دقیقه ۰:۵۰)
              <br />• روز ۴ بخش ۱ و ۲
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
