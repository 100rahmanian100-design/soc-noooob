/** انواع مشترک فرانت — هم‌راستا با api/_lib/core.ts */

export type Role = 'superadmin' | 'admin' | 'user';

export interface PublicAccount {
  username: string;
  email: string | null;
  role: Role;
  createdBy: string | null;
  active: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  phase: string;
  author: string;
  authorRole: Role;
  targetAdmin: string | null;
  parentId: string | null;
  text: string;
  createdAt: string;
  answered: boolean;
}

export interface AppNotification {
  id: string;
  user: string;
  kind: 'user-question' | 'admin-reply';
  phase: string;
  commentId: string;
  actor: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface PhaseSummary {
  done: number;
  total: number;
  pct: number;
}

export interface ProgressSummary {
  perPhase: Record<string, PhaseSummary>;
  total: { done: number; total: number; pct: number };
}

export interface UserProgressRow {
  username: string;
  email: string | null;
  role: Role;
  createdAt: string;
  active: boolean;
  summary: ProgressSummary;
}

export interface UserInspect {
  user: PublicAccount;
  progress: Record<string, boolean>;
  summary: ProgressSummary;
  comments: CommentItem[];
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'سوپر ادمین',
  admin: 'ادمین',
  user: 'کاربر',
};

/** کلیدهای تسک هر فاز — باید با PROGRESS_TASK_KEYS بک‌اند هم‌راستا باشد */
export const TASK_KEYS: Record<string, string[]> = {
  'phase-1': [
    'p1-sec450',
    'p1-elastic-course',
    'p1-elastic-video1',
    'p1-elastic-basics',
    'p1-elastic-query',
    'p1-splunk-fund1',
    'p1-splunk-fund2-m10',
    'p1-splunk-es-videos',
    'p1-splunk-basics-room',
    'p1-splunk-investigate',
  ],
  'phase-2': [
    'p2-sec450-net',
    'p2-net-video',
    'p2-wireshark',
    'p2-nsm',
    'p2-dns',
    'p2-web',
    'p2-foundations',
  ],
  'phase-3': [
    'p3-win-sysmon',
    'p3-win-video',
    'p3-win-mon',
    'p3-linux',
    'p3-linux-mon',
    'p3-hidps-video',
  ],
  'phase-4': [],
};

export const ALL_TASK_KEYS = Object.values(TASK_KEYS).flat();

export function summarizeProgress(progress: Record<string, boolean>): ProgressSummary {
  const perPhase: Record<string, PhaseSummary> = {};
  let doneAll = 0;
  let totalAll = 0;
  for (const [phase, keys] of Object.entries(TASK_KEYS)) {
    const done = keys.filter((k) => progress[k] === true).length;
    const pct = keys.length === 0 ? 0 : Math.round((done / keys.length) * 100);
    perPhase[phase] = { done, total: keys.length, pct };
    doneAll += done;
    totalAll += keys.length;
  }
  return {
    perPhase,
    total: { done: doneAll, total: totalAll, pct: totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100) },
  };
}
