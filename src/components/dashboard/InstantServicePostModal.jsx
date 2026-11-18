import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Send, X, Zap } from 'lucide-react';
import { createInstantService, fetchCategories, fetchDistricts } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { successToast } from '../../utils/alerts';
import { fmt, formatTaka, textToHtml } from '../../utils/jobs';
import SwalMessage from '../ui/SwalMessage';

const LocationPickerMap = lazy(() => import('../maps/LocationPickerMap'));

// API limits
const LIMITS = { title: 150, details: 5000, address: 300 };
const MAX_PRICE = 10000000;

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-green-500';

/**
 * Customers post a quick job with a price range; technicians bid inside that range.
 * Unlike regular service requests there is no upfront fee: the platform fee is paid after selecting a bid.
 * onPosted receives the created request.
 */
export default function InstantServicePostModal({ isOpen, onClose, onPosted }) {
  const { t } = useLanguage();
  const j = t.jobs;
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [form, setForm] = useState({ title: '', details: '', category: '', priceMin: '', priceMax: '', address: '', district: '', date: '', time: '' });
  const [coordinates, setCoordinates] = useState(null);
  const [image, setImage] = useState(null);
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

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchDistricts().then(setDistricts);
  }, []);

  // Focus the dialog on open, close on Escape, restore focus on close
  useEffect(() => {
    if (!isOpen) return undefined;
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
  }, [isOpen]);

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const priceMin = Number(form.priceMin);
    const priceMax = Number(form.priceMax);
    // Plain text with the customer's line breaks kept as paragraphs / <br> for HtmlContent
    const details = textToHtml(form.details);
    if (!form.title.trim() || !form.details.trim() || !form.address.trim()) {
      setError(j.instantFillRequired);
      return;
    }
    if (form.title.trim().length > LIMITS.title) {
      setError(fmt(j.titleTooLong, { max: LIMITS.title }));
      return;
    }
    if (details.length > LIMITS.details) {
      setError(j.detailsTooLong);
      return;
    }
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin <= 0 || priceMax < priceMin || priceMax > MAX_PRICE) {
      setError(fmt(j.priceRangeInvalid, { max: formatTaka(MAX_PRICE) }));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const created = await createInstantService({
        title: form.title.trim(),
        details,
        category: form.category,
        priceMin,
        priceMax,
        location: {
          address: form.address.trim(),
          ...(form.district ? { district: form.district } : {}),
          ...(coordinates ? { coordinates } : {}),
        },
        schedule: { date: form.date, time: form.time },
        image,
      });
      successToast(j.instantPosted);
      onPosted?.(created);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instant-post-title"
        tabIndex={-1}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:p-8"
      >
        <button
          onClick={onClose}
          type="button"
          disabled={submitting}
          aria-label={j.closeForm}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><Zap size={14} /> {j.instantService}</p>
        <h2 id="instant-post-title" className="mt-2 pr-10 text-2xl font-black text-slate-900 sm:text-3xl">{j.instantModalTitle}</h2>
        <p className="mt-2 text-sm text-slate-500">{j.instantModalSubtitle}</p>

        <SwalMessage message={error} />

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700 md:col-span-2">
            {j.title}
            <input required maxLength={LIMITS.title} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={j.instantTitlePlaceholder} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.category}
            <select value={form.category} onChange={(event) => update('category', event.target.value)} className={inputClass}>
              <option value="">{j.selectCategoryOptional}</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.photoOptional}
            <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.minPrice}
            <input required type="number" min={1} max={MAX_PRICE} value={form.priceMin} onChange={(event) => update('priceMin', event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.maxPrice}
            <input required type="number" min={1} max={MAX_PRICE} value={form.priceMax} onChange={(event) => update('priceMax', event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.fullAddress}
            <input required maxLength={LIMITS.address} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder={j.addressPlaceholder} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.district}
            <select value={form.district} onChange={(event) => update('district', event.target.value)} className={inputClass}>
              <option value="">{j.selectDistrictOptional}</option>
              {districts.map((district) => <option key={district._id} value={district.name}>{district.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.dateOptional}
            <input type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={(event) => update('date', event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {j.timeOptional}
            <input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} className={inputClass} />
          </label>
          <div className="text-sm font-bold text-slate-700 md:col-span-2">
            {j.pinLocation}
            <Suspense fallback={<div className="mt-2 h-64 animate-pulse rounded-xl bg-slate-100" />}>
              <div className="mt-2"><LocationPickerMap value={coordinates} onChange={setCoordinates} /></div>
            </Suspense>
          </div>
          <label className="text-sm font-bold text-slate-700 md:col-span-2">
            {j.details}
            <textarea required rows={5} maxLength={LIMITS.details} value={form.details} onChange={(event) => update('details', event.target.value)} placeholder={j.instantDetailsPlaceholder} className={inputClass} />
            <span className="mt-1 block text-right text-xs font-medium text-slate-400">{form.details.length}/{LIMITS.details}</span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{j.cancel}</button>
          <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:opacity-60">
            <Send size={16} /> {submitting ? j.posting : j.postInstantRequest}
          </button>
        </div>
      </form>
    </div>
  );
}
