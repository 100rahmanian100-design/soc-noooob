import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiListComments, apiPostComment } from '../api';
import type { CommentItem, PublicAccount } from '../types';
import { ROLE_LABEL } from '../types';

interface Props {
  phase: string;
  phaseTitle: string;
  account: PublicAccount;
  /** deep-link از مرکز اعلان‌ها: شناسه کامنت هدف */
  focusId?: string | null;
  focusNonce?: number;
}

const roleBadge = (role: string) =>
  role === 'superadmin'
    ? 'border-brand/60 bg-brand/10 text-brand-soft'
    : role === 'admin'
      ? 'border-warn/50 bg-warn/10 text-warn'
      : 'border-line bg-raised text-muted';

function fmtDate(iso: string): string {
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

export default function CommentSection({ phase, phaseTitle, account, focusId, focusNonce }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = account.role !== 'user';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiListComments(phase);
      setComments(res.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [phase]);

  useEffect(() => {
    void load();
  }, [load]);

  /** هايلایت + اسکرول به پیام هدف (deep-link اعلان) */
  useEffect(() => {
    if (!focusId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`c-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-target');
        window.setTimeout(() => el.classList.remove('flash-target'), 2600);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [focusId, focusNonce, comments]);

  const roots = useMemo(() => comments.filter((c) => c.parentId === null), [comments]);
  const repliesOf = useCallback(
    (id: string) => comments.filter((c) => c.parentId === id),
    [comments],
  );

  const postRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    const res = await apiPostComment(phase, text.trim());
    if (res.error) {
      setError(res.error);
      return;
    }
    setText('');
    await load();
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const postReply = async (parentId: string) => {
    const draft = (replyDrafts[parentId] ?? '').trim();
    if (!draft) return;
    setBusyId(parentId);
    setError('');
    const res = await apiPostComment(phase, draft, parentId);
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setReplyDrafts((d) => ({ ...d, [parentId]: '' }));
    await load();
    window.dispatchEvent(new Event('notifications-updated'));
  };

  return (
    <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <span className="inline-block h-5 w-1.5 rounded bg-accent" />
        گفت‌وگو و پرسش‌وپاسخ {phaseTitle}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {account.role === 'user'
          ? 'پیام شما برای ادمین/کارشناس مسئول شما ارسال می‌شود و پاسخ او را همین‌جا می‌بینید.'
          : 'پیام‌های کاربرانِ ساخته‌شده توسط شما (یا همه، در حالت سوپر ادمین) در این فاز اینجاست.'}
      </p>
      {/* فرم ارسال پیام (کاربر) */}
      {account.role === 'user' && (
        <form onSubmit={postRoot} className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="سؤال یا نظر خود را درباره این فاز بنویسید…"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted">{text.length}/۴۰۰۰</span>
            <button
              type="submit"
              disabled={!text.trim()}
              className="rounded-lg border-0 bg-accent px-4 py-2 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50"
            >
              ارسال پیام
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-xs text-brand-soft">
          {error}
        </p>
      )}

      {/* فهرست پیام‌ها */}
      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری گفت‌وگو…</p>
      ) : roots.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {isAdmin ? 'هنوز پیامی از کاربران نیست.' : 'هنوز پیامی ثبت نکرده‌اید.'}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {roots.map((root) => {
            const replies = repliesOf(root.id);
            return (
              <li key={root.id} id={`c-${root.id}`} className="rounded-xl border border-line bg-bg p-4">
                <ThreadPost c={root} />
                {replies.length > 0 && (
                  <ul className="mt-3 space-y-3 border-e-2 border-line pe-3 ms-6">
                    {replies.map((r) => (
                      <li key={r.id} id={`c-${r.id}`}>
                        <ThreadPost c={r} reply />
                      </li>
                    ))}
                  </ul>
                )}

                {/* جعبه پاسخ ادمین */}
                {isAdmin && (
                  <div className="mt-3 ms-6">
                    <textarea
                      dir="auto"
                      value={replyDrafts[root.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((d) => ({ ...d, [root.id]: e.target.value }))
                      }
                      rows={2}
                      maxLength={4000}
                      placeholder="پاسخ به این پیام…"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => postReply(root.id)}
                      disabled={busyId === root.id || !(replyDrafts[root.id] ?? '').trim()}
                      className="mt-2 rounded-lg border border-accent bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-ink disabled:opacity-50"
                    >
                      {busyId === root.id ? 'در حال ارسال…' : 'پاسخ'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ThreadPost({ c, reply = false }: { c: CommentItem; reply?: boolean }) {
  return (
    <article>
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">{c.author}</span>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(c.authorRole)}`}
        >
          {ROLE_LABEL[c.authorRole]}
        </span>
        {reply && <span className="text-[10px] text-muted">↩ پاسخ</span>}
        <span className="ms-auto text-[10px] text-muted">{fmtDate(c.createdAt)}</span>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{c.text}</p>
      {!reply && (
        <p className="mt-2">
          {c.answered ? (
            <span className="rounded-md border border-ok/40 bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
              ✓ پاسخ داده شد
            </span>
          ) : (
            <span className="rounded-md border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
              ⏳ در انتظار پاسخ
            </span>
          )}
        </p>
      )}
    </article>
  );
}

