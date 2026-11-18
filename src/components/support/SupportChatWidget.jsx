import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headset, Loader2, Send, X } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../context/AuthContext';
import { fetchSupportThread, markSupportThreadRead, sendSupportMessage } from '../../services/api';

// Open: refresh the thread often so replies show up quickly. Closed: only
// check now and then for the unread badge.
const OPEN_POLL_MS = 5000;
const CLOSED_POLL_MS = 30000;
const MAX_MESSAGE_LENGTH = 1000;

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Floating "chat with support" button + panel, on every page. Uses the same
 * support thread as the app; admins answer from the dashboard's Support Chat.
 */
export default function SupportChatWidget() {
  const { t } = useLanguage();
  const s = t.support;
  const { isAuthenticated } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const unread = messages.filter((m) => m.sender === 'admin' && !m.read).length;

  const load = useCallback(async () => {
    try {
      const data = await fetchSupportThread();
      setMessages(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch {
      setLoadError(s.loadFailed);
    }
  }, [s.loadFailed]);

  // Poll while signed in; faster while the panel is open
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    const tick = () => {
      if (!cancelled && document.visibilityState === 'visible') load();
    };
    tick();
    const timer = window.setInterval(tick, open ? OPEN_POLL_MS : CLOSED_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, open, load]);

  // Opening the panel marks the team's replies read
  useEffect(() => {
    if (!open || !isAuthenticated || unread === 0) return;
    markSupportThreadRead()
      .then(() => setMessages((prev) => prev.map((m) => (m.sender === 'admin' ? { ...m, read: true } : m))))
      .catch(() => { /* retried on the next open */ });
  }, [open, isAuthenticated, unread]);

  // Keep the newest message in view
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && isAuthenticated && messages.length === 0) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const saved = await sendSupportMessage(text);
      setDraft('');
      setMessages((prev) => [...prev, saved && saved._id ? saved : { _id: `local-${Date.now()}`, sender: 'user', message: text, createdAt: new Date().toISOString() }]);
    } catch {
      setLoadError(s.sendFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    // Above the mobile bottom nav (md:hidden) on phones, bottom corner on desktop
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <section
          aria-label={s.title}
          className="flex h-[min(32rem,calc(100vh-10rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
        >
          <header className="flex items-start justify-between gap-3 bg-green-700 px-4 py-3 text-white">
            <div>
              <h2 className="text-sm font-bold">{s.title}</h2>
              <p className="text-xs text-green-100">{s.subtitle}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={s.close} className="rounded-lg p-1 hover:bg-white/10">
              <X size={18} />
            </button>
          </header>

          {!isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <Headset size={36} className="text-green-600" />
              <p className="text-sm text-slate-600">{s.loginPrompt}</p>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
              >
                {s.login}
              </Link>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="px-4 pt-10 text-center text-sm text-slate-500">{s.empty}</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender === 'user';
                    return (
                      <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            mine ? 'rounded-br-md bg-green-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          {!mine && <p className="mb-0.5 text-[11px] font-bold text-green-700">{s.team}</p>}
                          <p className="whitespace-pre-line break-words">{m.message}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-green-100' : 'text-slate-400'}`}>{formatTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {loadError && <p className="border-t border-rose-100 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{loadError}</p>}

              <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 bg-white p-2.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter adds a line
                    if (e.key === 'Enter' && !e.shiftKey) send(e);
                  }}
                  rows={1}
                  placeholder={s.placeholder}
                  aria-label={s.placeholder}
                  className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-green-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label={s.send}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? s.close : s.open}
        aria-expanded={open}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-700/30 transition hover:scale-105 hover:bg-green-700"
      >
        {open ? <X size={24} /> : <Headset size={24} />}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
