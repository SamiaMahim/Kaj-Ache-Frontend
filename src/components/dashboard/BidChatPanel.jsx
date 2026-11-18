import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { fetchBidMessages, sendBidMessage } from '../../services/api';
import { useLiveAccount } from '../../hooks/useLiveAccount';
import SwalMessage from '../ui/SwalMessage';

export default function BidChatPanel({ bidId, gigStatus = '', role = 'customer' }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const account = useLiveAccount();

  const isClosed = ['completed', 'cancelled'].includes(gigStatus);

  useEffect(() => {
    if (!bidId) return undefined;
    let active = true;
    const loadMessages = async () => {
      try {
        const nextMessages = await fetchBidMessages(bidId);
        if (active) {
          setMessages(nextMessages || []);
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    };

    loadMessages();
    const intervalId = window.setInterval(loadMessages, 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [bidId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if (!content.trim() || isClosed) return;
    setSending(true);
    setError('');
    try {
      await sendBidMessage(bidId, content.trim());
      setContent('');
      const updatedMessages = await fetchBidMessages(bidId);
      setMessages(updatedMessages || []);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  };

  const isCurrentUser = (message) => {
    const senderId = message.sender?._id || message.sender;
    const myId = account?._id || account?.id;
    if (myId && senderId) return String(senderId) === String(myId);
    if (account?.name && message.sender?.username) {
      return account.name.toLowerCase() === message.sender.username.toLowerCase();
    }
    return false;
  };

  const isTechnician = role === 'technician';
  const headerSubtitle = isTechnician ? 'Chat with customer' : 'Chat with your technician';
  const headerBadge = isTechnician ? 'Assigned service request chat' : 'Selected bid chat';

  return (
    <section className="mt-6 rounded-3xl border border-green-200 bg-green-50/40 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white">
            <MessageCircle size={19} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">{headerBadge}</p>
            <h2 className="text-xl font-black text-slate-900">{headerSubtitle}</h2>
          </div>
        </div>
        {isClosed ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
            <CheckCircle2 size={14} className="text-green-600" /> Service Request {gigStatus} · Chat closed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live P2P Chat
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 border border-slate-100 shadow-inner"
      >
        {messages.length ? (
          messages.map((message) => {
            const mine = isCurrentUser(message);
            return (
              <div
                key={message._id}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 sm:max-w-[75%] ${
                    mine
                      ? 'bg-green-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className={`text-[11px] font-bold ${mine ? 'text-green-100' : 'text-slate-500'}`}>
                    {mine ? 'You' : message.sender?.username || 'Counterpart'}
                  </p>
                  <p className="mt-1 text-sm leading-6 break-words">{message.content}</p>
                  <p className={`mt-1 text-[10px] text-right ${mine ? 'text-green-200' : 'text-slate-500'}`}>
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-8 text-center text-sm font-semibold text-slate-500">
            No messages yet. Start the conversation directly with your {isTechnician ? 'customer' : 'technician'}.
          </p>
        )}
      </div>

      <SwalMessage message={error} />

      {isClosed ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600">
          This service request has been marked as {gigStatus}. Chat is now closed.
        </div>
      ) : (
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={`Message ${isTechnician ? 'customer' : 'technician'}...`}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 transition"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      )}
    </section>
  );
}