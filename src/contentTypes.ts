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
  /** لیبل منوهای سایدبار برای کاربران این ادمین (کلید: شناسه صفحه، شامل صفحات سفارشی) */
  menus: Record<string, string>;
  /** ترتیب نمایش منوها در سایدبار */
  pageOrder: string[];
  pages: Record<string, PageContent>;
}

export const PAGE_IDS: PageId[] = ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix'];

export const DEFAULT_PAGE_ORDER: string[] = [...PAGE_IDS];

/** شناسه صفحه سفارشی که ادمین می‌سازد: custom-... */
export function isCustomPageId(id: string): boolean {
  return /^custom-[a-z0-9-]{1,32}$/.test(id);
}

export function isKnownPageId(id: string): boolean {
  return (PAGE_IDS as string[]).includes(id) || isCustomPageId(id);
}

export function makeCustomPageId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

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

/**
 * ادغام محتوای ذخیره‌شده با پیش‌فرض — در برابر نسخه‌های قدیمی (بدون pageOrder)
 * و صفحات سفارشی مقاوم است.
 */
export function normalizeContent(stored: SiteContent | null | undefined, fallback: SiteContent): SiteContent {
  if (!stored || typeof stored !== 'object') return fallback;
  const storedPages = (stored.pages ?? {}) as Record<string, PageContent>;
  const storedMenus = (stored.menus ?? {}) as Record<string, string>;
  const rawOrder = Array.isArray(stored.pageOrder) ? stored.pageOrder : [];
  // ترتیب: اول آیتم‌های معتبرِ ذخیره‌شده، بعد هر صفحه پیش‌فرض جاافتاده
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of rawOrder) {
    if (typeof id === 'string' && isKnownPageId(id) && storedPages[id] && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const pid of Object.keys(fallback.pages)) {
    if (!seen.has(pid)) {
      seen.add(pid);
      order.push(pid);
    }
  }
  // صفحات سفارشیِ ذخیره‌شده که در order نیستند (نسخه قدیمی ویرایشگر) را هم نگه دار
  for (const id of Object.keys(storedPages)) {
    if (isCustomPageId(id) && !seen.has(id) && Array.isArray((storedPages[id] as PageContent)?.blocks)) {
      seen.add(id);
      order.push(id);
    }
  }
  const pages: Record<string, PageContent> = {};
  for (const id of order) {
    const incoming = storedPages[id];
    const fb = (fallback.pages as Record<string, PageContent>)[id];
    if (incoming && typeof incoming === 'object' && Array.isArray(incoming.blocks)) {
      pages[id] = {
        headerTitle: incoming.headerTitle || fb?.headerTitle || storedMenus[id] || id,
        headerKicker: incoming.headerKicker ?? fb?.headerKicker,
        headerPill: incoming.headerPill ?? fb?.headerPill,
        headerEmoji: incoming.headerEmoji ?? fb?.headerEmoji,
        blocks: incoming.blocks,
      };
    } else if (fb) {
      pages[id] = fb;
    }
  }
  const menus: Record<string, string> = {};
  for (const id of order) {
    const m = storedMenus[id];
    menus[id] =
      typeof m === 'string' && m.trim() ? m : ((fallback.menus as Record<string, string>)[id] ?? pages[id]?.headerTitle ?? id);
  }
  return { menus, pageOrder: order, pages };
}

/** استخراج همه taskKeyهای منابع یک محتوا — مبنای درصد پیشرفت (شامل صفحات سفارشی) */
export function taskKeysOfContent(content: SiteContent): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const order = Array.isArray(content.pageOrder) && content.pageOrder.length > 0
    ? content.pageOrder
    : Object.keys(content.pages ?? {});
  for (const pid of order) {
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
