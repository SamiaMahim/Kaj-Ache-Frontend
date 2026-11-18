import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, CreditCard, Hourglass, MapPin, Star, UserRound, Wallet, Zap } from 'lucide-react';
import { useParams } from 'react-router-dom';
import HtmlContent from '../components/content/HtmlContent';
import JobReviewForm from '../components/dashboard/JobReviewForm';
import PaymentCheckoutModal from '../components/dashboard/PaymentCheckoutModal';
import ReportProblemButton from '../components/dashboard/ReportProblemButton';
import TechnicianProfileModal from '../components/dashboard/TechnicianProfileModal';
import { cancelInstantService, completeInstantService, confirmInstantPayment, fetchInstantService, selectInstantBid } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { confirmDialog, reasonDialog, successToast } from '../utils/alerts';
import { INSTANT_STATUS_STYLES, PAYMENT_STATUS_STYLES, enumLabel, fmt, formatTaka, placeText } from '../utils/jobs';
import SwalMessage from '../components/ui/SwalMessage';
import PostImage from '../components/ui/PostImage';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};
const FINAL_STATUSES = ['completed', 'cancelled'];

export default function CustomerInstantDetailsView() {
  const { id } = useParams();
  const { t } = useLanguage();
  const j = t.jobs;
  const tp = t.technicianProfile;
  const [profileTarget, setProfileTarget] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  // Load errors come from polling; action errors stay until the next action
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  // Bumped after an action so the request reloads immediately
  const [reloadKey, setReloadKey] = useState(0);
  const status = item?.status;
  const isFinal = FINAL_STATUSES.includes(status);

  // Load, then keep refreshing while bids arrive or the technician starts the job
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchInstantService(id);
        if (active) { setItem(data); setLoadError(''); }
      } catch (fetchError) {
        if (active) setLoadError(fetchError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const intervalId = isFinal ? null : window.setInterval(load, 8000);
    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [id, reloadKey, isFinal]);

  if (loading && !item) return <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">{j.loadingInstant}</div>;
  if (!item) return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-red-600">{loadError || j.instantNotFound}</p>
    </div>
  );

  const selectedBidId = item.selectedBid?._id || item.selectedBid;
  const platformFee = Number(item.platformFee ?? 500);
  const isPaid = item.paymentStatus === 'paid';
  const paymentDue = item.status === 'bid_selected' && !isPaid;
  // The API allows cancelling until work starts; a paid fee becomes a refund request
  const canCancel = item.status === 'bidding_open' || item.status === 'bid_selected';
  const selectedBid = (item.bids || []).find((bid) => String(bid._id) === String(selectedBidId) || bid.status === 'selected');
  const selectedName = selectedBid && (selectedBid.provider?.profileDetail?.fullName || selectedBid.provider?.username);

  const run = async (key, action, message) => {
    if (busy) return false;
    setBusy(key);
    setError('');
    try {
      await action();
      successToast(message);
      setReloadKey((current) => current + 1);
      return true;
    } catch (actionError) {
      setError(actionError.message);
      // Someone else changed the request first: show its current state
      if (actionError.status === 409) setReloadKey((current) => current + 1);
      return false;
    } finally {
      setBusy('');
    }
  };

  const selectBid = async (bid) => {
    const confirmed = await confirmDialog({
      title: j.chooseTechnicianTitle,
      text: fmt(j.chooseTechnicianText, { fee: formatTaka(platformFee), price: formatTaka(bid.price) }),
      confirmText: j.chooseTechnicianConfirm,
      cancelText: j.cancel,
    });
    if (confirmed && await run(`select-${bid._id}`, () => selectInstantBid(item._id, bid._id), j.technicianSelected)) {
      setShowCheckout(true);
    }
  };

  const cancel = async () => {
    const reason = await reasonDialog({
      title: j.cancelRequestTitle,
      text: isPaid ? fmt(j.cancelPaidText, { fee: formatTaka(platformFee) }) : j.cannotBeUndone,
      placeholder: j.reasonOptional,
      confirmText: j.yesCancel,
      danger: true,
    });
    if (reason !== null) run('cancel', () => cancelInstantService(item._id, reason), isPaid ? j.cancelledRefundRequested : j.requestCancelled);
  };

  const complete = async () => {
    const confirmed = await confirmDialog({ title: j.markCompletedTitle, text: j.markCompletedText, confirmText: j.markCompletedConfirm, cancelText: j.cancel });
    if (confirmed) run('complete', () => completeInstantService(item._id), j.requestCompleted);
  };

  const pay = async ({ paymentMethod, transactionId }) => {
    if (busy) return;
    setBusy('pay');
    setError('');
    try {
      await confirmInstantPayment(item._id, { paymentMethod, transactionId });
      setShowCheckout(false);
      successToast(j.paymentConfirmed);
      setReloadKey((current) => current + 1);
    } catch (payError) {
      setError(payError.message);
      if (payError.status === 409) {
        setShowCheckout(false);
        setReloadKey((current) => current + 1);
      }
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">{j.instantRequest}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{item.title}</h1>
            {item.category?.name && <p className="mt-2 text-sm text-slate-500">{item.category.name}</p>}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${INSTANT_STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.instantStatus, item.status)}</span>
            {item.paymentStatus && item.paymentStatus !== 'unpaid' && (
              <span className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${PAYMENT_STATUS_STYLES[item.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.paymentStatus, item.paymentStatus)}</span>
            )}
          </div>
        </div>

        <PostImage image={item.image} icon={Zap} className="mt-6 aspect-[16/9] w-full rounded-2xl" iconSize={48} />

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <span className="flex items-center gap-2"><Wallet size={16} /> {formatTaka(item.priceMin)}–{formatTaka(item.priceMax)}</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> {placeText(item.location)}</span>
          <span className="flex items-center gap-2"><CalendarDays size={16} /> {item.schedule?.date ? `${item.schedule.date} ${item.schedule.time || ''}` : j.asSoonAsPossible}</span>
        </div>

        <HtmlContent html={item.details} className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600" />

        <SwalMessage message={error} />
        {loadError && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>}

        {paymentDue && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CreditCard size={22} /></div>
              <div>
                <p className="text-base font-bold text-amber-900">{j.platformFeeDue}</p>
                <p className="mt-0.5 text-xs text-amber-800">{fmt(j.platformFeeDueText, { fee: formatTaka(platformFee) })}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowCheckout(true)} className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700">{fmt(j.payAmount, { amount: formatTaka(platformFee) })}</button>
          </div>
        )}
        {item.status === 'bid_selected' && isPaid && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
            <Hourglass size={20} className="shrink-0 text-sky-600" />
            <p className="text-sm font-medium">{j.paidWaitingStart}</p>
          </div>
        )}
        {item.status === 'cancelled' && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="text-sm">
              <p className="font-bold">{item.cancelledBy === 'admin' ? j.cancelledByAdmin : j.cancelledByYou}</p>
              {item.cancellationReason && <p className="mt-1">{fmt(j.cancellationReason, { reason: item.cancellationReason })}</p>}
              {item.paymentStatus === 'refund_pending' && <p className="mt-1">{j.refundPendingNote}</p>}
              {item.paymentStatus === 'refunded' && <p className="mt-1">{j.refundedNote}</p>}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {canCancel && (
              <button type="button" onClick={cancel} disabled={Boolean(busy)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                {busy === 'cancel' ? j.cancelling : j.cancelRequest}
              </button>
            )}
            {item.status === 'in_progress' && <p className="text-xs text-slate-500">{j.cannotCancelStarted}</p>}
            <ReportProblemButton instantService={item._id} />
          </div>
          {item.status === 'in_progress' && (
            <button type="button" onClick={complete} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
              <CheckCircle2 size={16} /> {busy === 'complete' ? j.completing : j.markCompleted}
            </button>
          )}
          {item.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 px-4 py-2 text-sm font-bold text-green-800"><CheckCircle2 size={17} /> {j.instantStatus.completed}</span>
          )}
        </div>
      </div>

      {item.status === 'completed' && <JobReviewForm instantServiceId={item._id} technicianName={selectedName} />}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">{j.technicianBids}</h2>
          <span className="text-sm font-bold text-slate-500">{fmt(j.bidsCount, { count: item.bids?.length || 0 })}</span>
        </div>
        {item.bids?.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {item.bids.map((bid) => {
              const profile = bid.provider?.profileDetail || {};
              const isSelected = String(bid._id) === String(selectedBidId) || bid.status === 'selected';
              const name = profile.fullName || bid.provider?.username || j.technician;
              const target = { id: bid.provider?._id, name, avatar: profile.avatar, rating: profile.rating, totalJobsCompleted: profile.totalJobsCompleted };
              return (
                <article key={bid._id} className={`rounded-2xl border p-5 ${isSelected ? 'border-green-300 bg-green-50/50 ring-2 ring-green-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setProfileTarget(target)} aria-label={fmt(tp.viewProfileOf, { name })} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-black text-slate-500 hover:ring-2 hover:ring-green-300">
                        {profile.avatar ? <img src={resolveImage(profile.avatar)} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
                      </button>
                      <div>
                        <h3 className="text-lg font-black text-slate-900"><button type="button" onClick={() => setProfileTarget(target)} className="text-left hover:text-green-700 hover:underline">{name}</button></h3>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-green-600"><Star size={14} /> {profile.rating != null ? Number(profile.rating).toFixed(1) : j.noRating} · {fmt(j.jobsCount, { count: profile.totalJobsCompleted || 0 })}</p>
                        <button type="button" onClick={() => setProfileTarget(target)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 hover:underline"><UserRound size={13} /> {tp.viewProfile}</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">{formatTaka(bid.price)}</p>
                      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500"><Clock3 size={13} /> {bid.estimatedArrival || j.arrivalNotSpecified}</p>
                    </div>
                  </div>
                  {bid.message && <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{bid.message}</p>}
                  {item.status === 'bidding_open' && bid.status === 'active' && (
                    <button type="button" onClick={() => selectBid(bid)} disabled={Boolean(busy)} className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                      {busy === `select-${bid._id}` ? j.selecting : j.chooseTechnician}
                    </button>
                  )}
                  {isSelected && <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">{j.selectedTechnician}</p>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">{j.noBidsYet}</div>
        )}
      </section>

      {profileTarget && <TechnicianProfileModal key={profileTarget.id} technician={profileTarget} onClose={() => setProfileTarget(null)} />}

      <PaymentCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title={j.payPlatformFee}
        subtitle={j.instantService}
        lines={[{ label: j.platformFee, amount: platformFee }]}
        submitting={busy === 'pay'}
        onConfirm={pay}
      />
    </div>
  );
}
