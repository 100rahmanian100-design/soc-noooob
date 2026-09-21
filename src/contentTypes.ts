/** مدل محتوای قابل‌ویرایش توسط ادمین — هر ادمین نسخه خودش را دارد. */

export type PageId = 'home' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'appendix';

export interface LinkItem {
  label: string;
  href: string;
}

export type ContentBlock =
  | { id: string; type: 'section-title'; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'bullets'; items: string[] }
  | { id: string; type: 'numbered'; items: string[] }
  | { id: string; type: 'links'; title?: string; items: LinkItem[] }
  | {
      id: string;
      type: 'resource-table';
      title?: string;
      headers: string[];
      rows: { cells: string[]; taskKeys: string[] }[];
    }
  | {
      id: string;
      type: 'simple-table';
      title?: string;
      headers: string[];
      rows: { cells: string[] }[];
    };

export interface PageContent {
  /** عنوان هدر صفحه (مثلاً «آموزش SIEM») */
  headerTitle: string;
  /** زیرعنوان کوچک (مثلاً «فاز ۱») */
  headerKicker?: string;
  /** نشان بازه زمانی */
  headerPill?: string;
  /** ایموجی هدر */
  headerEmoji?: string;
  blocks: ContentBlock[];
}

export interface SiteContent {
  /** لیبل منوهای سایدبار برای کاربران این ادمین */
  menus: Record<PageId, string>;
  pages: Record<PageId, PageContent>;
}

export const PAGE_IDS: PageId[] = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix'];

export const PAGE_LABEL_DEFAULT: Record<PageId, string> = {
  home: 'میز کار',
  'phase-1': 'فاز ۱: آموزش SIEM',
  'phase-2': 'فاز ۲: آموزش شبکه',
  'phase-3': 'فاز ۳: آموزش Endpoint',
  'phase-4': 'فاز ۴: Onboarding',
  appendix: 'پیوست ۱: مراجع SANS SEC450',
};

export function newBlockId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newTaskKey(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** استخراج همه taskKeyهای منابع یک محتوا — مبنای درصد پیشرفت */
export function taskKeysOfContent(content: SiteContent): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const phasePages: PageId[] = ['phase-1', 'phase-2', 'phase-3', 'phase-4'];
  for (const pid of phasePages) {
    const keys: string[] = [];
    for (const b of content.pages[pid]?.blocks ?? []) {
      if (b.type === 'resource-table') {
        for (const r of b.rows) for (const k of r.taskKeys ?? []) if (k) keys.push(k);
      }
    }
    out[pid] = keys;
  }
  return out;
}

export interface ProgressSummary {
  perPhase: Record<string, { done: number; total: number; pct: number }>;
  total: { done: number; total: number; pct: number };
}

export function summarizeWithKeys(
  progress: Record<string, boolean>,
  keysByPhase: Record<string, string[]>,
): ProgressSummary {
  const perPhase: ProgressSummary['perPhase'] = {};
  let doneAll = 0;
  let totalAll = 0;
  for (const [phase, keys] of Object.entries(keysByPhase)) {
    const done = keys.filter((k) => progress[k] === true).length;
    const total = keys.length;
    perPhase[phase] = { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    doneAll += done;
    totalAll += total;
  }
  return {
    perPhase,
    total: { done: doneAll, total: totalAll, pct: totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100) },
  };
}
