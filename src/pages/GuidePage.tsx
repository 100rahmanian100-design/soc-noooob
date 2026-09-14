import { useEffect, useMemo, useState } from 'react';
import { apiGetProgress, apiSetProgress } from '../api';
import type { PublicAccount } from '../types';
import { summarizeProgress } from '../types';
import CommentSection from '../components/CommentSection';

export type GuideView = 'home' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'appendix';

interface Props {
  account: PublicAccount;
  view: GuideView;
  navigate: (v: GuideView) => void;
  /** نشانه pass-شده از مرکز اعلان برای هايلایت پیام */
  focusCommentId?: string | null;
  focusNonce?: number;
}

/** لینک خارجی — با متن‌های مشخص‌شده در دوره، در برگه جدید */
function L({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">
      {children}
    </a>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-line bg-raised px-3 py-2 text-start text-xs font-bold text-muted">
    {children}
  </th>
);

function TRow({ topic, learn, practice }: { topic: string; learn: React.ReactNode; practice: React.ReactNode }) {
  return (
    <tr className="border-b border-line align-top">
      <td className="whitespace-nowrap px-3 py-3 font-semibold">{topic}</td>
      <td className="px-3 py-3">{learn}</td>
      <td className="px-3 py-3">{practice}</td>
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
    <span>{children}</span>
  </li>
);

const NOTE = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-line bg-raised px-4 py-3 text-sm leading-7 text-muted">
    {children}
  </p>
);

const TABLE_WRAP = 'overflow-x-auto rounded-xl border border-line';

function Task({
  k,
  checked,
  onToggle,
  inline = false,
  children,
}: {
  k: string;
  checked: boolean;
  onToggle: (k: string) => void;
  inline?: boolean;
  children: React.ReactNode;
}) {
  const box = (
    <>
      <input
        id={`task-${k}`}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(k)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-[oklch(85%_0.135_112)]"
      />
      <label htmlFor={`task-${k}`} className={`cursor-pointer ${checked ? 'text-muted line-through' : ''}`}>
        {children}
      </label>
    </>
  );
  if (inline) return <span className="inline-flex items-start gap-2.5 leading-8">{box}</span>;
  return <li className="flex items-start gap-2.5 leading-8">{box}</li>;
}

/** چک‌باکس کنار هر دوره/تمرین — کاربر وقتی منبع را دید یا انجام داد تیک می‌زند */
function Ck({
  k,
  checked,
  onToggle,
  children,
}: {
  k: string;
  checked: boolean;
  onToggle: (k: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-start gap-2 align-top">
      <input
        id={`task-${k}`}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(k)}
        className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer bg-transparent p-0 accent-[oklch(85%_0.135_112)]"
      />
      <label
        htmlFor={`task-${k}`}
        className={`m-0 inline cursor-pointer leading-7 ${checked ? 'text-muted line-through' : ''}`}
      >
        {children}
      </label>
    </span>
  );
}

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
    title: 'آموزش ابزارهای SIEM',
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
    nextLabel: 'فاز بعدی: Onboarding و OKRها',
    prev: 'phase-2',
    prevLabel: '→ فاز قبلی',
  },
  {
    id: 'phase-4',
    no: 'فاز ۴',
    title: 'Onboarding و OKRها',
    pill: 'بازه زمانی: ۱ هفته',
    emoji: '🚀',
    next: 'appendix',
    nextLabel: 'مشاهده پیوست ۱',
    prev: 'phase-3',
    prevLabel: '→ فاز قبلی',
  },
];

function PhaseHeader({ meta, pct }: { meta: (typeof PHASE_META)[number]; pct: number }) {
  return (
    <header className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div>
          <p className="text-xs font-bold text-accent">{meta.no}</p>
          <h1 className="text-xl font-extrabold">{meta.title}</h1>
        </div>
        <span className="pill ms-auto">{meta.pill}</span>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">پیشرفت فاز</span>
          <span className={`font-bold ${pct === 100 ? 'text-ok' : 'text-accent'}`}>{pct}٪</span>
        </div>
        <ProgressBar pct={pct} />
      </div>
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
          خلاصه دوره آزمایشی <strong className="text-text">(شهریور – مهر)</strong> و وضعیت کلی پیشرفت شما.
          با تکمیل چک‌لیست‌های هر فاز، نوار پیشرفت به‌صورت زنده به‌روزرسانی می‌شود.
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
            {summary.total.done} از {summary.total.total} تسک تکمیل شده است.
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
                <div className="mt-3">
                  <ProgressBar pct={s.pct} />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {s.done}/{s.total} تسک · {s.pct}٪
                </p>
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
      <p className="text-xs text-muted">
        کاربر: <strong className="text-text">{account.username}</strong> · نقش:{' '}
        {account.role === 'superadmin' ? 'سوپر ادمین' : account.role === 'admin' ? 'ادمین' : 'کاربر'}
      </p>
    </div>
  );
}

export default function GuidePage({ account, view, navigate, focusCommentId, focusNonce }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiGetProgress().then((res) => setProgress(res.progress ?? {}));
  }, []);

  const toggle = (k: string) => {
    setProgress((prev) => {
      const next = { ...prev, [k]: !prev[k] };
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
      toggle,
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
  toggle: (k: string) => void;
  focusCommentId?: string | null;
  focusNonce?: number;
}

const WRAP = 'rounded-2xl border border-line bg-surface p-5';

/* ------------------------------------------------ فاز ۱: آموزش SIEM */
function Phase1Body({ account, progress, toggle, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۱</H3>
      <div className={TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="مبانی تیم آبی و SOC"
              learn={
                <Ck k="p1-sec450" checked={!!progress['p1-sec450']} onToggle={toggle}>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                </Ck>
              }
              practice={<span className="text-muted">—</span>}
            />
            <TRow
              topic="آموزش استفاده از Elastic"
              learn={
                <>
                  <Ck k="p1-elastic-course" checked={!!progress['p1-elastic-course']} onToggle={toggle}>
                    <L href="https://www.elastic.co/training/free">دوره آموزشی سایت Elastic</L>
                  </Ck>
                  <br />
                  <Ck k="p1-elastic-video1" checked={!!progress['p1-elastic-video1']} onToggle={toggle}>
                    <L href="/courses/elastic-log-semantics-m1">ویدئوی شماره یک ماژول Elastic از ویدئوهای Log Semantics</L>
                  </Ck>
                </>
              }
              practice={
                <>
                  <Ck k="p1-elastic-basics" checked={!!progress['p1-elastic-basics']} onToggle={toggle}>
                    <L href="https://tryhackme.com/room/elasticstackthebasics">Elastic Stack: The Basics</L>
                  </Ck>
                  <br />
                  <Ck k="p1-elastic-query" checked={!!progress['p1-elastic-query']} onToggle={toggle}>
                    <L href="https://tryhackme.com/room/elasticquerylanguages">Elastic: Query Languages</L>
                  </Ck>
                </>
              }
            />
            <TRow
              topic="آموزش استفاده از Splunk"
              learn={
                <>
                  <Ck k="p1-splunk-fund1" checked={!!progress['p1-splunk-fund1']} onToggle={toggle}>
                    <L href="https://www.splunk.com/en_us/training/free-courses/splunk-fundamentals-1.html">دوره Splunk Fundamentals 1</L>
                  </Ck>
                  <br />
                  <Ck k="p1-splunk-fund2-m10" checked={!!progress['p1-splunk-fund2-m10']} onToggle={toggle}>
                    <L href="/courses/splunk-fundamentals-2-m10">ماژول ۱۰ دوره Splunk Fundamentals 2</L>
                  </Ck>
                  <br />
                  <Ck k="p1-splunk-es-videos" checked={!!progress['p1-splunk-es-videos']} onToggle={toggle}>
                    <L href="/courses/splunk-es-part1-2">ویدئوهای شماره ۱ و ۲ آموزش ES</L>
                  </Ck>
                </>
              }
              practice={
                <>
                  <Ck k="p1-splunk-basics-room" checked={!!progress['p1-splunk-basics-room']} onToggle={toggle}>
                    <L href="https://tryhackme.com/room/splunk100">Splunk Basics - Did you SIEM?</L>
                  </Ck>
                  <br />
                  <Ck k="p1-splunk-investigate" checked={!!progress['p1-splunk-investigate']} onToggle={toggle}>
                    <L href="https://tryhackme.com/room/investigatingwithsplunk">Investigating with Splunk</L>
                  </Ck>
                </>
              }
            />
          </tbody>
        </table>
      </div>

      <H3>تسک‌های عملی فاز ۱ (۲ هفته)</H3>
      <p className="muted small" style={{ margin: '4px 0 0' }}>
        دوره‌ها و تمرین‌های بالا در جدول تیک می‌خورند؛ تسک‌های عملی زیر هم جداگانه قابل تیک‌زدن
        هستند.
      </p>
      <ul className="mt-2 space-y-1">
        <Task k="p1-lab-access" checked={!!progress['p1-lab-access']} onToggle={toggle}>
          راه‌اندازی و اتصال به ماشین‌های Elastic و Splunk آزمایشگاه MSSP{' '}
          (<L href="/docs/mssp-lab-access-guide">راهنمای دسترسی</L>)
        </Task>
        <Task k="p1-real-project" checked={!!progress['p1-real-project']} onToggle={toggle}>
          اتصال و تمرین روی پروژه Elastic و Splunk واقعی ارسال‌شده توسط کارشناس لایه ۳
        </Task>
        <Task k="p1-review" checked={!!progress['p1-review']} onToggle={toggle}>
          شرکت در جلسه ارزیابی تئوری و عملی پایان فاز با کارشناس لایه ۳
        </Task>
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
function Phase2Body({ account, progress, toggle, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۲</H3>
      <div className={TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="تشخیص تهدیدات شبکه"
              learn={
                <>
                  <Ck k="p2-sec450-net" checked={!!progress['p2-sec450-net']} onToggle={toggle}>
                    مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  </Ck>
                  <br />
                  <Ck k="p2-net-video" checked={!!progress['p2-net-video']} onToggle={toggle}>
                    <L href="/courses/log-semantics-network">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  </Ck>
                </>
              }
              practice={
                <>
                  <Ck k="p2-wireshark" checked={!!progress['p2-wireshark']} onToggle={toggle}>
                    <L href="https://tryhackme.com/room/wiresharktrafficanalysis">Wireshark: Traffic Analysis</L>
                  </Ck>
                  <br />
                  <Ck k="p2-nsm" checked={!!progress['p2-nsm']} onToggle={toggle}>
                    <L href="https://tryhackme.com/module/network-security-monitoring">Network Security Monitoring (except Snort)</L>
                  </Ck>
                </>
              }
            />
            <TRow
              topic="تشخیص تهدیدات DNS"
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <Ck k="p2-dns" checked={!!progress['p2-dns']} onToggle={toggle}>
                    <L href="/courses/log-semantics-dns">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  </Ck>
                </>
              }
              practice={<span className="text-muted">—</span>}
            />
            <TRow
              topic="تشخیص تهدیدات Web"
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <Ck k="p2-web" checked={!!progress['p2-web']} onToggle={toggle}>
                    <L href="/courses/log-semantics-web">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  </Ck>
                  <br />
                  <Ck k="p2-foundations" checked={!!progress['p2-foundations']} onToggle={toggle}>
                    <L href="/portal/soc-t1-d-foundations">مسیر Soc T1 D – Foundations در پرتال آموزشی</L>
                  </Ck>
                </>
              }
              practice={<span className="text-muted">—</span>}
            />
          </tbody>
        </table>
      </div>

      <H3>تسک‌های عملی فاز ۲ (۲ هفته)</H3>
      <p className="muted small" style={{ margin: '4px 0 0' }}>
        دوره‌ها و تمرین‌های بالا در جدول تیک می‌خورند؛ تسک‌های عملی زیر هم جداگانه قابل تیک‌زدن
        هستند.
      </p>
      <ul className="mt-2 space-y-1">
        <Task k="p2-reports" checked={!!progress['p2-reports']} onToggle={toggle}>
          بررسی یوزکیس‌ها روی پروژه‌های واقعی و ارسال گزارش موارد مشکوک به کارشناس لایه ۳
        </Task>
        <Task k="p2-review" checked={!!progress['p2-review']} onToggle={toggle}>
          شرکت در جلسه ارزیابی پایانی فاز ۲
        </Task>
      </ul>

      <BULLET>
        دسترسی <L href="https://tryhackme.com">TryHackMe</L> و{' '}
        <L href="/portal">پرتال آموزشی</L> از طرف کارشناس لایه سه ارسال خواهد شد.
      </BULLET>

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
function Phase3Body({ account, progress, toggle, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>جدول سرفصل‌ها و منابع فاز ۳</H3>
      <div className={TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>سرفصل</TH>
              <TH>منبع آموزشی</TH>
              <TH>منبع تمرین</TH>
            </tr>
          </thead>
          <tbody>
            <TRow
              topic="تشخیص تهدیدات ویندوز"
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <Ck k="p3-win-sysmon" checked={!!progress['p3-win-sysmon']} onToggle={toggle}>
                    <L href="/tools/sysmon-guide">Sysmon</L>
                  </Ck>
                  <br />
                  <Ck k="p3-win-video" checked={!!progress['p3-win-video']} onToggle={toggle}>
                    <L href="/courses/log-semantics-windows">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  </Ck>
                </>
              }
              practice={
                <Ck k="p3-win-mon" checked={!!progress['p3-win-mon']} onToggle={toggle}>
                  <L href="https://tryhackme.com/module/windows-security-monitoring">Windows Security Monitoring</L>
                </Ck>
              }
            />
            <TRow
              topic="تشخیص تهدیدات لینوکس"
              learn={
                <>
                  مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                  <br />
                  <Ck k="p3-linux" checked={!!progress['p3-linux']} onToggle={toggle}>
                    <L href="/courses/log-semantics-linux">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                  </Ck>
                </>
              }
              practice={
                <Ck k="p3-linux-mon" checked={!!progress['p3-linux-mon']} onToggle={toggle}>
                  <L href="https://tryhackme.com/module/linux-security-monitoring">Linux Security Monitoring</L>
                </Ck>
              }
            />
            <TRow
              topic="بررسی هشدارهای HIDPS"
              learn={
                <Ck k="p3-hidps-video" checked={!!progress['p3-hidps-video']} onToggle={toggle}>
                  <L href="/courses/log-semantics-hidps">ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM</L>
                </Ck>
              }
              practice={<span className="text-muted">—</span>}
            />
          </tbody>
        </table>
      </div>

      <H3>تسک‌های عملی فاز ۳ (۱ هفته)</H3>
      <p className="muted small" style={{ margin: '4px 0 0' }}>
        دوره‌ها، مستندات و تمرین‌های بالا در جدول تیک می‌خورند؛ تسک‌های عملی زیر هم جداگانه قابل
        تیک‌زدن هستند.
      </p>
      <ul className="mt-2 space-y-1">
        <Task k="p3-scenarios" checked={!!progress['p3-scenarios']} onToggle={toggle}>
          پیاده‌سازی سناریوهای عملی ارسالی توسط کارشناس لایه ۳ در آزمایشگاه و ارسال نتیجه
        </Task>
        <Task k="p3-review" checked={!!progress['p3-review']} onToggle={toggle}>
          شرکت در جلسه ارزیابی پایان فاز ۳
        </Task>
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

/* ------------------------------------------------ فاز ۴: Onboarding و OKRها */
function Phase4Body({ account, progress, toggle, focusCommentId, focusNonce }: BodyProps) {
  return (
    <section className={WRAP}>
      <H3>شرح فرآیندها و آموزش‌ها</H3>
      <ul className="space-y-1">
        <BULLET>
          در این فاز روندها و فرآیندهای تکمیلی و سیاست‌های رصد و پایش مختص پروژه‌های رینگ توسط
          کارشناس لایه دو و مدیر سرویس رینگ مربوطه آموزش داده خواهد شد.
        </BULLET>
        <BULLET>
          در این فاز دسترسی پروژه‌های رینگ از طرف کارشناس لایه دو و مدیر سرویس ارسال خواهد شد.
        </BULLET>
        <BULLET>
          ارزیابی این فاز توسط کارشناس لایه دو و مدیر سرویس رینگ بر پایه{' '}
          <strong className="text-accent">OKRهای</strong> زیر صورت خواهد پذیرفت.
        </BULLET>
      </ul>

      <H3>تسک‌ها و OKRهای فاز ۴ (۱ هفته)</H3>
      <ul className="mt-2 space-y-1">
        <Task k="p4-training" checked={!!progress['p4-training']} onToggle={toggle}>
          آموزش روندها و سیاست‌های رصد پروژه‌های رینگ توسط کارشناس لایه ۲ و مدیر سرویس
        </Task>
        <Task k="p4-access" checked={!!progress['p4-access']} onToggle={toggle}>
          دریافت دسترسی پروژه‌های رینگ
        </Task>
      </ul>
      <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 pe-1 text-sm">
        <li>
          <span className="flex items-start gap-2.5 leading-8">
            <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              <Task k="p4-shift" checked={!!progress['p4-shift']} onToggle={toggle} inline>
                <strong>OKR 1:</strong> رصد و پایش هر پروژه حداقل به اندازه یک شیفت اداری
              </Task>
            </span>
          </span>
        </li>
        <li>
          <span className="flex items-start gap-2.5 leading-8">
            <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              <Task k="p4-sec-event" checked={!!progress['p4-sec-event']} onToggle={toggle} inline>
                <strong>OKR 2:</strong> ثبت یک تیکت Security Event به ازای هر پروژه در سامانه جیرا
              </Task>
            </span>
          </span>
        </li>
        <li>
          <span className="flex items-start gap-2.5 leading-8">
            <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              <Task
                k="p4-fine-tuning"
                checked={!!progress['p4-fine-tuning']}
                onToggle={toggle}
                inline
              >
                <strong>OKR 3:</strong> ثبت حداقل یک تیکت Fine Tuning به ازای هر SIEM (Elastic و
                Splunk) در جیرا
              </Task>
            </span>
          </span>
        </li>
        <li>
          <span className="flex items-start gap-2.5 leading-8">
            <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              <Task k="p4-ai" checked={!!progress['p4-ai']} onToggle={toggle} inline>
                <strong>OKR 4:</strong> بررسی حداقل یک تیکت AI در جیرا و تغییر وضعیت به{' '}
                <code dir="ltr" className="rounded bg-raised px-1.5 py-0.5 text-xs">
                  Investigate
                </code>
              </Task>
            </span>
          </span>
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
            <L href="/downloads/sec450/slides-and-notes.pdf">دانلود جزوه و اسلایدهای دوره</L>
          </li>
          <li>
            <L href="/downloads/sec450/lyan-videos">دانلود ویدئوهای دوره - موسسه لیان</L>
          </li>
          <li>
            <L href="/downloads/sec450/ravin-videos">دانلود ویدئوهای دوره - موسسه راوین</L>
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
    <div className={TABLE_WRAP}>
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

