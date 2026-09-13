import { useCallback, useEffect, useState } from 'react';
import {
  apiCreateUser,
  apiInspectUser,
  apiListComments,
  apiPostComment,
  apiResetPassword,
  apiSetUserStatus,
  apiUsersProgress,
} from '../api';
import type { CommentItem, PublicAccount, UserInspect, UserProgressRow } from '../types';
import { ROLE_LABEL, TASK_KEYS, type Role } from '../types';

interface Props {
  account: PublicAccount;
}

const ALL_PHASES = [
  ['phase-1', 'فاز ۱ — SIEM'],
  ['phase-2', 'فاز ۲ — شبکه'],
  ['phase-3', 'فاز ۳ — Endpoint'],
  ['phase-4', 'فاز ۴ — Onboarding'],
] as const;

const PHASE_FA = ['فاز ۱', 'فاز ۲', 'فاز ۳', 'فاز ۴'] as const;

const TASK_LABELS: Record<string, string> = {
  'p1-sec450': 'مطالعه مبانی تیم آبی و SOC (SEC450)',
  'p1-elastic-course': 'گذراندن دوره رایگان Elastic',
  'p1-elastic-video1': 'ویدئوی ۱ ماژول Elastic (Log Semantics)',
  'p1-elastic-basics': 'تمرین Elastic Stack: The Basics',
  'p1-elastic-query': 'تمرین Elastic: Query Languages',
  'p1-splunk-fund1': 'دوره Splunk Fundamentals 1',
  'p1-splunk-fund2-m10': 'ماژول ۱۰ Splunk Fundamentals 2',
  'p1-splunk-es-videos': 'ویدئوهای ۱ و ۲ آموزش Splunk ES',
  'p1-splunk-basics-room': 'تمرین Splunk Basics - Did you SIEM?',
  'p1-splunk-investigate': 'تمرین Investigating with Splunk',
  'p1-lab-access': 'اتصال به ماشین‌های آزمایشگاه MSSP',
  'p1-real-project': 'تمرین روی پروژه واقعی Elastic/Splunk',
  'p1-review': 'جلسه ارزیابی پایان فاز ۱',
  'p2-sec450-net': 'مطالعه تهدیدات شبکه (SEC450)',
  'p2-net-video': 'ویدئوی تشخیص تهدیدات شبکه',
  'p2-wireshark': 'روم Wireshark: Traffic Analysis',
  'p2-nsm': 'ماژول Network Security Monitoring',
  'p2-dns': 'تهدیدات DNS و ویدئوی DNS',
  'p2-web': 'تهدیدات Web و ویدئوی Web',
  'p2-foundations': 'مسیر Soc T1 D – Foundations',
  'p2-reports': 'گزارش موارد مشکوک به لایه ۳',
  'p2-review': 'جلسه ارزیابی پایان فاز ۲',
  'p3-win-sysmon': 'تهدیدات ویندوز و مستند Sysmon',
  'p3-win-video': 'ویدئوی ویندوز (Log Semantics)',
  'p3-win-mon': 'ماژول Windows Security Monitoring',
  'p3-linux': 'تهدیدات لینوکس و ویدئوی لینوکس',
  'p3-linux-mon': 'ماژول Linux Security Monitoring',
  'p3-hidps-video': 'ویدئوی بررسی هشدارهای HIDPS',
  'p3-scenarios': 'سناریوهای عملی لایه ۳',
  'p3-review': 'جلسه ارزیابی پایان فاز ۳',
  'p4-training': 'آموزش روندهای رصد پروژه‌های رینگ',
  'p4-access': 'دریافت دسترسی پروژه‌های رینگ',
  'p4-shift': 'OKR 1 — رصد یک شیفت اداری',
  'p4-sec-event': 'OKR 2 — تیکت Security Event',
  'p4-fine-tuning': 'OKR 3 — تیکت Fine Tuning',
  'p4-ai': 'OKR 4 — تیکت AI ← Investigate',
};

const roleBadge = (role: Role) =>
  role === 'superadmin'
    ? 'border-accent/50 bg-accent/10 text-accent'
    : role === 'admin'
      ? 'border-amber/50 bg-amber/10 text-amber'
      : 'border-line bg-raised text-muted';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function MiniBar({ pct, small = false }: { pct: number; small?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`progress-track ${small ? 'h-1.5 w-12' : 'w-16'}`}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-bold ${small ? 'text-[10px]' : 'text-[11px]'} ${pct === 100 ? 'text-ok' : 'text-accent'}`}>
        {pct}٪
      </span>
    </div>
  );
}

