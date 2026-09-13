import { useEffect, useMemo, useState } from 'react';
import { apiGetProgress, apiSetProgress } from '../api';
import type { PublicAccount } from '../types';
import CommentSection from '../components/CommentSection';

/** لینک خارجی/داخلی — دقیقاً روی همان متن‌های مشخص‌شده، در برگه جدید */
function L({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">
      {children}
    </a>
  );
}

/** ردیف جدول سرفصل‌ها */
function TRow({ topic, learn, practice }: { topic: string; learn: React.ReactNode; practice: React.ReactNode }) {
  return (
    <tr className="border-b border-line align-top">
      <td className="px-3 py-3 font-semibold whitespace-nowrap">{topic}</td>
      <td className="px-3 py-3">{learn}</td>
      <td className="px-3 py-3">{practice}</td>
    </tr>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-line bg-raised px-3 py-2 text-start text-xs font-bold text-muted">
    {children}
  </th>
);

/** چک‌باکس یک تسک — ذخیره در سرور */
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
        className="h-4 w-4 shrink-0 cursor-pointer accent-[#e11d2e]"
      />
      <label
        htmlFor={`task-${k}`}
        className={`cursor-pointer ${checked ? 'text-muted line-through' : ''}`}
      >
        {children}
      </label>
    </>
  );
  if (inline) return <span className="inline-flex items-start gap-2.5 leading-8">{box}</span>;
  return <li className="flex items-start gap-2.5 leading-8">{box}</li>;
}


const BULLET = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5 leading-8">
    <span className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
    <span>{children}</span>
  </li>
);

const NOTE = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-line bg-raised px-4 py-3 text-sm leading-7 text-muted">
    {children}
  </p>
);

/** کلیدهای تسک‌ها برای محاسبه پیشرفت */
const TASK_KEYS: Record<string, string[]> = {
  'phase-1': ['p1-thm', 'p1-elastic-lab', 'p1-real-project', 'p1-review'],
  'phase-2': ['p2-thm', 'p2-portal', 'p2-reports', 'p2-review'],
  'phase-3': ['p3-thm', 'p3-reports', 'p3-scenarios', 'p3-review'],
  'phase-4': ['p4-training', 'p4-access', 'p4-shift', 'p4-sec-event', 'p4-fine-tuning', 'p4-ai'],
};
const ALL_KEYS = Object.values(TASK_KEYS).flat();

export default function GuidePage({ account }: { account: PublicAccount }) {
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

  const doneCount = useMemo(() => ALL_KEYS.filter((k) => progress[k]).length, [progress]);
  const pct = Math.round((doneCount / ALL_KEYS.length) * 100);

  return (
    <div className="space-y-8">
      {/* سربرگ و معرفی */}
      <header className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-bl from-surface via-surface to-[#20090c] p-8">
        <div className="absolute -top-16 -start-16 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <p className="text-xs font-bold tracking-widest text-brand-soft">BEGINNER'S GUIDE</p>
        <h1 className="mt-2 text-3xl font-extrabold">دستورالعمل آموزش دوره آزمایشی</h1>
        <p className="mt-2 text-sm text-muted">
          بازه زمانی: <strong className="text-ink">شهریور ۱۴۰۵ – مهر ۱۴۰۵</strong>
        </p>
        <ul className="mt-5 grid gap-2 text-sm md:grid-cols-2">
          <li className="rounded-lg border border-line bg-bg px-4 py-2">
            <strong className="text-brand-soft">فاز ۱:</strong> آموزش استفاده از ابزارهای SIEM
            <span className="text-muted"> (دو هفته)</span>
          </li>
          <li className="rounded-lg border border-line bg-bg px-4 py-2">
            <strong className="text-brand-soft">فاز ۲:</strong> آموزش مفاهیم و تشخیص حملات لایه
            شبکه <span className="text-muted">(دو هفته)</span>
          </li>
          <li className="rounded-lg border border-line bg-bg px-4 py-2">
            <strong className="text-brand-soft">فاز ۳:</strong> آموزش مفاهیم و تشخیص حملات لایه
            Endpoint <span className="text-muted">(یک هفته)</span>
          </li>
          <li className="rounded-lg border border-line bg-bg px-4 py-2">
            <strong className="text-brand-soft">فاز ۴:</strong> جمع‌بندی و Onboarding
            <span className="text-muted"> (یک هفته)</span>
          </li>
        </ul>
      </header>

      {/* نوار پیشرفت و استپر */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <strong>پیشرفت کلی شما</strong>
          <span className="font-extrabold text-brand-soft">
            {doneCount} از {ALL_KEYS.length} مورد ({pct}٪)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand to-brand-soft transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ol className="mt-5 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          {[
            ['فاز ۱', 'SIEM'],
            ['فاز ۲', 'شبکه'],
            ['فاز ۳', 'Endpoint'],
            ['فاز ۴', 'Onboarding'],
          ].map(([title, sub], i) => {
            const keys = TASK_KEYS[`phase-${i + 1}`];
            const done = keys.filter((k) => progress[k]).length;
            const full = done === keys.length;
            return (
              <li
                key={title}
                className={`rounded-xl border px-3 py-2.5 text-center ${
                  full ? 'border-ok/50 bg-ok/10' : 'border-line bg-bg'
                }`}
              >
                <span className="block font-bold">{title}</span>
                <span className="text-muted">{sub}</span>
                <span className={`mt-1 block font-semibold ${full ? 'text-ok' : 'text-brand-soft'}`}>
                  {done}/{keys.length}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <Phases account={account} progress={progress} toggle={toggle} />
    </div>
  );
}

/** فازها + پیوست — بدنه اصلی محتوای راهنما */
function PhaseCard({
  id,
  title,
  duration,
  children,
}: {
  id: string;
  title: string;
  duration: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <span className="rounded-md border border-brand/50 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand-soft">
          {duration}
        </span>
      </div>
      {children}
    </section>
  );
}

const TABLE_WRAP = 'overflow-x-auto rounded-xl border border-line';
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-8">{children}</p>
);
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-6 flex items-center gap-2 text-base font-bold">
    <span className="inline-block h-4 w-1 rounded bg-brand" />
    {children}
  </h3>
);

function Phases({
  account,
  progress,
  toggle,
}: {
  account: PublicAccount;
  progress: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  return (
    <>
      {/* ------------------------------------------------ فاز ۱ */}
      <PhaseCard id="phase-1" title="فاز ۱: آموزش SIEM" duration="به مدت دو هفته">
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
                learn={<>مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱</>}
                practice={<span className="text-muted">—</span>}
              />
              <TRow
                topic="آموزش استفاده از Elastic"
                learn={
                  <>
                    <L href="https://www.elastic.co/training/free">دوره آموزشی سایت Elastic</L>
                    <br />
                    <L href="/courses/elastic-log-semantics-m1">
                      ویدئوی شماره یک ماژول Elastic از ویدئو‌های Log Semantics
                    </L>
                  </>
                }
                practice={
                  <>
                    <L href="https://tryhackme.com/room/elasticstackthebasics">
                      Elastic Stack: The Basics
                    </L>
                    <br />
                    <L href="https://tryhackme.com/room/elasticquerylanguages">
                      Elastic: Query Languages
                    </L>
                  </>
                }
              />
              <TRow
                topic="آموزش استفاده از Splunk"
                learn={
                  <>
                    <L href="https://www.splunk.com/en_us/training/free-courses/splunk-fundamentals-1.html">
                      دوره Splunk Fundamentals 1
                    </L>
                    <br />
                    <L href="/courses/splunk-fundamentals-2-m10">ماژول ۱۰ دوره Splunk Fundamentals 2</L>
                    <br />
                    <L href="/courses/splunk-es-part1-2">ویدئوهای شماره ۱ و ۲ آموزش ES</L>
                  </>
                }
                practice={
                  <>
                    <L href="https://tryhackme.com/room/splunk100">Splunk Basics - Did you SIEM?</L>
                    <br />
                    <L href="https://tryhackme.com/room/investigatingwithsplunk">
                      Investigating with Splunk
                    </L>
                  </>
                }
              />
            </tbody>
          </table>
        </div>

        <H3>دستورالعمل‌ها و نکات فاز ۱</H3>
        <ul className="space-y-1">
          <Task k="p1-thm" checked={!!progress['p1-thm']} onToggle={toggle}>
            دسترسی <L href="https://tryhackme.com">TryHackMe</L> از طرف کارشناس لایه سه ارسال خواهد
            شد.
          </Task>
          <BULLET>
            با آغاز این فاز دسترسی به ۴ ماشین SIEM به صورت آزمایشی برقرار خواهد شد. لطفاً برای
            تمرین از این ماشین‌ها استفاده کنید:
          </BULLET>
          <Task k="p1-elastic-lab" checked={!!progress['p1-elastic-lab']} onToggle={toggle}>
            دسترسی به Elastic و Splunk آزمایشگاه MSSP (
            <L href="/docs/mssp-lab-access-guide">راهنمای دسترسی</L>)
          </Task>
          <Task k="p1-real-project" checked={!!progress['p1-real-project']} onToggle={toggle}>
            دسترسی به یک پروژه Elastic و Splunk واقعی (توسط کارشناس لایه سه ارسال خواهد شد)
          </Task>
          <Task k="p1-review" checked={!!progress['p1-review']} onToggle={toggle}>
            پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل
            بررسی نظری و عملی مطالب تدریس شده می‌باشد.
          </Task>
        </ul>

        <CommentSection phase="phase-1" phaseTitle="فاز ۱" account={account} />
      </PhaseCard>

      {/* ------------------------------------------------ فاز ۲ */}
      <PhaseCard id="phase-2" title="فاز ۲: آموزش شبکه" duration="به مدت دو هفته">
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
                    مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                    <br />
                    <L href="/courses/log-semantics-network">
                      ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                    </L>
                  </>
                }
                practice={
                  <>
                    <L href="https://tryhackme.com/room/wiresharktrafficanalysis">
                      Wireshark: Traffic Analysis
                    </L>
                    <br />
                    <L href="https://tryhackme.com/module/network-security-monitoring">
                      Network Security Monitoring (except Snort)
                    </L>
                  </>
                }
              />
              <TRow
                topic="تشخیص تهدیدات DNS"
                learn={
                  <>
                    مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                    <br />
                    <L href="/courses/log-semantics-dns">
                      ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                    </L>
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
                    <L href="/courses/log-semantics-web">
                      ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                    </L>
                    <br />
                    <L href="/portal/soc-t1-d-foundations">
                      مسیر Soc T1 D – Foundations در پرتال آموزشی
                    </L>
                  </>
                }
                practice={<span className="text-muted">—</span>}
              />
            </tbody>
          </table>
        </div>

        <H3>دستورالعمل‌ها و نکات فاز ۲</H3>
        <ul className="space-y-1">
          <Task k="p2-thm" checked={!!progress['p2-thm']} onToggle={toggle}>
            دسترسی <L href="https://tryhackme.com">TryHackMe</L> از طرف کارشناس لایه سه ارسال خواهد
            شد.
          </Task>
          <Task k="p2-portal" checked={!!progress['p2-portal']} onToggle={toggle}>
            دسترسی <L href="/portal">پرتال آموزشی</L> از طرف کارشناس لایه سه ارسال خواهد شد.
          </Task>
          <Task k="p2-reports" checked={!!progress['p2-reports']} onToggle={toggle}>
            لطفاً در حین یادگیری بر روی پروژه‌های واقعی نیز یوزکیس‌های آموزش داده شده بررسی شوند و
            موارد مشکوک مشاهده شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال
            شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آید.
          </Task>
          <Task k="p2-review" checked={!!progress['p2-review']} onToggle={toggle}>
            پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل
            بررسی نظری و عملی مطالب تدریس شده می‌باشد.
          </Task>
        </ul>

        <CommentSection phase="phase-2" phaseTitle="فاز ۲" account={account} />
      </PhaseCard>

      {/* ------------------------------------------------ فاز ۳ */}
      <PhaseCard id="phase-3" title="فاز ۳: آموزش Endpoint" duration="به مدت یک هفته">
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
                    <L href="/tools/sysmon-guide">Sysmon</L>
                    <br />
                    <L href="/courses/log-semantics-windows">
                      ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                    </L>
                  </>
                }
                practice={
                  <L href="https://tryhackme.com/module/windows-security-monitoring">
                    Windows Security Monitoring
                  </L>
                }
              />
              <TRow
                topic="تشخیص تهدیدات لینوکس"
                learn={
                  <>
                    مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱
                    <br />
                    <L href="/courses/log-semantics-linux">
                      ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                    </L>
                  </>
                }
                practice={
                  <L href="https://tryhackme.com/module/linux-security-monitoring">
                    Linux Security Monitoring
                  </L>
                }
              />
              <TRow
                topic="بررسی هشدارهای HIDPS"
                learn={
                  <L href="/courses/log-semantics-hidps">
                    ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM
                  </L>
                }
                practice={<span className="text-muted">—</span>}
              />
            </tbody>
          </table>
        </div>

        <H3>دستورالعمل‌ها و نکات فاز ۳</H3>
        <ul className="space-y-1">
          <Task k="p3-thm" checked={!!progress['p3-thm']} onToggle={toggle}>
            دسترسی <L href="https://tryhackme.com">TryHackMe</L> از طرف کارشناس لایه سه ارسال خواهد
            شد.
          </Task>
          <Task k="p3-reports" checked={!!progress['p3-reports']} onToggle={toggle}>
            لطفاً در حین یادگیری بر روی پروژه‌های واقعی نیز یوزکیس‌های آموزش داده شده بررسی شوند و
            موارد مشکوک مشاهده شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال
            شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آید.
          </Task>
          <Task k="p3-scenarios" checked={!!progress['p3-scenarios']} onToggle={toggle}>
            در این فاز چند سناریوی عملی نیز توسط کارشناس لایه سه ارسال خواهند شد. این سناریوها
            بایستی در محیط آزمایشگاه پیاده‌سازی شده و نتیجه آن در قالب گزارش به کارشناس لایه سه
            ارسال گردد. این گزارش بخشی از مرحله ارزیابی این فاز به حساب می‌آید.
          </Task>
          <Task k="p3-review" checked={!!progress['p3-review']} onToggle={toggle}>
            پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل
            بررسی نظری و عملی مطالب تدریس شده می‌باشد.
          </Task>
        </ul>

        <CommentSection phase="phase-3" phaseTitle="فاز ۳" account={account} />
      </PhaseCard>

      {/* ------------------------------------------------ فاز ۴ */}
      <PhaseCard id="phase-4" title="فاز ۴: Onboarding" duration="به مدت یک هفته">
        <H3>شرح فرآیندها و آموزش‌ها</H3>
        <ul className="space-y-1">
          <BULLET>
            در این فاز روندها و فرآیندهای تکمیلی و سیاست‌های رصد و پایش مختص پروژه‌های رینگ توسط
            کارشناس لایه دو و مدیر سرویس رینگ مربوطه آموزش داده خواهد شد.
          </BULLET>
          <BULLET>
            در این فاز دسترسی پروژه‌های رینگ به کارشناسان از طرف کارشناس لایه دو و مدیر سرویس ارسال
            خواهد شد.
          </BULLET>
          <BULLET>
            ارزیابی این فاز توسط کارشناس لایه دو و مدیر سرویس رینگ مربوطه بر پایه{' '}
            <strong className="text-brand-soft">OKRهای</strong> زیر صورت خواهد پذیرفت:
          </BULLET>
        </ul>
        <ol className="mt-2 ms-6 list-decimal space-y-1 pe-4 text-sm leading-8">
          <li>
            <Task k="p4-shift" checked={!!progress['p4-shift']} onToggle={toggle} inline>
              رصد و پایش هر پروژه حداقل به اندازه <strong>یک شیفت اداری</strong>
            </Task>
          </li>
          <li>
            <Task k="p4-sec-event" checked={!!progress['p4-sec-event']} onToggle={toggle} inline>
              ثبت یک تیکت <strong>Security Event</strong> به ازای هر پروژه در سامانه جیرا
            </Task>
          </li>
          <li>
            <Task
              k="p4-fine-tuning"
              checked={!!progress['p4-fine-tuning']}
              onToggle={toggle}
              inline
            >
              ثبت حداقل یک تیکت <strong>Fine Tuning</strong> به ازای هر فناوری SIEM (یک تیکت برای
              Elastic و یک تیکت برای Splunk) در سامانه جیرا
            </Task>
          </li>
          <li>
            <Task k="p4-ai" checked={!!progress['p4-ai']} onToggle={toggle} inline>
              بررسی حداقل یک تیکت <strong>AI</strong> در سامانه جیرا و انتقال آن به وضعیت{' '}
              <code dir="ltr" className="rounded bg-raised px-1.5 py-0.5 text-xs">
                Investigate
              </code>
            </Task>
          </li>
        </ol>
        <ul className="mt-3 space-y-1">
          <Task k="p4-training" checked={!!progress['p4-training']} onToggle={toggle}>
            شرکت در آموزش روندها و فرآیندهای تکمیلی و سیاست‌های رصد و پایش پروژه‌های رینگ
          </Task>
          <Task k="p4-access" checked={!!progress['p4-access']} onToggle={toggle}>
            دریافت و بررسی دسترسی پروژه‌های رینگ
          </Task>
        </ul>

        <CommentSection phase="phase-4" phaseTitle="فاز ۴" account={account} />
      </PhaseCard>

      {/* ------------------------------------------------ پیوست ۱ */}
      <PhaseCard id="appendix-1" title="پیوست ۱: دوره‌ی SANS SEC 450" duration="جزئیات ویدئوها و جزوات">
        <H3>جدول تطبیقی مباحث SEC450</H3>
        <Sec450Table />

        <H3>منابع و دانلودها</H3>
        <P>
          بنا به تشخیص و صلاح‌دید می‌توانید جهت تکمیل دوره ۴۵۰ از یکی از منابع ذکر شده استفاده
          کنید:
        </P>
        <ol className="mt-2 ms-6 list-decimal space-y-1 pe-4 text-sm leading-8">
          <li>
            <L href="/downloads/sec450/slides-and-notes.pdf">جزوه و اسلایدهای دوره</L>
          </li>
          <li>
            <L href="/downloads/sec450/lyan-videos">ویدئوی آموزشی دوره (توسط موسسه لیان)</L>
          </li>
          <li>
            <L href="/downloads/sec450/ravin-videos">ویدئوی آموزشی دوره (توسط موسسه راوین)</L>
          </li>
        </ol>

        <div className="mt-5">
          <NOTE>
            <strong className="text-ink">نکته تمرین در منزل:</strong> همچنین در منزل جهت انجام
            تمرین‌های تکمیلی دوره می‌توانید VM دوره را دانلود کرده و تمرین‌های آن را انجام دهید.
            جهت دریافت لینک دانلود دوره به کارشناس لایه سه اطلاع دهید.
          </NOTE>
        </div>
      </PhaseCard>
    </>
  );
}






function Sec450Table() {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
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

