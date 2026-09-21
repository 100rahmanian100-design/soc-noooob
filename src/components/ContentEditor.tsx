import { useEffect, useState } from 'react';
import { apiGetContent, apiResetContent, apiSetContent } from '../api';
import type { PublicAccount } from '../types';
import type { ContentBlock, PageId, SiteContent } from '../contentTypes';
import { newBlockId, newTaskKey, PAGE_IDS } from '../contentTypes';
import { DEFAULT_CONTENT } from '../defaultContent';
import RichText from './RichText';

const PAGE_TABS: Array<{ id: PageId | 'menus'; label: string }> = [
  { id: 'menus', label: 'منوها' },
  { id: 'home', label: 'میز کار' },
  { id: 'phase-1', label: 'فاز ۱' },
  { id: 'phase-2', label: 'فاز ۲' },
  { id: 'phase-3', label: 'فاز ۳' },
  { id: 'phase-4', label: 'فاز ۴' },
  { id: 'appendix', label: 'پیوست ۱' },
];

const BLOCK_TYPE_FA: Record<ContentBlock['type'], string> = {
  'section-title': 'تیتر بخش',
  paragraph: 'متن',
  note: 'جعبه نکته',
  bullets: 'لیست نقطه‌ای',
  numbered: 'لیست شماره‌دار',
  links: 'لیست لینک',
  'resource-table': 'جدول منابع (با دکمه مشاهده شد)',
  'simple-table': 'جدول ساده (بدون دکمه)',
};

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent';
const miniBtn =
  'rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:bg-raised hover:text-text';
const primaryBtn =
  'rounded-lg border-0 bg-accent px-5 py-2.5 font-bold text-ink transition hover:opacity-90 disabled:opacity-50';

export default function ContentEditor({ account }: { account: PublicAccount }) {
  const [content, setContent] = useState<SiteContent>(() => deepCopy(DEFAULT_CONTENT));
  const [tab, setTab] = useState<PageId | 'menus'>('phase-1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    apiGetContent()
      .then((res) => {
        if (res.content) {
          const merged: SiteContent = {
            menus: { ...DEFAULT_CONTENT.menus, ...(res.content.menus ?? {}) },
            pages: deepCopy(DEFAULT_CONTENT.pages),
          };
          for (const pid of PAGE_IDS) {
            const inc = (res.content.pages as Record<string, (typeof res.content.pages)[typeof pid]>)[pid];
            if (inc && typeof inc === 'object' && Array.isArray((inc as { blocks?: unknown }).blocks)) {
              merged.pages[pid] = inc as (typeof merged.pages)[typeof pid];
            }
          }
          setContent(merged);
          setIsCustom(!!res.isCustom);
          setUpdatedAt(res.updatedAt ?? null);
        } else {
          setContent(deepCopy(DEFAULT_CONTENT));
          setIsCustom(false);
        }
      })
      .catch(() => setError('خطا در بارگذاری محتوا.'))
      .finally(() => setLoading(false));
  }, []);

  const touch = (next: SiteContent) => {
    setContent(next);
    setDirty(true);
    setMessage('');
    setError('');
  };

  const save = async () => {
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
    setDirty(false);
    setIsCustom(true);
    if (res.updatedAt) setUpdatedAt(res.updatedAt);
  };

  const reset = async () => {
    if (!window.confirm('محتوای اختصاصی شما حذف و نسخه پیش‌فرض برگردد؟')) return;
    setSaving(true);
    const res = await apiResetContent();
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setContent(deepCopy(DEFAULT_CONTENT));
    setIsCustom(false);
    setUpdatedAt(null);
    setDirty(false);
    setMessage(res.message ?? 'به نسخه پیش‌فرض برگشت.');
  };

  const addBlock = (type: ContentBlock['type']) => {
    if (tab === 'menus') return;
    const base: ContentBlock = makeEmptyBlock(type);
    const next = deepCopy(content);
    next.pages[tab as PageId].blocks.push(base);
    touch(next);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">در حال بارگذاری ویرایشگر محتوا…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        ویرایش منوها و محتوای آموزشی
      </h2>
      <p className="mb-1 text-xs leading-6 text-muted">
        {account.role === 'superadmin'
          ? 'به‌عنوان سوپر ادمین، این ویرایش‌ها فقط برای کاربرانی که مستقیماً توسط شما ساخته شده‌اند نمایش داده می‌شود.'
          : 'این ویرایش‌ها فقط برای کاربران ساخته‌شده توسط شما نمایش داده می‌شود؛ کاربران ادمین‌های دیگر آن را نمی‌بینند.'}{' '}
        متن‌ها، لینک‌ها، جدول‌ها و بخش‌های غیرجدولی را می‌توانید کامل ویرایش کنید یا بسازید.
      </p>
      <p className="mb-4 text-[11px] text-muted">
        وضعیت: {isCustom ? `نسخه اختصاصی شما${updatedAt ? ` · ${fmtDate(updatedAt)}` : ''}` : 'نسخه پیش‌فرض سیستم'}
        {dirty && ' · تغییری ذخیره‌نشده دارید'}
      </p>

      {message && <p className="mb-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">{message}</p>}
      {error && <p className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {PAGE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id ? 'border-0 bg-accent text-ink' : 'border border-line text-muted hover:bg-raised'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'menus' ? (
        <MenusEditor content={content} onChange={touch} />
      ) : (
        <PageEditor
          pageId={tab as PageId}
          content={content}
          onChange={touch}
          onAddBlock={addBlock}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" disabled={saving} onClick={() => void save()} className={primaryBtn}>
          {saving ? 'در حال ذخیره…' : 'ذخیره برای کاربران من'}
        </button>
        <button type="button" disabled={saving} onClick={() => setPreview(true)} className={miniBtn} style={{ padding: '10px 16px' }}>
          پیش‌نمایش
        </button>
        <button type="button" disabled={saving || !isCustom} onClick={() => void reset()} className={miniBtn} style={{ padding: '10px 16px' }}>
          برگشت به پیش‌فرض
        </button>
      </div>

      <p className="mt-3 rounded-lg border border-line bg-bg px-3 py-2 text-[11px] leading-6 text-muted">
        راهنمای لینک: برای لینک اینترنتی بنویسید <code dir="ltr">[متن](https://...)</code> — برای فایل Share بنویسید{' '}
        <code dir="ltr">[متن](\\ShareFolder\...)</code> تا با کلیک برای کاربر کپی شود. در جدول‌ها هر خط یک لینک جدا
        محسوب می‌شود (با Enter جدا کنید).
      </p>

      {preview && tab !== 'menus' && (
        <PreviewModal
          title={content.pages[tab as PageId].headerTitle}
          blocks={content.pages[tab as PageId].blocks}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function makeEmptyBlock(type: ContentBlock['type']): ContentBlock {
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

/* ---------------- ویرایش منوها ---------------- */

function MenusEditor({ content, onChange }: { content: SiteContent; onChange: (c: SiteContent) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(Object.keys(DEFAULT_CONTENT.menus) as PageId[]).map((pid) => (
        <label key={pid} className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            {pid} <span className="font-normal opacity-70">(پیش‌فرض: {DEFAULT_CONTENT.menus[pid]})</span>
          </span>
          <input
            value={content.menus[pid] ?? ''}
            maxLength={80}
            onChange={(e) => {
              const next = deepCopy(content);
              next.menus[pid] = e.target.value;
              onChange(next);
            }}
            className={inputCls}
          />
        </label>
      ))}
    </div>
  );
}

/* ---------------- ویرایش یک صفحه ---------------- */

function PageEditor({
  pageId,
  content,
  onChange,
  onAddBlock,
}: {
  pageId: PageId;
  content: SiteContent;
  onChange: (c: SiteContent) => void;
  onAddBlock: (t: ContentBlock['type']) => void;
}) {
  const page = content.pages[pageId];
  const [newType, setNewType] = useState<ContentBlock['type']>('paragraph');

  const setHeader = (patch: Partial<typeof page>) => {
    const next = deepCopy(content);
    Object.assign(next.pages[pageId], patch);
    onChange(next);
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
    if (!window.confirm('این بلوک حذف شود؟')) return;
    const next = deepCopy(content);
    next.pages[pageId].blocks.splice(index, 1);
    onChange(next);
  };

  const patchBlock = (index: number, block: ContentBlock) => {
    const next = deepCopy(content);
    next.pages[pageId].blocks[index] = block;
    onChange(next);
  };

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

      <div className="space-y-3">
        {page.blocks.map((b, i) => (
          <div key={b.id} className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                {BLOCK_TYPE_FA[b.type]}
              </span>
              <span className="ms-auto flex gap-1">
                <button type="button" className={miniBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className={miniBtn} onClick={() => move(i, 1)} disabled={i === page.blocks.length - 1}>↓</button>
                <button type="button" className={miniBtn} onClick={() => remove(i)}>حذف</button>
              </span>
            </div>
            <BlockEditor block={b} onChange={(nb) => patchBlock(i, nb)} />
          </div>
        ))}
        {page.blocks.length === 0 && <p className="empty">هنوز بلوکی در این صفحه نیست — از پایین بلوک جدید بسازید.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-3">
        <select value={newType} onChange={(e) => setNewType(e.target.value as ContentBlock['type'])} className={inputCls} style={{ maxWidth: 300 }}>
          {(Object.keys(BLOCK_TYPE_FA) as ContentBlock['type'][]).map((t) => (
            <option key={t} value={t}>{BLOCK_TYPE_FA[t]}</option>
          ))}
        </select>
        <button type="button" className={miniBtn} style={{ padding: '10px 16px' }} onClick={() => onAddBlock(newType)}>
          + افزودن بلوک
        </button>
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
      return (
        <textarea
          value={block.text}
          maxLength={6000}
          rows={3}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className={`${inputCls} min-w-0 resize-y text-xs`}
          dir="auto"
        />
      );
    case 'bullets':
    case 'numbered':
      return (
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={it}
                maxLength={4000}
                rows={2}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = e.target.value;
                  onChange({ ...block, items });
                }}
                className={`${inputCls} min-w-0 flex-1 resize-y text-xs`}
                dir="auto"
              />
              <button
                type="button"
                className={miniBtn}
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={miniBtn} onClick={() => onChange({ ...block, items: [...block.items, 'مورد جدید…'] })}>
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
                className={miniBtn}
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={miniBtn}
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
  const setTitle = (title: string) => onChange({ ...block, title });
  const setHeader = (i: number, v: string) => {
    const headers = [...block.headers];
    headers[i] = v;
    onChange({ ...block, headers });
  };
  const addCol = () => {
    if (block.headers.length >= 8) return;
    const headers = [...block.headers, `ستون ${block.headers.length + 1}`];
    const rows = block.rows.map((r) => ({ ...r, cells: [...r.cells, '—'] }));
    onChange({ ...block, headers, rows } as ContentBlock);
  };
  const removeCol = (i: number) => {
    if (block.headers.length <= 1) return;
    const headers = block.headers.filter((_, j) => j !== i);
    const rows = block.rows.map((r) => ({ ...r, cells: r.cells.filter((_, j) => j !== i) }));
    onChange({ ...block, headers, rows } as ContentBlock);
  };
  const setCell = (ri: number, ci: number, v: string) => {
    const rows = block.rows.map((r, j) => (j === ri ? { ...r, cells: r.cells.map((c, k) => (k === ci ? v : c)) } : r));
    onChange({ ...block, rows } as ContentBlock);
  };
  const addRow = () => {
    if (block.rows.length >= 80) return;
    const cells = block.headers.map(() => '—');
    if (block.type === 'resource-table') {
      onChange({ ...block, rows: [...block.rows, { cells, taskKeys: [newTaskKey()] }] });
    } else {
      onChange({ ...block, rows: [...block.rows, { cells }] });
    }
  };
  const removeRow = (ri: number) => {
    onChange({ ...block, rows: block.rows.filter((_, j) => j !== ri) } as ContentBlock);
  };
  const regenKey = (ri: number) => {
    if (block.type !== 'resource-table') return;
    const rows = block.rows.map((r, j) => (j === ri ? { ...r, taskKeys: [newTaskKey()] } : r));
    onChange({ ...block, rows });
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
            <button type="button" className={miniBtn} onClick={() => removeCol(i)} title="حذف ستون">✕</button>
          </div>
        ))}
        <button type="button" className={miniBtn} onClick={addCol}>+ ستون</button>
      </div>
      <div className="space-y-2">
        {block.rows.map((r, ri) => (
          <div key={ri} className="rounded-lg border border-line p-2">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted">ردیف {ri + 1}</span>
              {block.type === 'resource-table' && (
                <span className="text-[10px] text-muted" dir="ltr">
                  {(r as { taskKeys: string[] }).taskKeys.join(', ')}
                </span>
              )}
              <span className="ms-auto flex gap-1">
                {block.type === 'resource-table' && (
                  <button type="button" className={miniBtn} onClick={() => regenKey(ri)} title="ساخت کلید پیشرفت جدید">
                    کلید جدید
                  </button>
                )}
                <button type="button" className={miniBtn} onClick={() => removeRow(ri)}>حذف ردیف</button>
              </span>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, block.headers.length)}, minmax(0,1fr))` }}>
              {r.cells.map((c, ci) => (
                <textarea
                  key={ci}
                  value={c}
                  maxLength={4000}
                  rows={3}
                  dir="auto"
                  placeholder={`${block.headers[ci] ?? ''} — پشتیبانی از [متن](لینک)`}
                  onChange={(e) => setCell(ri, ci, e.target.value)}
                  className={`${inputCls} min-w-0 resize-y text-xs`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={miniBtn} onClick={addRow}>+ ردیف جدید</button>
      {block.type === 'resource-table' && (
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
