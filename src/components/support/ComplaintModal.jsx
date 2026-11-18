import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MessageSquareWarning, X } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../context/AuthContext';
import { submitComplaint } from '../../services/api';
import { successToast } from '../../utils/alerts';

const TITLE_MAX = 150;
const REASON_MAX = 2000;

/** General complaint form (not tied to a job); opened from the footer. */
export default function ComplaintModal({ onClose }) {
  const { t } = useLanguage();
  const c = t.complaint;
  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  // Escape closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    if (!title.trim() || !reason.trim()) {
      setError(c.required);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      await submitComplaint({ title: title.trim(), reason: reason.trim() });
      successToast(c.sent);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-rose-50 p-2 text-rose-600"><MessageSquareWarning size={20} /></span>
            <div>
              <h2 id="complaint-title" className="text-lg font-black text-slate-900">{c.title}</h2>
              <p className="text-xs text-slate-500 sm:text-sm">{c.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={c.cancel} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">{c.loginPrompt}</p>
            <Link to="/login" onClick={onClose} className="inline-block rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700">
              {c.login}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="complaint-subject" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{c.subject}</label>
              <input
                id="complaint-subject"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={c.subjectPlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="complaint-details" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{c.details}</label>
              <textarea
                id="complaint-details"
                value={reason}
                maxLength={REASON_MAX}
                rows={5}
                onChange={(e) => setReason(e.target.value)}
                placeholder={c.detailsPlaceholder}
                className={`${inputClass} resize-none`}
              />
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                {c.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {c.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
