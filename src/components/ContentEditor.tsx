import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetContent, apiResetContent, apiSetContent } from '../api';
import type { PublicAccount } from '../types';
import type { ContentBlock, SiteContent } from '../contentTypes';
import { isCustomPageId, makeCustomPageId, newBlockId, newTaskKey, normalizeContent } from '../contentTypes';
import { DEFAULT_CONTENT } from '../defaultContent';
import RichText from './RichText';

const DEFAULT_TAB_META: Array<{ id: string; label: string }> = [
  { id: 'home', label: 'میز کار' },
  { id: 'phase-1', label: 'فاز ۱' },
  { id: 'phase-2', label: 'فاز ۲' },
  { id: 'phase-3', label: 'فاز ۳' },
  { id: 'phase-4', label: 'فاز ۴' },
  { id: 'appendix', label: 'پیوست ۱' },
];

type BlockType = ContentBlock['type'];

const BLOCK_TYPE_FA: Record<BlockType, string> = {
  'section-title': 'تیتر بخش',
  paragraph: 'متن',
  note: 'جعبه نکته',
  bullets: 'لیست نقطه‌ای',
  numbered: 'لیست شماره‌دار',
  links: 'لیست لینک',
  'resource-table': 'جدول منابع (با دکمه مشاهده شد)',
  'simple-table': 'جدول ساده (بدون دکمه)',
};

const BLOCK_TYPE_SHORT: Record<BlockType, string> = {
  'section-title': 'تیتر',
  paragraph: 'متن',
  note: 'نکته',
  bullets: 'لیست نقطه‌ای',
  numbered: 'لیست شماره‌دار',
  links: 'لینک‌ها',
  'resource-table': 'جدول منابع',
  'simple-table': 'جدول ساده',
};

const BLOCK_TYPE_ICON: Record<BlockType, string> = {
  'section-title': 'H',
  paragraph: '¶',
  note: '💡',
  bullets: '•',
  numbered: '1.',
  links: '🔗',
  'resource-table': '☑',
  'simple-table': '▦',
};

const DRAFT_PREFIX = 'soc-content-draft:';
const MAX_HISTORY = 60;

interface TouchOpts {
  /** تغییرهای پشت‌سرهم با یک کلید (مثلاً تایپ در یک فیلد) در یک قدم Undo ادغام می‌شوند */
  key?: string;
  msg?: string;
}
type OnChange = (c: SiteContent, o?: TouchOpts) => void;

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** textarea که خودش با متن بزرگ می‌شود (بدون اسکرول داخلی) */
function AutoTextarea({
  value,
  onChange,
  minRows = 2,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      maxLength={maxLength}
      placeholder={placeholder}
      dir="auto"
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} ed-auto min-w-0 text-xs`}
    />
  );
}

function blockSummary(b: ContentBlock): string {
  const clip = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > 70 ? `${t.slice(0, 70)}…` : t;
  };
  const n = (x: number) => x.toLocaleString('fa-IR');
  switch (b.type) {
    case 'section-title':
    case 'paragraph':
    case 'note':
      return clip(b.text);
    case 'bullets':
    case 'numbered':
      return `${n(b.items.length)} مورد · ${clip(b.items[0] ?? '')}`;
    case 'links':
      return `${b.title ? `${clip(b.title)} · ` : ''}${n(b.items.length)} لینک`;
    case 'resource-table':
    case 'simple-table':
      return `${b.title ? `${clip(b.title)} · ` : ''}${n(b.rows.length)} ردیف`;
  }
}

export default function ContentEditor({ account }: { account: PublicAccount }) {
  const [content, setContent] = useState<SiteContent>(() => deepCopy(DEFAULT_CONTENT));
  const [savedJson, setSavedJson] = useState('');
  const [tab, setTab] = useState<string>('phase-1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [past, setPast] = useState<SiteContent[]>([]);
  const [future, setFuture] = useState<SiteContent[]>([]);
  const [draft, setDraft] = useState<{ content: SiteContent; at: string } | null>(null);
  const lastTouch = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const draftKey = `${DRAFT_PREFIX}${account.username.toLowerCase()}`;

  const dirty = useMemo(() => !loading && JSON.stringify(content) !== savedJson, [content, savedJson, loading]);

  useEffect(() => {
    apiGetContent()
      .then((res) => {
        const loaded = res.content ? normalizeContent(res.content, DEFAULT_CONTENT) : deepCopy(DEFAULT_CONTENT);
        setContent(loaded);
        setSavedJson(JSON.stringify(loaded));
        setIsCustom(!!res.content && !!res.isCustom);
        setUpdatedAt(res.updatedAt ?? null);
        // پیش‌نویس ذخیره‌نشده‌ی قبلی (مثلاً تب بسته شده یا از این بخش رفته‌اید)
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const d = JSON.parse(raw) as { content?: SiteContent; at?: string };
            if (d?.content) {
              const n = normalizeContent(d.content, DEFAULT_CONTENT);
              if (JSON.stringify(n) !== JSON.stringify(loaded)) setDraft({ content: n, at: d.at ?? new Date().toISOString() });
              else localStorage.removeItem(draftKey);
            }
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => setError('خطا در بارگذاری محتوا.'))
      .finally(() => setLoading(false));
  }, [draftKey]);

  // ذخیره‌ی خودکار پیش‌نویس در مرورگر (با تاخیر کوتاه)
  useEffect(() => {
    if (loading || draft) return;
    const t = window.setTimeout(() => {
      try {
        if (dirty) localStorage.setItem(draftKey, JSON.stringify({ content, at: new Date().toISOString() }));
        else localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [content, dirty, loading, draft, draftKey]);

  // هشدار هنگام بستن تب با تغییر ذخیره‌نشده
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const touch: OnChange = (next, opts = {}) => {
    const now = Date.now();
    const merge = !!opts.key && lastTouch.current.key === opts.key && now - lastTouch.current.at < 1200;
    lastTouch.current = { key: opts.key ?? '', at: now };
    if (!merge) setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), content]);
    setFuture([]);
    if (tab !== 'menus' && !next.pages[tab]) setTab('menus');
    setContent(next);
    setMessage(opts.msg ?? '');
    setError('');
  };

  const applySnapshot = (c: SiteContent) => {
    if (tab !== 'menus' && !c.pages[tab]) setTab('menus');
    setContent(c);
    setMessage('');
    setError('');
    lastTouch.current = { key: '', at: 0 };
  };

  const undo = () => {
    if (past.length === 0) return;
    setPast(past.slice(0, -1));
    setFuture([content, ...future]);
    applySnapshot(past[past.length - 1]);
  };

  const redo = () => {
    if (future.length === 0) return;
    setFuture(future.slice(1));
    setPast([...past, content]);
    applySnapshot(future[0]);
  };

  const save = async () => {
    if (saving) return;
    const snapshot = JSON.stringify(content);
    setSaving(true);
    setError('');
    setMessage('');
    const res = await apiSetContent(content);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(res.message ?? 'ذخیره شد.');
    setSavedJson(snapshot);
    setIsCustom(true);
    if (res.updatedAt) setUpdatedAt(res.updatedAt);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  // میان‌بر Ctrl/⌘ + S
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const reset = async () => {
    if (!window.confirm('محتوای اختصاصی شما حذف و نسخه پیش‌فرض برگردد؟')) return;
    setSaving(true);
    const res = await apiResetContent();
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const fresh = deepCopy(DEFAULT_CONTENT);
    setContent(fresh);
    setSavedJson(JSON.stringify(fresh));
    setPast([]);
    setFuture([]);
    setIsCustom(false);
    setUpdatedAt(null);
    setTab('phase-1');
    setMessage(res.message ?? 'به نسخه پیش‌فرض برگشت.');
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  const restoreDraft = () => {
    if (!draft) return;
    const d = draft;
    setDraft(null);
    touch(d.content, { msg: 'پیش‌نویس بازیابی شد — برای اعمال برای کاربران، ذخیره کنید.' });
  };

  const discardDraft = () => {
    setDraft(null);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">در حال بارگذاری ویرایشگر محتوا…</p>
      </section>
    );
  }

  const tabs = [
    { id: 'menus', label: '🗂 مدیریت منوها' },
    ...content.pageOrder.map((id) => ({
      id,
      label: `${isCustomPageId(id) ? '✨ ' : ''}${DEFAULT_TAB_META.find((t) => t.id === id)?.label ?? content.menus[id] ?? id}`,
    })),
  ];

  const statusText = dirty
    ? 'تغییر ذخیره‌نشده دارید'
    : isCustom
      ? `ذخیره‌شده${updatedAt ? ` · ${fmtDate(updatedAt)}` : ''}`
      : 'نسخه پیش‌فرض سیستم';

  return (
    <section className="ed rounded-2xl border border-line bg-surface p-5">
      <div className="ed-bar">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`ed-dot ${dirty ? 'is-dirty' : ''}`} />
          <span className={dirty ? 'text-amber' : 'text-muted'}>{statusText}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="ed-btn" disabled={past.length === 0} onClick={undo} title="برگشت به قدم قبل">
            ↩ برگشت
          </button>
          <button type="button" className="ed-btn" disabled={future.length === 0} onClick={redo} title="انجام دوباره">
            ↪ جلو
          </button>
          <button
            type="button"
            className="ed-btn"
            disabled={tab === 'menus' || !content.pages[tab]}
            onClick={() => setPreview(true)}
          >
            👁 پیش‌نمایش
          </button>
          <button type="button" className="ed-btn danger" disabled={saving || !isCustom} onClick={() => void reset()}>
            بازگشت به پیش‌فرض
          </button>
          <button type="button" className="ed-btn primary" disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? 'در حال ذخیره…' : 'ذخیره برای کاربران من'}
            <kbd dir="ltr">Ctrl+S</kbd>
          </button>
        </div>
      </div>

      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        ویرایش منوها و محتوای آموزشی
      </h2>
      <p className="mb-3 text-xs leading-6 text-muted">
        {account.role === 'superadmin'
          ? 'این ویرایش‌ها فقط برای کاربرانی نمایش داده می‌شود که مستقیماً توسط شما ساخته شده‌اند.'
          : 'این ویرایش‌ها فقط برای کاربران ساخته‌شده توسط شما نمایش داده می‌شود.'}{' '}
        تغییرها تا وقتی ذخیره نکنید به کاربران نمی‌رسد؛ پیش‌نویس هم خودکار در همین مرورگر نگه‌داشته می‌شود.
      </p>

      {draft && (
        <div className="ed-banner">
          <span>پیش‌نویس ذخیره‌نشده‌ای از {fmtDateTime(draft.at)} پیدا شد.</span>
          <span className="ms-auto flex gap-1.5">
            <button type="button" className="ed-btn primary" onClick={restoreDraft}>بازیابی</button>
            <button type="button" className="ed-btn" onClick={discardDraft}>دور انداختن</button>
          </span>
        </div>
      )}

      {message && <p className="mb-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">{message}</p>}
      {error && <p className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="ed-tabs">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`ed-tab ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'menus' ? (
        <MenusManager content={content} onChange={touch} onOpenPage={(id) => setTab(id)} />
      ) : content.pages[tab] ? (
        <PageEditor key={tab} pageId={tab} content={content} onChange={touch} />
      ) : (
        <p className="empty">این صفحه وجود ندارد.</p>
      )}

      <details className="mt-5 rounded-lg border border-line bg-bg px-3 py-2 text-[11px] leading-6 text-muted">
        <summary className="cursor-pointer font-semibold">راهنمای لینک‌ها</summary>
        برای لینک اینترنتی بنویسید <code dir="ltr">[متن](https://...)</code> — برای فایل Share بنویسید{' '}
        <code dir="ltr">[متن](\\ShareFolder\...)</code> تا با کلیک برای کاربر کپی شود. در جدول‌ها هر خط یک لینک جدا
        محسوب می‌شود (با Enter جدا کنید).
      </details>

      {preview && tab !== 'menus' && content.pages[tab] && (
        <PreviewModal title={content.pages[tab].headerTitle} blocks={content.pages[tab].blocks} onClose={() => setPreview(false)} />
      )}
    </section>
  );
}

function makeEmptyBlock(type: BlockType): ContentBlock {
  const id = newBlockId();
  switch (type) {
    case 'section-title':
      return { id, type, text: 'تیتر جدید' };
    case 'paragraph':
      return { id, type, text: 'متن جدید… (می‌توانید لینک هم بگذارید: [متن](https://...))' };
    case 'note':
      return { id, type, text: 'نکته جدید…' };
    case 'bullets':
      return { id, type, items: ['مورد جدید…'] };
    case 'numbered':
      return { id, type, items: ['مورد جدید…'] };
    case 'links':
      return { id, type, title: 'لینک‌های جدید', items: [{ label: 'عنوان لینک', href: 'https://' }] };
    case 'resource-table':
      return {
        id,
        type,
        title: 'جدول منابع جدید',
        headers: ['سرفصل', 'منبع آموزشی', 'منبع تمرین'],
        rows: [{ cells: ['سرفصل جدید', '[عنوان](https://...)', '—'], taskKeys: [newTaskKey()] }],
      };
    case 'simple-table':
      return {
        id,
        type,
        title: 'جدول جدید',
        headers: ['ستون ۱', 'ستون ۲'],
        rows: [{ cells: ['—', '—'] }],
      };
  }
}

/* ---------------- مدیریت منوها: افزودن/حذف/ترتیب + ورود به منو ---------------- */

function MenusManager({
  content,
  onChange,
  onOpenPage,
}: {
  content: SiteContent;
  onChange: OnChange;
  onOpenPage: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState('');

  const move = (index: number, dir: -1 | 1) => {
    const next = deepCopy(content);
    const j = index + dir;
    if (j < 0 || j >= next.pageOrder.length) return;
    [next.pageOrder[index], next.pageOrder[j]] = [next.pageOrder[j], next.pageOrder[index]];
    onChange(next);
  };

  const removeCustom = (id: string) => {
    if (!isCustomPageId(id)) return;
    if (!window.confirm(`منوی «${content.menus[id] ?? id}» و همه محتوای داخلش حذف شود؟`)) return;
    const next = deepCopy(content);
    next.pageOrder = next.pageOrder.filter((x) => x !== id);
    delete next.pages[id];
    delete next.menus[id];
    onChange(next, { msg: 'منو حذف شد — با «برگشت» می‌توانید آن را برگردانید.' });
  };

  const addCustom = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (content.pageOrder.filter((x) => isCustomPageId(x)).length >= 20) {
      window.alert('حداکثر ۲۰ منوی سفارشی می‌توانید بسازید.');
      return;
    }
    const id = makeCustomPageId();
    const next = deepCopy(content);
    next.pageOrder.push(id);
    next.menus[id] = label.slice(0, 80);
    next.pages[id] = {
      headerTitle: label.slice(0, 120),
      headerKicker: '',
      headerPill: '',
      headerEmoji: '📄',
      blocks: [
        { id: newBlockId(), type: 'section-title', text: label.slice(0, 200) },
        { id: newBlockId(), type: 'paragraph', text: 'محتوای این صفحه را از تب خودش ویرایش کنید…' },
      ],
    };
    setNewLabel('');
    onChange(next);
    // بعد از ساخت، مستقیم برو توی همان منو تا آیتم‌هایش را بسازی
    onOpenPage(id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-bold text-muted">ترتیب و نام منوها (سایدبار کاربران شما)</h3>
        <div className="space-y-2">
          {content.pageOrder.map((id, i) => (
            <div key={id} className="ed-block flex flex-wrap items-center gap-2 p-2">
              <span className="flex gap-1">
                <button type="button" className="ed-btn icon" onClick={() => move(i, -1)} disabled={i === 0} title="بالا">↑</button>
                <button type="button" className="ed-btn icon" onClick={() => move(i, 1)} disabled={i === content.pageOrder.length - 1} title="پایین">↓</button>
              </span>
              <input
                value={content.menus[id] ?? ''}
                maxLength={80}
                onChange={(e) => {
                  const next = deepCopy(content);
                  next.menus[id] = e.target.value;
                  onChange(next, { key: `m:${id}` });
                }}
                className={inputCls}
                style={{ flex: '1 1 200px' }}
              />
              <span className="flex items-center gap-1">
                <button type="button" className="ed-btn" onClick={() => onOpenPage(id)}>
                  ویرایش محتوا ←
                </button>
                {isCustomPageId(id) ? (
                  <button type="button" className="ed-btn danger" onClick={() => removeCustom(id)}>
                    حذف منو
                  </button>
                ) : (
                  <span className="rounded-md border border-line px-2 py-1 text-[10px] text-muted">صفحه اصلی</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
        <label className="block min-w-52 flex-1">
          <span className="mb-1 block text-xs font-semibold text-muted">نام منوی جدید</span>
          <input
            value={newLabel}
            maxLength={80}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="مثلاً: آموزش Splunk پیشرفته"
            className={inputCls}
          />
        </label>
        <button type="button" className="ed-btn primary" style={{ minHeight: 44 }} onClick={addCustom} disabled={!newLabel.trim()}>
          + افزودن منو و ورود به آن
        </button>
      </div>
      <p className="text-[11px] leading-5 text-muted">
        صفحات اصلی (میز کار، فازها، پیوست) قابل حذف نیستند ولی نام و ترتیبشان قابل تغییر است. منوی جدید بعد از ذخیره،
        در سایدبار کاربران شما ظاهر می‌شود.
      </p>
    </div>
  );
}

/* ---------------- ویرایش یک صفحه ---------------- */

function PageEditor({ pageId, content, onChange }: { pageId: string; content: SiteContent; onChange: OnChange }) {
  const page = content.pages[pageId];
  // صفحه‌های بلند: بلوک‌ها از ابتدا بسته باشند تا نمای کلی دیده شود
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(page.blocks.length > 8 ? page.blocks.map((b) => b.id) : []),
  );
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setHeader = (patch: Partial<typeof page>) => {
    const next = deepCopy(content);
    Object.assign(next.pages[pageId], patch);
    onChange(next, { key: `h:${pageId}:${Object.keys(patch)[0]}` });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = deepCopy(content);
    const arr = next.pages[pageId].blocks;
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    const b = page.blocks[index];
    if (
      b.type === 'resource-table' &&
      !window.confirm('این جدول منابع حذف شود؟ پیشرفت کاربران در ردیف‌های آن دیگر حساب نمی‌شود.')
    )
      return;
    const next = deepCopy(content);
    next.pages[pageId].blocks.splice(index, 1);
    onChange(next, { msg: 'بلوک حذف شد — با «برگشت» می‌توانید آن را برگردانید.' });
  };

  const duplicate = (index: number) => {
    const next = deepCopy(content);
    const copy: ContentBlock = deepCopy(next.pages[pageId].blocks[index]);
    copy.id = newBlockId();
    if (copy.type === 'resource-table') {
      // کلید پیشرفت باید یکتا بماند تا درصد کاربران دوبار حساب نشود
      copy.rows = copy.rows.map((r) => ({ ...r, taskKeys: r.taskKeys.map(() => newTaskKey()) }));
    }
    next.pages[pageId].blocks.splice(index + 1, 0, copy);
    onChange(next, { msg: 'بلوک کپی شد.' });
  };

  const patchBlock = (index: number, block: ContentBlock) => {
    const next = deepCopy(content);
    next.pages[pageId].blocks[index] = block;
    onChange(next, { key: `b:${block.id}` });
  };

  const insertBlock = (type: BlockType, index: number) => {
    const nb = makeEmptyBlock(type);
    const next = deepCopy(content);
    next.pages[pageId].blocks.splice(index, 0, nb);
    onChange(next);
    setInsertAt(null);
    window.setTimeout(() => document.getElementById(`blk-${nb.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const allClosed = page.blocks.length > 0 && page.blocks.every((b) => collapsed.has(b.id));

  const TypePicker = ({ index }: { index: number }) => (
    <div className="ed-types">
      {(Object.keys(BLOCK_TYPE_SHORT) as BlockType[]).map((t) => (
        <button key={t} type="button" className="ed-btn ed-chip" title={BLOCK_TYPE_FA[t]} onClick={() => insertBlock(t, index)}>
          <span className="ed-chip-icon">{BLOCK_TYPE_ICON[t]}</span>
          {BLOCK_TYPE_SHORT[t]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">عنوان صفحه</span>
          <input value={page.headerTitle} maxLength={120} onChange={(e) => setHeader({ headerTitle: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">زیرعنوان (Kicker)</span>
          <input value={page.headerKicker ?? ''} maxLength={60} onChange={(e) => setHeader({ headerKicker: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">نشان بازه (Pill)</span>
          <input value={page.headerPill ?? ''} maxLength={40} onChange={(e) => setHeader({ headerPill: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">ایموجی</span>
          <input value={page.headerEmoji ?? ''} maxLength={8} onChange={(e) => setHeader({ headerEmoji: e.target.value })} className={inputCls} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted">{page.blocks.length.toLocaleString('fa-IR')} بلوک</span>
        {page.blocks.length > 1 && (
          <button
            type="button"
            className="ed-btn ms-auto"
            onClick={() => setCollapsed(allClosed ? new Set() : new Set(page.blocks.map((b) => b.id)))}
          >
            {allClosed ? '▾ باز کردن همه' : '◂ بستن همه'}
          </button>
        )}
      </div>

      <div>
        {page.blocks.map((b, i) => {
          const open = !collapsed.has(b.id);
          return (
            <div key={b.id}>
              <div className={`ed-insert ${insertAt === i ? 'is-open' : ''}`}>
                <button
                  type="button"
                  title="افزودن بلوک در این نقطه"
                  onClick={() => setInsertAt(insertAt === i ? null : i)}
                >
                  +
                </button>
              </div>
              {insertAt === i && <TypePicker index={i} />}

              <div id={`blk-${b.id}`} className={`ed-block ${open ? 'is-open' : ''}`}>
                <div className="ed-block-head" onClick={() => toggle(b.id)}>
                  <span className="text-xs text-muted">{open ? '▾' : '◂'}</span>
                  <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                    {BLOCK_TYPE_ICON[b.type]} {BLOCK_TYPE_SHORT[b.type]}
                  </span>
                  <span className="ed-block-summary">{open ? '' : blockSummary(b)}</span>
                  <span className="ms-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="ed-btn icon" onClick={() => move(i, -1)} disabled={i === 0} title="بالا">↑</button>
                    <button type="button" className="ed-btn icon" onClick={() => move(i, 1)} disabled={i === page.blocks.length - 1} title="پایین">↓</button>
                    <button type="button" className="ed-btn icon" onClick={() => duplicate(i)} title="کپی این بلوک">⧉</button>
                    <button type="button" className="ed-btn icon danger" onClick={() => remove(i)} title="حذف">🗑</button>
                  </span>
                </div>
                {open && (
                  <div className="ed-block-body">
                    <BlockEditor block={b} onChange={(nb) => patchBlock(i, nb)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {page.blocks.length === 0 && <p className="empty">هنوز بلوکی در این صفحه نیست — از پایین بلوک جدید بسازید.</p>}

        <div className="mt-3">
          <p className="mb-2 text-xs font-bold text-muted">+ افزودن بلوک به انتهای صفحه</p>
          <TypePicker index={page.blocks.length} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- ویرایشگر هر بلوک ---------------- */

function BlockEditor({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }) {
  switch (block.type) {
    case 'section-title':
      return (
        <input value={block.text} maxLength={200} onChange={(e) => onChange({ ...block, text: e.target.value })} className={inputCls} />
      );
    case 'paragraph':
    case 'note':
      return <AutoTextarea value={block.text} maxLength={6000} minRows={3} onChange={(text) => onChange({ ...block, text })} />;
    case 'bullets':
    case 'numbered':
      return (
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 w-5 shrink-0 text-center text-[11px] text-muted">
                {block.type === 'numbered' ? (i + 1).toLocaleString('fa-IR') : '•'}
              </span>
              <AutoTextarea
                value={it}
                maxLength={4000}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = v;
                  onChange({ ...block, items });
                }}
              />
              <button
                type="button"
                className="ed-btn icon danger"
                title="حذف مورد"
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="ed-btn" onClick={() => onChange({ ...block, items: [...block.items, 'مورد جدید…'] })}>
            + مورد جدید
          </button>
        </div>
      );
    case 'links':
      return (
        <div className="space-y-2">
          <input
            value={block.title ?? ''}
            maxLength={200}
            placeholder="عنوان (اختیاری)"
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            className={inputCls}
          />
          {block.items.map((l, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={l.label}
                maxLength={200}
                placeholder="متن لینک"
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...l, label: e.target.value };
                  onChange({ ...block, items });
                }}
                className={inputCls}
              />
              <input
                value={l.href}
                maxLength={600}
                placeholder="https://... یا \\ShareFolder\..."
                dir="ltr"
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...l, href: e.target.value };
                  onChange({ ...block, items });
                }}
                className={inputCls}
              />
              <button
                type="button"
                className="ed-btn icon danger"
                title="حذف لینک"
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="ed-btn"
            onClick={() => onChange({ ...block, items: [...block.items, { label: 'عنوان لینک', href: 'https://' }] })}
          >
            + لینک جدید
          </button>
        </div>
      );
    case 'simple-table':
    case 'resource-table':
      return <TableEditor block={block} onChange={onChange} />;
    default:
      return null;
  }
}

function TableEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: 'simple-table' | 'resource-table' }>;
  onChange: (b: ContentBlock) => void;
}) {
  type Row = { cells: string[]; taskKeys?: string[] };
  const isResource = block.type === 'resource-table';
  const rowsOf = (): Row[] => block.rows.map((r) => ({ ...r }));

  const setTitle = (title: string) => onChange({ ...block, title });
  const setHeader = (i: number, v: string) => {
    const headers = [...block.headers];
    headers[i] = v;
    onChange({ ...block, headers });
  };
  const addCol = () => {
    if (block.headers.length >= 8) return;
    const headers = [...block.headers, `ستون ${block.headers.length + 1}`];
    const rows = rowsOf().map((r) => ({ ...r, cells: [...r.cells, '—'] }));
    onChange({ ...block, headers, rows } as ContentBlock);
  };
  const removeCol = (i: number) => {
    if (block.headers.length <= 1) return;
    const headers = block.headers.filter((_, j) => j !== i);
    const rows = rowsOf().map((r) => ({ ...r, cells: r.cells.filter((_, j) => j !== i) }));
    onChange({ ...block, headers, rows } as ContentBlock);
  };
  const setCell = (ri: number, ci: number, v: string) => {
    const rows = rowsOf();
    rows[ri] = { ...rows[ri], cells: rows[ri].cells.map((c, k) => (k === ci ? v : c)) };
    onChange({ ...block, rows } as ContentBlock);
  };
  const addRow = () => {
    if (block.rows.length >= 80) return;
    const cells = block.headers.map(() => '—');
    const rows = [...rowsOf(), isResource ? { cells, taskKeys: [newTaskKey()] } : { cells }];
    onChange({ ...block, rows } as ContentBlock);
  };
  const dupRow = (ri: number) => {
    if (block.rows.length >= 80) return;
    const rows = rowsOf();
    const src = rows[ri];
    // کلید پیشرفت ردیف کپی‌شده باید جدید باشد
    rows.splice(ri + 1, 0, isResource ? { cells: [...src.cells], taskKeys: [newTaskKey()] } : { cells: [...src.cells] });
    onChange({ ...block, rows } as ContentBlock);
  };
  const moveRow = (ri: number, dir: -1 | 1) => {
    const j = ri + dir;
    if (j < 0 || j >= block.rows.length) return;
    const rows = rowsOf();
    [rows[ri], rows[j]] = [rows[j], rows[ri]];
    onChange({ ...block, rows } as ContentBlock);
  };
  const removeRow = (ri: number) => {
    onChange({ ...block, rows: rowsOf().filter((_, j) => j !== ri) } as ContentBlock);
  };
  const regenKey = (ri: number) => {
    if (!isResource) return;
    const rows = rowsOf();
    rows[ri] = { ...rows[ri], taskKeys: [newTaskKey()] };
    onChange({ ...block, rows } as ContentBlock);
  };

  return (
    <div className="space-y-3">
      <input
        value={block.title ?? ''}
        maxLength={200}
        placeholder="عنوان جدول (اختیاری)"
        onChange={(e) => setTitle(e.target.value)}
        className={inputCls}
      />
      <div className="flex flex-wrap gap-2">
        {block.headers.map((h, i) => (
          <div key={i} className="flex min-w-40 flex-1 items-center gap-1">
            <input value={h} maxLength={120} onChange={(e) => setHeader(i, e.target.value)} className={inputCls} />
            <button type="button" className="ed-btn icon danger" onClick={() => removeCol(i)} title="حذف ستون">✕</button>
          </div>
        ))}
        <button type="button" className="ed-btn" onClick={addCol}>+ ستون</button>
      </div>
      <div className="space-y-2">
        {block.rows.map((r, ri) => (
          <div key={ri} className="ed-row">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted">ردیف {(ri + 1).toLocaleString('fa-IR')}</span>
              {isResource && (
                <span className="text-[10px] text-muted" dir="ltr">
                  {(r as { taskKeys: string[] }).taskKeys.join(', ')}
                </span>
              )}
              <span className="ms-auto flex gap-1">
                {isResource && (
                  <button type="button" className="ed-btn" onClick={() => regenKey(ri)} title="ساخت کلید پیشرفت جدید">
                    کلید جدید
                  </button>
                )}
                <button type="button" className="ed-btn icon" onClick={() => moveRow(ri, -1)} disabled={ri === 0} title="بالا">↑</button>
                <button type="button" className="ed-btn icon" onClick={() => moveRow(ri, 1)} disabled={ri === block.rows.length - 1} title="پایین">↓</button>
                <button type="button" className="ed-btn icon" onClick={() => dupRow(ri)} title="کپی ردیف">⧉</button>
                <button type="button" className="ed-btn icon danger" onClick={() => removeRow(ri)} title="حذف ردیف">🗑</button>
              </span>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, block.headers.length)}, minmax(0,1fr))` }}>
              {r.cells.map((c, ci) => (
                <AutoTextarea
                  key={ci}
                  value={c}
                  maxLength={4000}
                  minRows={2}
                  placeholder={`${block.headers[ci] ?? ''} — پشتیبانی از [متن](لینک)`}
                  onChange={(v) => setCell(ri, ci, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="ed-btn" onClick={addRow}>+ ردیف جدید</button>
      {isResource && (
        <p className="text-[11px] leading-5 text-muted">
          هر ردیف این جدول یک دکمه «مشاهده شد» دارد و در درصد پیشرفت کاربران شما حساب می‌شود. با «کلید جدید»،
          وضعیت قبلی کاربران برای آن ردیف صفر می‌شود.
        </p>
      )}
    </div>
  );
}

function PreviewModal({ title, blocks, onClose }: { title: string; blocks: ContentBlock[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold">پیش‌نمایش: {title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-raised">✕</button>
        </div>
        <div className="mt-4 space-y-4">
          {blocks.map((b) => (
            <div key={b.id}>
              {b.type === 'section-title' && <h4 className="text-sm font-extrabold text-accent">{b.text}</h4>}
              {(b.type === 'paragraph' || b.type === 'note') && (
                <p className="text-sm leading-7 text-muted"><RichText text={b.text} /></p>
              )}
              {(b.type === 'bullets' || b.type === 'numbered') && (
                <ul className="list-disc space-y-1 ps-5 text-sm leading-7 text-muted">
                  {b.items.map((it, i) => (
                    <li key={i}><RichText text={it} /></li>
                  ))}
                </ul>
              )}
              {b.type === 'links' && (
                <div className="text-sm">
                  {b.title && <p className="mb-1 font-bold">{b.title}</p>}
                  {b.items.map((l, i) => (
                    <p key={i} className="text-accent" dir="auto">{l.label} <span className="text-muted" dir="ltr">({l.href})</span></p>
                  ))}
                </div>
              )}
              {(b.type === 'resource-table' || b.type === 'simple-table') && (
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-raised">
                        {b.headers.map((h, i) => (
                          <th key={i} className="px-2 py-2 text-start">{h}</th>
                        ))}
                        {b.type === 'resource-table' && <th className="px-2 py-2">وضعیت</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r, ri) => (
                        <tr key={ri} className="border-t border-line">
                          {r.cells.map((c, ci) => (
                            <td key={ci} className="px-2 py-2"><RichText text={c} /></td>
                          ))}
                          {b.type === 'resource-table' && <td className="px-2 py-2 text-center text-muted">مشاهده شد</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
