import { lazy, Suspense, useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CalendarDays, CheckCircle2, Clock3, CreditCard, Flag, MapPin, RefreshCw, ShieldCheck, Star, UserRound, Wallet } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { cancelCustomerGig, cancelSelectedGig, completeCustomerGig, confirmGigPayment, fetchGigDetails, payGigSystemFee, selectGigBid, submitComplaint } from '../services/api';
import BidChatPanel from '../components/dashboard/BidChatPanel';
import PaymentCheckoutModal from '../components/dashboard/PaymentCheckoutModal';
import SystemFeePaymentModal from '../components/dashboard/SystemFeePaymentModal';
import ServiceReviewForm from '../components/dashboard/ServiceReviewForm';
import TechnicianProfileModal from '../components/dashboard/TechnicianProfileModal';
import { useLanguage } from '../hooks/useLanguage';
import { fmt } from '../utils/jobs';
import { confirmDialog, reasonDialog, reportDialog, successToast } from '../utils/alerts';
import SwalMessage from '../components/ui/SwalMessage';

// Leaflet is only needed once a technician is assigned
const LiveTrackingMap = lazy(() => import('../components/maps/LiveTrackingMap'));

const STATUS_LABELS = {
  pending_reassignment: 'Finding a replacement technician',
  bid_selected: 'Technician selected',
};
const FINAL_STATUSES = ['completed', 'cancelled'];
const REFRESH_MS = 8000;

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

// Uploaded avatars are stored as relative paths (e.g. uploads/...)
const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function CustomerGigDetailsView() {
  const { gigId } = useParams();
  const { t } = useLanguage();
  const tp = t.technicianProfile;
  const [profileTarget, setProfileTarget] = useState(null);
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingFee, setPayingFee] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancellingSelected, setCancellingSelected] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGigDetails(gigId)
      .then((data) => { if (active) setGig(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gigId]);

  // Keep status in sync while the technician acts on the booking (start job, cash receipt)
  const gigStatus = gig?.status;
  useEffect(() => {
    if (!gigStatus || FINAL_STATUSES.includes(gigStatus) || gigStatus === 'draft') return undefined;
    const intervalId = window.setInterval(() => {
      fetchGigDetails(gigId).then(setGig).catch(() => {});
    }, REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [gigId, gigStatus]);

  if (loading) return <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">Loading service request details...</div>;
  if (error) return <div className="px-4 py-12 text-center"><p className="text-sm font-semibold text-red-600">{error}</p></div>;

  const canCancel = (gig.status === 'draft' || gig.status === 'bidding_open') && !(gig.bids?.length);
  // Backend only completes a started job that has been paid (or paid in cash)
  const canComplete = gig.selectedBid && gig.status === 'in_progress' && (gig.paymentStatus === 'paid' || gig.cashReceived);

  const cancelGig = async () => {
    const refundNote = gig.systemFeePaid && !gig.systemFeeRefunded
      ? `Your ৳${gig.systemFee} system charge will be automatically refunded to your account wallet.`
      : 'This cannot be undone.';
    const confirmed = await confirmDialog({
      title: 'Cancel this service request?',
      text: refundNote,
      confirmText: 'Yes, cancel it',
      cancelText: 'Keep it',
      danger: true,
    });
    if (!confirmed) return;
    setCancelling(true);
    setError('');
    try {
      setGig(await cancelCustomerGig(gig._id, 'Cancelled by customer'));
      successToast('Service request cancelled');
    }
    catch (cancelError) { setError(cancelError.message); }
    finally { setCancelling(false); }
  };

  const handleConfirmPayFee = async ({ paymentMethod, transactionId }) => {
    setPayingFee(true);
    setError('');
    try {
      const updated = await payGigSystemFee(gig._id, { paymentMethod, transactionId });
      setGig(updated);
      setShowPaymentModal(false);
    } catch (payErr) {
      setError(payErr.message);
    } finally {
      setPayingFee(false);
    }
  };

  const acceptBid = async (bidId) => {
    const confirmed = await confirmDialog({
      title: 'Accept this technician?',
      text: 'Bidding will close for this service request.',
      confirmText: 'Yes, accept',
    });
    if (!confirmed) return;
    setAcceptingBid(bidId);
    setError('');
    try {
      setGig(await selectGigBid(gig._id, bidId));
      successToast('Technician accepted');
    }
    catch (acceptError) { setError(acceptError.message); }
    finally { setAcceptingBid(''); }
  };

  const completeGig = async () => {
    const confirmed = await confirmDialog({
      title: 'Mark as completed?',
      text: 'This will finalize the service and close the chat.',
      confirmText: 'Yes, complete',
    });
    if (!confirmed) return;
    setCompleting(true);
    setError('');
    try {
      const updated = await completeCustomerGig(gig._id);
      setGig(updated);
      successToast('Service request completed');
    } catch (completeErr) {
      setError(completeErr.message);
    } finally {
      setCompleting(false);
    }
  };

  const selectedBidId = gig.selectedBid?._id || gig.selectedBid;
  const selectedBid = gig.bids?.find((bid) => String(bid._id) === String(selectedBidId));
  const selectedTechnicianName = selectedBid?.provider?.profileDetail?.fullName || selectedBid?.provider?.username;
  const technicianId = selectedBid?.provider?._id || gig.selectedBid?.provider?._id;

  const bookingFee = Number(gig.bookingFee || 0);
  const jobPrice = Number(selectedBid?.price || gig.selectedBid?.price || 0);
  const paymentDue = gig.status === 'bid_selected' && !['paid', 'cash_pending'].includes(gig.paymentStatus);
  const cashPending = gig.paymentStatus === 'cash_pending' && !gig.cashReceived;
  const canTrack = Boolean(selectedBidId) && ['bid_selected', 'in_progress'].includes(gig.status);
  const canReport = Boolean(technicianId) && ['in_progress', 'completed'].includes(gig.status);

  const handleCheckout = async ({ paymentMethod, transactionId }) => {
    setPaying(true);
    setError('');
    try {
      setGig(await confirmGigPayment(gig._id, { paymentMethod, transactionId }));
      setShowCheckout(false);
      successToast(paymentMethod === 'cash' ? 'Cash payment selected' : 'Payment confirmed');
    } catch (payError) {
      setError(payError.message);
    } finally {
      setPaying(false);
    }
  };

  const cancelAfterSelection = async () => {
    const reason = await reasonDialog({
      title: 'Cancel this booking?',
      text: 'A technician is already assigned, so payments made so far are not refunded.',
      placeholder: 'Why are you cancelling?',
      confirmText: 'Yes, cancel booking',
      danger: true,
    });
    if (reason === null) return;
    setCancellingSelected(true);
    setError('');
    try {
      await cancelSelectedGig(gig._id, reason || 'Cancelled by customer');
      setGig(await fetchGigDetails(gig._id));
      successToast('Booking cancelled');
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setCancellingSelected(false);
    }
  };

  const reportTechnician = async () => {
    const report = await reportDialog({ heading: `Report ${selectedTechnicianName || 'technician'}` });
    if (!report) return;
    try {
      await submitComplaint({ complainAgainst: technicianId, ...report });
      successToast('Report submitted. Our team will review it.');
    } catch (reportError) {
      setError(reportError.message);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Service request details</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{gig.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{gig.service?.title || 'Service'} · {gig.schedule?.date} at {gig.schedule?.time}</p>
          </div>
          <span className="rounded-xl bg-green-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-green-700">
{STATUS_LABELS[gig.status] || String(gig.status || 'pending').replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <span className="flex items-center gap-2"><Wallet size={16} /> Bids from ৳{gig.minLimit}</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> {gig.location?.address}</span>
          <span className="flex items-center gap-2"><CalendarDays size={16} /> {gig.schedule?.date}</span>
        </div>

        {gig.status === 'draft' && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-green-50 border border-green-200 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-800">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-base font-bold text-green-900">This service request is saved as a Draft</p>
                <p className="mt-0.5 text-xs text-green-700">
                  Pay the mandatory <strong>৳{gig.systemFee || 50}</strong> bid placement system charge to place this service request online for technician bidding. 100% refundable if cancelled before bids.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-100 hover:bg-green-700 transition"
            >
              Place Online (Pay ৳{gig.systemFee || 50})
            </button>
          </div>
        )}

        {paymentDue && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CreditCard size={22} /></div>
              <div>
                <p className="text-base font-bold text-amber-900">Payment required</p>
                <p className="mt-0.5 text-xs text-amber-800">Pay the ৳{bookingFee.toLocaleString()} platform fee and ৳{jobPrice.toLocaleString()} job price, or choose cash, so {selectedTechnicianName || 'your technician'} can start.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowCheckout(true)} className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-100 transition hover:bg-green-700">
              Pay ৳{(bookingFee + jobPrice).toLocaleString()}
            </button>
          </div>
        )}

        {cashPending && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <Banknote size={20} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-medium">Cash payment: hand <strong>৳{(bookingFee + jobPrice).toLocaleString()}</strong> to the technician. They will confirm once received.</p>
          </div>
        )}

        {gig.paymentStatus === 'paid' && gig.selectedBid && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle2 size={20} className="shrink-0 text-green-600" />
            <p className="text-sm font-medium">{gig.cashReceived ? 'Cash payment received by the technician.' : `Paid${gig.paymentMethod ? ` via ${gig.paymentMethod}` : ''}.`}</p>
          </div>
        )}

        {gig.status === 'pending_reassignment' && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
            <RefreshCw size={20} className="shrink-0 text-sky-600" />
            <p className="text-sm font-medium">Your technician cancelled. We've offered the job to the next best bidder and will update this page once they respond.</p>
          </div>
        )}

        {gig.status === 'cancelled' && gig.cancellationReason && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertTriangle size={20} className="shrink-0 text-rose-600" />
            <p className="text-sm font-medium">Cancelled{gig.cancelledBy ? ` by ${gig.cancelledBy}` : ''}: {gig.cancellationReason}</p>
          </div>
        )}

        {gig.systemFeeRefunded && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
            <CheckCircle2 size={20} className="shrink-0 text-green-600" />
            <p className="text-sm font-medium">
              <strong>System fee refunded:</strong> ৳{gig.refundAmount || gig.systemFee} has been returned to your account wallet.
            </p>
          </div>
        )}

        <p className="mt-6 text-sm leading-7 text-slate-600">{gig.details}</p>
        <SwalMessage message={error} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {canCancel ? (
            <button type="button" onClick={cancelGig} disabled={cancelling} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
              {cancelling ? 'Cancelling...' : 'Cancel service request'}
            </button>
          ) : gig.status === 'bid_selected' ? (
            <button type="button" onClick={cancelAfterSelection} disabled={cancellingSelected} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
              {cancellingSelected ? 'Cancelling...' : 'Cancel booking'}
            </button>
          ) : gig.bids?.length && !gig.selectedBid ? (
            <p className="text-sm font-semibold text-slate-500">Cancellation is locked because a technician has already bid.</p>
          ) : null}

          {canReport && (
            <button type="button" onClick={reportTechnician} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
              <Flag size={16} /> Report technician
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              onClick={completeGig}
              disabled={completing}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 shadow-md shadow-green-200"
            >
              <CheckCircle2 size={16} />
              {completing ? 'Completing...' : 'Mark service request as completed'}
            </button>
          )}

          {gig.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
              <CheckCircle2 size={17} /> Service request completed
            </span>
          )}
        </div>
      </div>

      {gig.status === 'completed' && (
        <ServiceReviewForm
          gig={gig}
          technicianName={selectedTechnicianName}
          onSubmitted={(flags) => setGig((current) => ({ ...current, ...flags }))}
        />
      )}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Compare offers</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Technician bids</h2>
          </div>
          <span className="text-sm font-bold text-slate-500">{gig.bids?.length || 0} bids</span>
        </div>
        {gig.bids?.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {gig.bids.map((bid) => {
              const profile = bid.provider?.profileDetail || {};
              const location = profile.address || [profile.area, profile.district].filter(Boolean).join(', ') || 'Location not provided';
              const isSelected = bid.status === 'selected' || (selectedBidId && String(selectedBidId) === String(bid._id));
              const canAccept = gig.status === 'bidding_open' && ['active', 'schedule_conflict'].includes(bid.status);
              const name = profile.fullName || bid.provider?.username || 'Technician';
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
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} /> {location}</p>
                        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-600"><Star size={14} /> {profile.rating ?? 'No rating'} · {profile.totalJobsCompleted || 0} jobs</p>
                        <button type="button" onClick={() => setProfileTarget(target)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 hover:underline"><UserRound size={13} /> {tp.viewProfile}</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">৳{bid.price}</p>
                      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500"><Clock3 size={13} /> {bid.estimatedArrival || 'Arrival not specified'}</p>
                    </div>
                  </div>
                  {bid.message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{bid.message}</p>}
                  {canAccept && (
                    <button type="button" onClick={() => acceptBid(bid._id)} disabled={acceptingBid === bid._id} className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                      {acceptingBid === bid._id ? 'Accepting...' : 'Accept this technician'}
                    </button>
                  )}
                  {isSelected && <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700 text-center">Selected technician</p>}
                  {!isSelected && ['closed', 'rejected'].includes(bid.status) && <p className="mt-4 text-xs font-semibold text-slate-500">Bidding closed</p>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">
            No bids yet. Matching approved technicians will appear here.
          </div>
        )}
      </section>

      {canTrack && (
        <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-3xl bg-slate-200" />}>
          <LiveTrackingMap gigId={gig._id} mode="customer" destination={gig.location?.coordinates} address={gig.location?.address} />
        </Suspense>
      )}

      {selectedBidId && (
        <BidChatPanel
          bidId={selectedBidId}
          gigStatus={gig.status}
          role="customer"
        />
      )}

      {profileTarget && <TechnicianProfileModal key={profileTarget.id} technician={profileTarget} onClose={() => setProfileTarget(null)} />}

      <PaymentCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Pay for your booking"
        subtitle={selectedTechnicianName ? `Technician: ${selectedTechnicianName}` : 'Booking payment'}
        lines={[{ label: 'Platform fee', amount: bookingFee }, { label: 'Job price (selected bid)', amount: jobPrice }]}
        allowCash
        allowCoupons
        submitting={paying}
        onConfirm={handleCheckout}
      />

      <SystemFeePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        gig={gig}
        fee={gig?.systemFee || 50}
        onConfirm={handleConfirmPayFee}
        submitting={payingFee}
      />
    </div>
  );
}
