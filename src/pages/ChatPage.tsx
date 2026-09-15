import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiChatContacts, apiChatMessages, apiChatSend } from '../api';
import type { ChatContact, ChatMessage, PublicAccount } from '../types';

interface Props {
  account: PublicAccount;
  focusUser?: string | null;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function roleLabel(role: PublicAccount['role']): string {
  return role === 'superadmin' ? 'سوپر ادمین' : role === 'admin' ? 'ادمین' : 'کاربر';
}

export default function ChatPage({ account, focusUser }: Props) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(focusUser ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<PublicAccount | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await apiChatContacts();
      const nextContacts = res.contacts ?? [];
      setContacts(nextContacts);
      setSelectedUsername((current) => {
        if (focusUser && nextContacts.some((contact) => contact.username.toLowerCase() === focusUser.toLowerCase())) {
          return nextContacts.find((contact) => contact.username.toLowerCase() === focusUser.toLowerCase())!.username;
        }
        if (current && nextContacts.some((contact) => contact.username === current)) return current;
        return account.role === 'user' ? nextContacts[0]?.username ?? null : null;
      });
      if (res.error) setError(res.error);
    } catch {
      setError('خطا در دریافت فهرست گفت‌وگوها.');
    } finally {
      setLoadingContacts(false);
    }
  }, [account.role, focusUser]);

  const loadMessages = useCallback(async (username: string) => {
    setLoadingMessages(true);
    setError('');
    try {
      const res = await apiChatMessages(username);
      if (res.error) {
        setError(res.error);
        setMessages([]);
        return;
      }
      setSelectedContact(res.contact ?? null);
      setMessages(res.messages ?? []);
      window.dispatchEvent(new Event('notifications-updated'));
      void loadContacts();
    } catch {
      setError('خطا در دریافت پیام‌های این گفت‌وگو.');
    } finally {
      setLoadingMessages(false);
    }
  }, [loadContacts]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (selectedUsername) void loadMessages(selectedUsername);
    else {
      setSelectedContact(null);
      setMessages([]);
    }
  }, [loadMessages, selectedUsername]);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, selectedUsername]);

  const selected = useMemo(
    () => contacts.find((contact) => contact.username === selectedUsername) ?? selectedContact,
    [contacts, selectedContact, selectedUsername],
  );

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedUsername || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiChatSend(selectedUsername, text);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDraft('');
      await loadMessages(selectedUsername);
    } catch {
      setError('ارسال پیام انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  const selectContact = (username: string) => {
    setError('');
    setSelectedUsername(username);
  };

  return (
    <section className="chat-page rounded-2xl border border-line bg-surface p-5">
      <header className="chat-page-header">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent">DIRECT MESSAGES</p>
          <h1 className="mt-1 text-2xl font-extrabold">گفت‌وگو</h1>
          <p className="mt-1 text-sm leading-7 text-muted">
            {account.role === 'user'
              ? 'پیام خود را مستقیم برای ادمین مسئولتان ارسال کنید.'
              : 'کاربر را انتخاب کنید و گفت‌وگوی مستقیم خود را ادامه دهید.'}
          </p>
        </div>
        <span className="chat-page-icon" aria-hidden="true">💬</span>
      </header>

      {error && <p className="mt-4 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="chat-layout mt-5">
        <aside className="chat-contacts-panel">
          <div className="chat-panel-heading">
            <span>{account.role === 'user' ? 'ادمین مسئول' : 'کاربران'}</span>
            <span className="pill">{contacts.length}</span>
          </div>
          {loadingContacts ? (
            <p className="chat-empty">در حال بارگذاری…</p>
          ) : contacts.length === 0 ? (
            <p className="chat-empty">
              {account.role === 'user' ? 'هنوز ادمین مسئولی برای این حساب ثبت نشده است.' : 'هنوز کاربری برای گفت‌وگو وجود ندارد.'}
            </p>
          ) : (
            <div className="chat-contact-list">
              {contacts.map((contact) => (
                <button
                  type="button"
                  key={contact.username}
                  onClick={() => selectContact(contact.username)}
                  className={`chat-contact ${selectedUsername === contact.username ? 'is-selected' : ''}`}
                >
                  <span className="chat-avatar">{contact.username.slice(0, 1).toUpperCase()}</span>
                  <span className="chat-contact-copy">
                    <span className="chat-contact-name" dir="ltr">{contact.username}</span>
                    <span className="chat-contact-role">{roleLabel(contact.role)}</span>
                  </span>
                  {contact.unreadCount > 0 && <span className="chat-unread">{contact.unreadCount}</span>}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="chat-conversation">
          {!selected ? (
            <div className="chat-empty chat-empty-large">
              <span className="chat-empty-icon">💬</span>
              <strong>یک گفت‌وگو را انتخاب کنید</strong>
              <span>پیام‌های شما و پاسخ‌ها در اینجا نمایش داده می‌شوند.</span>
            </div>
          ) : (
            <>
              <header className="chat-conversation-header">
                <span className="chat-avatar">{selected.username.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong dir="ltr">{selected.username}</strong>
                  <span>{roleLabel(selected.role)} · گفت‌وگوی مستقیم</span>
                </div>
              </header>

              <div ref={messagesRef} className="chat-messages" aria-live="polite">
                {loadingMessages ? (
                  <p className="chat-empty">در حال بارگذاری پیام‌ها…</p>
                ) : messages.length === 0 ? (
                  <div className="chat-empty chat-empty-large">
                    <span className="chat-empty-icon">✉️</span>
                    <strong>اولین پیام را ارسال کنید</strong>
                    <span>این گفت‌وگو هنوز پیامی ندارد.</span>
                  </div>
                ) : (
                  messages.map((message) => {
                    const own = message.sender.toLowerCase() === account.username.toLowerCase();
                    return (
                      <div key={message.id} className={`chat-message-row ${own ? 'is-own' : ''}`}>
                        <article className="chat-bubble">
                          <p dir="auto">{message.text}</p>
                          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                        </article>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="chat-composer" onSubmit={send}>
                <textarea
                  dir="auto"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  maxLength={4000}
                  placeholder="پیام خود را بنویسید…"
                />
                <div className="chat-composer-footer">
                  <span>{draft.length}/۴۰۰۰</span>
                  <button type="submit" disabled={busy || !draft.trim()}>
                    {busy ? 'در حال ارسال…' : 'ارسال پیام'} <span aria-hidden="true">↑</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </section>
  );
}
