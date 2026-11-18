import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, CreditCard, X } from 'lucide-react';
import PaymentCheckoutModal from './PaymentCheckoutModal';
import RichTextEditor from '../ui/RichTextEditor';
import { confirmRecruitmentPayment, createRecruitmentRequest } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { errorAlert, successToast } from '../../utils/alerts';
import { stripHtml } from '../../utils/html';
import { fmt, formatTaka } from '../../utils/jobs';
import SwalMessage from '../ui/SwalMessage';

// Matches the mobile app's create page; the details page uses the request's own platformFee
const POSTING_FEE = 300;
const EMPTY_FORM = { title: '', details: '', duration: '', salary: '' };
// API limits
const LIMITS = { title: 150, details: 5000, duration: 100 };
const MAX_SALARY = 10000000;

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-green-500';

/**
 * Same flow as the mobile app's "Hire a Technician" page: fill in the job, pay the posting fee,
 * and the post is created and opened for applications. The form hides while the payment step is
 * open and comes back with its values if payment is dismissed.
 * onPosted receives the created request, whether or not the payment went through.
 */
export default function RecruitmentPostModal({ isOpen, onClose, onPosted }) {
  const { t } = useLanguage();
  const j = t.jobs;
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Synchronous re-entry guard: state updates land too late to stop a fast double submit
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const closeRef = useRef({ onClose, submitting });
  useEffect(() => {
    closeRef.current = { onClose, submitting };
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const salary = Number(form.salary);
  const formVisible = isOpen && !showCheckout;

  // Focus the dialog on open, close on Escape, restore focus on close
  useEffect(() => {
    if (!formVisible) return undefined;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !closeRef.current.submitting) closeRef.current.onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [formVisible]);

  const openCheckout = (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError(j.enterJobTitle);
      return;
    }
    if (form.title.trim().length > LIMITS.title) {
      setError(fmt(j.titleTooLong, { max: LIMITS.title }));
      return;
    }
    if (!stripHtml(form.details)) {
      setError(j.enterJobDetails);
      return;
    }
    if (form.details.length > LIMITS.details) {
      setError(j.detailsTooLong);
      return;
    }
    if (!form.duration.trim()) {
      setError(j.enterDuration);
      return;
    }
    if (!Number.isFinite(salary) || salary <= 0 || salary > MAX_SALARY) {
      setError(fmt(j.salaryOutOfRange, { max: formatTaka(MAX_SALARY) }));
      return;
    }
    setError('');
    setShowCheckout(true);
  };

  // Create first, then pay. If payment fails the post stays pending and can be paid from its details page.
  const postAndPay = async ({ paymentMethod, transactionId }) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    let created;
    try {
      created = await createRecruitmentRequest({
        title: form.title.trim(),
        details: form.details,
        duration: form.duration.trim(),
        salary,
        image,
      });
    } catch (createError) {
      setError(createError.message);
      submittingRef.current = false;
      setSubmitting(false);
      setShowCheckout(false);
      return;
    }
    try {
      await confirmRecruitmentPayment(created._id, { paymentMethod, transactionId });
      successToast(j.jobPostedToast);
    } catch (payError) {
      errorAlert(j.paymentFailed, fmt(j.paymentFailedText, { message: payError.message }));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setShowCheckout(false);
    }
    setForm(EMPTY_FORM);
    setImage(null);
    onPosted?.(created);
  };

  if (!isOpen) return null;

  return (
    <>
      {formVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            ref={dialogRef}
            onSubmit={openCheckout}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruitment-post-title"
            tabIndex={-1}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:p-8"
          >
            <button
              onClick={onClose}
              type="button"
              aria-label={j.closeForm}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={20} />
            </button>

            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><BadgeCheck size={14} /> {j.recruitmentRequest}</p>
            <h2 id="recruitment-post-title" className="mt-2 pr-10 text-2xl font-black text-slate-900 sm:text-3xl">{j.hireATechnician}</h2>
            <p className="mt-2 text-sm text-slate-500">{fmt(j.recruitmentModalSubtitle, { fee: formatTaka(POSTING_FEE) })}</p>

            <SwalMessage message={error} />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                {j.jobTitle}
                <input required maxLength={LIMITS.title} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={j.jobTitlePlaceholder} className={inputClass} />
              </label>
              <label className="text-sm font-bold text-slate-700">
                {j.duration}
                <input required maxLength={LIMITS.duration} value={form.duration} onChange={(event) => update('duration', event.target.value)} placeholder={j.durationPlaceholder} className={inputClass} />
              </label>
              <label className="text-sm font-bold text-slate-700">
                {j.salaryBdt}
                <input required type="number" min={1} max={MAX_SALARY} value={form.salary} onChange={(event) => update('salary', event.target.value)} placeholder={j.salaryPlaceholder} className={inputClass} />
              </label>
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                {j.coverImageOptional}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm" />
                {image && <span className="mt-1 block text-xs font-medium text-slate-500">{fmt(j.selectedFile, { name: image.name })}</span>}
              </label>
              <div className="text-sm font-bold text-slate-700 md:col-span-2">
                {j.jobDetails}
                <p className="mt-1 text-xs font-medium text-slate-500">{j.jobDetailsHint}</p>
                <div className="mt-2 font-normal"><RichTextEditor value={form.details} onChange={(html) => update('details', html)} /></div>
              </div>
            </div>

            <div className="mt-6 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>{j.jobBudget}</span><span className="font-bold text-slate-900">{formatTaka(salary > 0 ? salary : 0)}{form.duration.trim() ? ` · ${form.duration.trim()}` : ''}</span></div>
              <div className="flex justify-between text-slate-600"><span>{j.platformFeePayNow}</span><span className="font-bold text-green-700">{formatTaka(POSTING_FEE)}</span></div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">{j.cancel}</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:opacity-60">
                <CreditCard size={16} /> {submitting ? j.posting : fmt(j.payAndPost, { fee: formatTaka(POSTING_FEE) })}
              </button>
            </div>
          </form>
        </div>
      )}

      <PaymentCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title={j.payToPost}
        subtitle={form.title.trim() || j.recruitmentRequest}
        lines={[{ label: j.platformFee, amount: POSTING_FEE }]}
        submitting={submitting}
        onConfirm={postAndPay}
      />
    </>
  );
}
