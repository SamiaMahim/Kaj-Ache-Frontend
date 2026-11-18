import { useState } from 'react';
import { CalendarDays, Hourglass, MapPin, Pencil, Play, Send, Wallet, Zap } from 'lucide-react';
import HtmlContent from '../components/content/HtmlContent';
import NotApprovedNotice from '../components/dashboard/NotApprovedNotice';
import ReportProblemButton from '../components/dashboard/ReportProblemButton';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { fetchAvailableInstantServices, fetchInstantProviderBids, placeInstantBid, startInstantJob, updateInstantBid } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import usePagedList from '../hooks/usePagedList';
import { confirmDialog, successToast } from '../utils/alerts';
import { enumLabel, fmt, formatTaka, placeText } from '../utils/jobs';
import SwalMessage from '../components/ui/SwalMessage';
import PostImage from '../components/ui/PostImage';

const REFRESH_MS = 8000;

const formFromBid = (item, bid) => ({
  price: bid?.price ?? item.priceMin ?? '',
  estimatedArrival: bid?.estimatedArrival || '30 mins',
  message: bid?.message || '',
});

// `bid` is the technician's own bid on this job (myBid from /available), or null
function InstantBidForm({ item, bid, onSaved }) {
  const { t } = useLanguage();
  const j = t.jobs;
  // The bid returned by the last save, shown until the next refresh brings myBid
  const [savedBid, setSavedBid] = useState(null);
  const currentBid = bid || savedBid;
  const [form, setForm] = useState(() => formFromBid(item, currentBid));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (currentBid && !editing) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
        <span>{fmt(j.yourBid, { price: formatTaka(currentBid.price) })} · {enumLabel(j.bidStatus, currentBid.status)}</span>
        {currentBid.status === 'active' && (
          <button
            type="button"
            onClick={() => { setForm(formFromBid(item, currentBid)); setEditing(true); }}
            className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-bold text-green-700 hover:border-green-500"
          >
            <Pencil size={13} /> {j.editBid}
          </button>
        )}
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < item.priceMin || price > item.priceMax) {
      setError(fmt(j.priceOutOfRange, { min: formatTaka(item.priceMin), max: formatTaka(item.priceMax) }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = currentBid?._id
        ? await updateInstantBid(item._id, currentBid._id, form)
        : await placeInstantBid(item._id, form);
      successToast(currentBid?._id ? j.bidUpdated : j.bidSent);
      if (saved?._id) setSavedBid(saved);
      setEditing(false);
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
      if (saveError.status === 409) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-500">
          {fmt(j.yourPriceRange, { min: formatTaka(item.priceMin), max: formatTaka(item.priceMax) })}
          <input type="number" required min={item.priceMin} max={item.priceMax} value={form.price} onChange={(event) => update('price', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" />
        </label>
        <label className="text-xs font-bold text-slate-500">
          {j.estimatedArrival}
          <input required maxLength={50} value={form.estimatedArrival} onChange={(event) => update('estimatedArrival', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" />
        </label>
      </div>
      <textarea rows={2} maxLength={500} value={form.message} onChange={(event) => update('message', event.target.value)} placeholder={j.bidMessagePlaceholder} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-500" />
      <SwalMessage message={error} />
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
          <Send size={16} /> {saving ? j.sending : currentBid?._id ? j.updateBid : j.sendBid}
        </button>
        {currentBid && (
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">{j.cancel}</button>
        )}
      </div>
    </form>
  );
}

export default function TechnicianInstantServicesView() {
  const { t } = useLanguage();
  const j = t.jobs;
  const [error, setError] = useState('');
  const [starting, setStarting] = useState('');
  // Bumped after a bid or start so the lists reload immediately
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  const available = usePagedList(fetchAvailableInstantServices, { refreshMs: REFRESH_MS, reloadKey });
  const myBids = usePagedList(fetchInstantProviderBids, { refreshMs: REFRESH_MS, reloadKey });
  const forbidden = available.error?.status === 403;
  const loadError = (!forbidden && available.error?.message) || myBids.error?.message || '';

  const myJobs = myBids.items.filter((bid) => bid.status === 'selected' && bid.instantService && bid.instantService.status !== 'cancelled');

  const start = async (job) => {
    if (starting) return;
    const confirmed = await confirmDialog({ title: j.startJobTitle, text: j.startJobText, confirmText: j.startJobConfirm, cancelText: j.cancel });
    if (!confirmed) return;
    setStarting(job._id);
    try {
      await startInstantJob(job._id);
      successToast(j.jobStarted);
      reload();
    } catch (startError) {
      setError(startError.message);
      if (startError.status === 409) reload();
    } finally {
      setStarting('');
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><Zap size={14} /> {j.instantService}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{j.techInstantTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{j.techInstantSubtitle}</p>
      </div>
      <SwalMessage message={error} />
      {loadError && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>}

      <section className="mb-8 rounded-3xl border border-green-200 bg-green-50/50 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-black text-slate-900">{j.myInstantJobs}</h2>
          <span className="text-sm font-bold text-green-700">{myJobs.length}</span>
        </div>
        {!myBids.loaded ? (
          <p className="mt-4 text-sm text-slate-500">{j.loading}</p>
        ) : myJobs.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {myJobs.map((bid) => {
              const job = bid.instantService;
              const waitingPayment = job.status === 'bid_selected' && job.paymentStatus !== 'paid';
              return (
                <div key={bid._id} className="rounded-2xl border border-green-200 bg-white p-4">
                  <p className="font-black text-slate-900">{job.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{fmt(j.yourPrice, { price: formatTaka(bid.price) })} · {enumLabel(j.instantStatus, job.status)}</p>
                  {placeText(job.location) && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} /> {placeText(job.location)}</p>}
                  {waitingPayment && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-700"><Hourglass size={14} /> {j.waitingCustomerPayment}</p>}
                  {job.status === 'bid_selected' && job.paymentStatus === 'paid' && (
                    <button type="button" onClick={() => start(job)} disabled={Boolean(starting)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                      <Play size={15} /> {starting === job._id ? j.starting : j.startJob}
                    </button>
                  )}
                  {job.status === 'in_progress' && <p className="mt-3 text-xs font-bold text-green-700">{j.inProgressTech}</p>}
                  {job.status === 'completed' && <p className="mt-3 text-xs font-bold text-green-700">{j.instantStatus.completed}</p>}
                  <div className="mt-3"><ReportProblemButton instantService={job._id} /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{j.noInstantJobsYet}</p>
        )}
      </section>

      {forbidden ? (
        <NotApprovedNotice message={available.error.message} />
      ) : !available.loaded ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          {[0, 1].map((key) => <div key={key} className="h-56 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {available.items.map((item) => (
              <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <PostImage image={item.image} icon={Zap} className="h-14 w-14 shrink-0 rounded-2xl" />
                    <div className="min-w-0">
                      {item.category?.name && <span className="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{item.category.name}</span>}
                      <h2 className="mt-3 text-xl font-black text-slate-900">{item.title}</h2>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm font-black text-green-600"><Wallet size={16} /> {formatTaka(item.priceMin)}–{formatTaka(item.priceMax)}</div>
                </div>
                <HtmlContent html={item.details} className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600" />
                <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                  {placeText(item.location) && <span className="flex items-center gap-1"><MapPin size={14} /> {placeText(item.location)}</span>}
                  <span className="flex items-center gap-1"><CalendarDays size={14} /> {item.schedule?.date ? `${item.schedule.date} ${item.schedule.time || ''}` : j.asSoonAsPossible}</span>
                </div>
                {/* Remounts once myBid arrives so the form state follows the saved bid */}
                <InstantBidForm key={item.myBid?._id || 'new'} item={item} bid={item.myBid} onSaved={reload} />
              </article>
            ))}
          </div>
          <LoadMoreButton list={available} />
          {!available.items.length && !available.error && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Zap className="mx-auto text-slate-300" size={34} />
              <h2 className="mt-4 text-lg font-black text-slate-800">{j.noOpenInstantJobs}</h2>
              <p className="mt-2 text-sm text-slate-500">{j.newRequestsAppear}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
