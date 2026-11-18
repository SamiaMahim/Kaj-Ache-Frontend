import { useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, CreditCard, MapPin, Star, UserRound, Users, Wallet } from 'lucide-react';
import { useParams } from 'react-router-dom';
import HtmlContent from '../components/content/HtmlContent';
import JobReviewForm from '../components/dashboard/JobReviewForm';
import PaymentCheckoutModal from '../components/dashboard/PaymentCheckoutModal';
import ReportProblemButton from '../components/dashboard/ReportProblemButton';
import TechnicianProfileModal from '../components/dashboard/TechnicianProfileModal';
import { cancelRecruitmentRequest, confirmRecruitmentPayment, endRecruitmentRequest, fetchRecruitmentRequest, selectRecruitmentBid } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { confirmDialog, reasonDialog, successToast } from '../utils/alerts';
import { PAYMENT_STATUS_STYLES, enumLabel, fmt, formatTaka } from '../utils/jobs';
import { RECRUITMENT_STATUS } from '../utils/recruitment';
import SwalMessage from '../components/ui/SwalMessage';
import PostImage from '../components/ui/PostImage';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};
const FINAL_STATUSES = ['ended', 'cancelled'];
// The API lets the client cancel until the engagement ends
const CANCELLABLE = ['pending_payment', 'hiring_open', 'hired'];

export default function CustomerRecruitmentDetailsView() {
  const { id } = useParams();
  const { t } = useLanguage();
  const j = t.jobs;
  const tp = t.technicianProfile;
  const [profileTarget, setProfileTarget] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  // Polling only touches loadError, so an action error stays visible until the next action
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  // Bumped after an action so the post reloads immediately
  const [reloadKey, setReloadKey] = useState(0);
  const isFinal = FINAL_STATUSES.includes(item?.status);

  // Load, then keep refreshing while applications arrive
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchRecruitmentRequest(id);
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

  if (loading && !item) return <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">{j.loadingJobPost}</div>;
  if (!item) return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-red-600">{loadError || j.jobPostNotFound}</p>
    </div>
  );

  const status = RECRUITMENT_STATUS[item.status];
  const selectedBidId = item.selectedBid?._id || item.selectedBid;
  const platformFee = Number(item.platformFee ?? 300);
  const paymentDue = item.status === 'pending_payment' && item.paymentStatus !== 'paid';
  const canCancel = CANCELLABLE.includes(item.status);
  const location = [item.location?.address, item.location?.area, item.location?.city, item.location?.district].filter(Boolean).join(', ');
  const hiredBid = (item.bids || []).find((bid) => String(bid._id) === String(selectedBidId) || bid.status === 'selected');
  const hiredName = hiredBid && (hiredBid.applicant?.profileDetail?.fullName || hiredBid.applicant?.username);

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
      // Someone else changed the post first: show its current state
      if (actionError.status === 409) setReloadKey((current) => current + 1);
      return false;
    } finally {
      setBusy('');
    }
  };

  const hire = async (bid, name) => {
    const confirmed = await confirmDialog({
      title: fmt(j.hireTitle, { name }),
      text: fmt(j.hireText, { salary: formatTaka(bid.proposedSalary) }),
      confirmText: j.hireConfirm,
      cancelText: j.cancel,
    });
    if (confirmed) run(`hire-${bid._id}`, () => selectRecruitmentBid(item._id, bid._id), j.hiredToast);
  };

  // What happens to the posting fee depends on how far the post got
  const cancelText = () => {
    if (item.status === 'hired') return fmt(j.cancelHiredText, { fee: formatTaka(platformFee) });
    if (item.status === 'hiring_open' && item.paymentStatus === 'paid') return fmt(j.cancelPaidText, { fee: formatTaka(platformFee) });
    return j.cannotBeUndone;
  };

  const cancel = async () => {
    const reason = await reasonDialog({ title: j.cancelJobPostTitle, text: cancelText(), placeholder: j.cancelJobPostReason, confirmText: j.yesCancel, danger: true });
    if (reason === null) return;
    const refundRequested = item.status === 'hiring_open' && item.paymentStatus === 'paid';
    const message = refundRequested ? j.cancelledRefundRequested : j.jobPostCancelled;
    run('cancel', () => cancelRecruitmentRequest(item._id, reason), message);
  };

  const end = async () => {
    const confirmed = await confirmDialog({ title: j.endEngagementTitle, text: j.endEngagementText, confirmText: j.endEngagementConfirm, cancelText: j.cancel });
    if (confirmed) run('end', () => endRecruitmentRequest(item._id), j.engagementEndedToast);
  };

  const pay = async ({ paymentMethod, transactionId }) => {
    if (busy) return;
    setBusy('pay');
    setError('');
    try {
      await confirmRecruitmentPayment(item._id, { paymentMethod, transactionId });
      setShowCheckout(false);
      successToast(j.jobPostedToast);
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
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><BadgeCheck size={14} /> {j.jobPost}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{item.title || j.jobPost}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><Clock3 size={15} /> {item.duration || j.durationNotSpecified}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${status?.className || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.recruitmentStatus, item.status)}</span>
            {item.paymentStatus && (
              <span className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${PAYMENT_STATUS_STYLES[item.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.paymentStatus, item.paymentStatus)}</span>
            )}
          </div>
        </div>

        <PostImage image={item.image} icon={BadgeCheck} className="mt-6 aspect-[16/9] w-full rounded-2xl" iconSize={48} />

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <span className="flex items-center gap-2"><Wallet size={16} /> {item.duration ? fmt(j.salaryWithDuration, { salary: formatTaka(item.salary), duration: item.duration }) : fmt(j.salaryOnly, { salary: formatTaka(item.salary) })}</span>
          <span className="flex items-center gap-2"><CreditCard size={16} /> {fmt(j.platformFeeAmount, { fee: formatTaka(platformFee) })}</span>
          <span className="flex items-center gap-2"><Users size={16} /> {fmt(j.applicantsCount, { count: item.bidsCount ?? item.bids?.length ?? 0 })}</span>
          {location && <span className="flex items-center gap-2 sm:col-span-3"><MapPin size={16} /> {location}</span>}
        </div>

        <HtmlContent html={item.details} className="mt-6 text-sm leading-7 text-slate-600" />

        <SwalMessage message={error} />
        {loadError && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>}

        {paymentDue && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CreditCard size={22} /></div>
              <div>
                <p className="text-base font-bold text-amber-900">{j.paymentRequired}</p>
                <p className="mt-0.5 text-xs text-amber-800">{j.paymentRequiredText}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowCheckout(true)} className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700">{fmt(j.payAmount, { amount: formatTaka(platformFee) })}</button>
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
              {item.paymentStatus === 'forfeited' && <p className="mt-1">{j.forfeitedNote}</p>}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {canCancel && (
              <button type="button" onClick={cancel} disabled={Boolean(busy)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                {busy === 'cancel' ? j.cancelling : j.cancelJobPost}
              </button>
            )}
            <ReportProblemButton recruitmentRequest={item._id} />
          </div>
          {item.status === 'hired' && (
            <button type="button" onClick={end} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
              <CheckCircle2 size={16} /> {busy === 'end' ? j.ending : j.endEngagement}
            </button>
          )}
          {item.status === 'ended' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"><CheckCircle2 size={17} /> {j.engagementEnded}</span>
          )}
        </div>
      </div>

      {item.status === 'ended' && <JobReviewForm recruitmentRequestId={item._id} technicianName={hiredName} />}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">{j.applicants}</h2>
          <span className="text-sm font-bold text-slate-500">{fmt(j.applicantsCount, { count: item.bids?.length || 0 })}</span>
        </div>
        {item.bids?.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {item.bids.map((bid) => {
              const profile = bid.applicant?.profileDetail || {};
              const name = profile.fullName || bid.applicant?.username || j.technician;
              const isSelected = String(bid._id) === String(selectedBidId) || bid.status === 'selected';
              const target = { id: bid.applicant?._id, name, avatar: profile.avatar, rating: profile.rating, totalJobsCompleted: profile.totalJobsCompleted };
              return (
                <article key={bid._id} className={`rounded-2xl border p-5 ${isSelected ? 'border-green-300 bg-green-50/50 ring-2 ring-green-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setProfileTarget(target)} aria-label={fmt(tp.viewProfileOf, { name })} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-black text-slate-500 hover:ring-2 hover:ring-green-300">
                        {profile.avatar ? <img src={resolveImage(profile.avatar)} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
                      </button>
                      <div>
                        <h3 className="text-lg font-black text-slate-900"><button type="button" onClick={() => setProfileTarget(target)} className="text-left hover:text-green-700 hover:underline">{name}</button></h3>
                        {bid.applicant?.username && <p className="text-xs text-slate-500">@{bid.applicant.username}</p>}
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-green-600"><Star size={14} /> {profile.rating != null ? Number(profile.rating).toFixed(1) : j.noRating} · {fmt(j.jobsCount, { count: profile.totalJobsCompleted || 0 })}</p>
                        <button type="button" onClick={() => setProfileTarget(target)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 hover:underline"><UserRound size={13} /> {tp.viewProfile}</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">{formatTaka(bid.proposedSalary)}</p>
                      <p className="mt-1 text-xs text-slate-500">{j.proposedSalary}</p>
                    </div>
                  </div>
                  {bid.message && <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{bid.message}</p>}
                  {item.status === 'hiring_open' && bid.status === 'active' && (
                    <button type="button" onClick={() => hire(bid, name)} disabled={Boolean(busy)} className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                      {busy === `hire-${bid._id}` ? j.hiring : j.hire}
                    </button>
                  )}
                  {isSelected && <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">{j.recruitmentStatus.hired}</p>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">
            {item.status === 'pending_payment' ? j.applicationsAfterLive : j.noApplicationsYetCustomer}
          </div>
        )}
      </section>

      {profileTarget && <TechnicianProfileModal key={profileTarget.id} technician={profileTarget} onClose={() => setProfileTarget(null)} />}

      <PaymentCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title={j.payToPost}
        subtitle={item.title || j.recruitmentRequest}
        lines={[{ label: j.platformFee, amount: platformFee }]}
        submitting={busy === 'pay'}
        onConfirm={pay}
      />
    </div>
  );
}
