import { lazy, Suspense, useEffect, useState } from 'react';
import { Banknote, CalendarDays, CheckCircle2, Clock3, Hourglass, Lock, MapPin, Pencil, Play, RefreshCw, Send, Wallet, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import BidChatPanel from '../components/dashboard/BidChatPanel';
import {
  fetchGigDetails, markGigCashReceived, placeGigBid, respondToReassignment, startGigJob, technicianCancelGig, updateGigBid,
} from '../services/api';
import { confirmDialog, reasonDialog, successToast } from '../utils/alerts';
import SwalMessage from '../components/ui/SwalMessage';

// Leaflet is only needed once the technician is assigned
const LiveTrackingMap = lazy(() => import('../components/maps/LiveTrackingMap'));

const STATUS_LABELS = {
  pending_reassignment: 'Reassignment pending',
  bid_selected: 'Technician selected',
};
const EDITABLE_BID_STATUSES = ['active', 'schedule_conflict'];

function BidForm({ gig, bid, onSaved }) {
  const [form, setForm] = useState({
    price: bid?.price ?? gig.minLimit ?? '',
    estimatedArrival: bid?.estimatedArrival || '30 mins',
    message: bid?.message || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.price) < Number(gig.minLimit || 0)) {
      setError(`Your price must be at least ৳${gig.minLimit}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (bid?._id) await updateGigBid(gig._id, bid._id, form);
      else await placeGigBid(gig._id, form);
      successToast(bid?._id ? 'Bid updated' : 'Bid submitted');
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 border-t border-slate-100 pt-5">
      <p className="text-sm font-black text-slate-900">{bid?._id ? 'Edit your bid' : 'Place your bid'}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-500">
          Your price (min ৳{gig.minLimit})
          <input type="number" required min={gig.minLimit} value={form.price} onChange={(event) => update('price', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Estimated arrival
          <input required value={form.estimatedArrival} onChange={(event) => update('estimatedArrival', event.target.value)} placeholder="e.g. 45 mins or 3:30 PM" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" />
        </label>
      </div>
      <textarea rows={2} value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Introduce yourself and explain how you will help" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-500" />
      <SwalMessage message={error} />
      <button type="submit" disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
        {bid?._id ? <Pencil size={16} /> : <Send size={16} />}
        {saving ? 'Saving...' : bid?._id ? 'Update bid' : 'Send bid'}
      </button>
    </form>
  );
}

export default function TechnicianGigDetailsView() {
  const { gigId } = useParams();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  // Bumped after an action so the details reload immediately instead of on the next poll
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchGigDetails(gigId);
        if (active) {
          setGig(data);
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const intervalId = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [gigId, reloadKey]);

  if (loading && !gig) return <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">Loading assigned service request...</div>;
  // Full-page error only when nothing has loaded yet; a failed poll keeps the last good data
  if (!gig) return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-red-600">{error || 'Service request not found.'}</p>
    </div>
  );

  const selectedBidId = gig.selectedBid?._id || (typeof gig.selectedBid === 'string' ? gig.selectedBid : null) || gig.bids?.find((bid) => bid.status === 'selected')?._id;
  const selectedBid = gig.bids?.find((bid) => String(bid._id) === String(selectedBidId)) || (typeof gig.selectedBid === 'object' ? gig.selectedBid : null);

  // The logged-in technician is the selected provider if their bid matches the gig's selectedBid
  const isSelectedProvider = Boolean(
    gig.myBid && selectedBidId && String(gig.myBid._id) === String(selectedBidId)
  );
  const hasReassignmentOffer = gig.status === 'pending_reassignment' && gig.myBid?.status === 'pending_reassignment';
  const canBid = gig.status === 'bidding_open' && (!gig.myBid || EDITABLE_BID_STATUSES.includes(gig.myBid.status));

  const amountDue = Number(gig.bookingFee || 0) + Number(selectedBid?.price || gig.myBid?.price || 0);
  const paymentReady = ['paid', 'cash_pending'].includes(gig.paymentStatus);
  const isCash = gig.paymentMethod === 'cash';
  const canStart = isSelectedProvider && gig.status === 'bid_selected' && paymentReady;
  const canCancel = isSelectedProvider && gig.status === 'bid_selected';
  const canMarkCash = isSelectedProvider && isCash && !gig.cashReceived && ['in_progress', 'completed'].includes(gig.status);
  const canShareLocation = isSelectedProvider && ['bid_selected', 'in_progress'].includes(gig.status);

  const run = async (key, action, successMessage) => {
    setBusy(key);
    setActionError('');
    try {
      await action();
      successToast(successMessage);
      reload();
    } catch (actionFailure) {
      setActionError(actionFailure.message);
    } finally {
      setBusy('');
    }
  };

  const startJob = async () => {
    const confirmed = await confirmDialog({
      title: 'Start this job?',
      text: isCash ? `The customer will pay ৳${amountDue.toLocaleString()} in cash. Confirm receipt once you have it.` : 'The customer has paid. The job moves to in progress.',
      confirmText: 'Yes, start job',
    });
    if (confirmed) run('start', () => startGigJob(gig._id), 'Job started');
  };

  const markCash = async () => {
    const confirmed = await confirmDialog({
      title: 'Cash received?',
      text: `Confirm you received ৳${amountDue.toLocaleString()} in cash from the customer.`,
      confirmText: 'Yes, received',
    });
    if (confirmed) run('cash', () => markGigCashReceived(gig._id), 'Cash receipt confirmed');
  };

  const cancelJob = async () => {
    const reason = await reasonDialog({
      title: 'Cancel this job?',
      text: 'You will get a strike, lose 20 reward points and your rating drops. The job is offered to the next bidder.',
      placeholder: 'Why are you cancelling?',
      confirmText: 'Yes, cancel job',
      required: true,
      danger: true,
    });
    if (reason !== null) run('cancel', () => technicianCancelGig(gig._id, reason), 'Job cancelled');
  };

  const respond = (accept) => run(accept ? 'accept' : 'decline', () => respondToReassignment(gig._id, accept), accept ? 'Job accepted' : 'Offer declined');

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      {error && (
        <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          Couldn't refresh this request ({error}). Showing the last loaded details.
        </p>
      )}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              {isSelectedProvider ? 'Assigned service request' : 'Service request details'}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{gig.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{gig.service?.title || 'Service'} · Customer request</p>
          </div>
          <span className="rounded-xl bg-green-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-green-700">
            {STATUS_LABELS[gig.status] || String(gig.status || 'selected').replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <Wallet size={16} /> {gig.myBid ? `Your bid: ৳${gig.myBid.price}` : `Minimum bid: ৳${gig.minLimit}`}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={16} /> {gig.location?.address}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays size={16} /> {gig.schedule?.date} {gig.schedule?.time}
          </span>
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-600">{gig.details}</p>

        <SwalMessage message={actionError} />

        {hasReassignmentOffer && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="flex items-center gap-2 text-base font-bold text-sky-900"><RefreshCw size={18} /> This job is offered to you</p>
            <p className="mt-1 text-sm text-sky-800">The previously selected technician cancelled. Accept to take the job at your bid of ৳{gig.myBid.price}.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => respond(true)} disabled={Boolean(busy)} className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                {busy === 'accept' ? 'Accepting...' : 'Accept job'}
              </button>
              <button type="button" onClick={() => respond(false)} disabled={Boolean(busy)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {busy === 'decline' ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        )}

        {isSelectedProvider && gig.status === 'bid_selected' && !paymentReady && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Hourglass size={20} className="shrink-0 text-amber-600" />
            <p className="text-sm font-medium">You were selected. Waiting for the customer to pay before you can start.</p>
          </div>
        )}

        {isSelectedProvider && gig.status === 'in_progress' && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <Clock3 size={20} className="shrink-0 text-green-600" />
            <p className="text-sm font-medium">Job in progress. The customer marks it complete once the work is done.</p>
          </div>
        )}

        {isSelectedProvider && isCash && gig.cashReceived && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-medium">Cash receipt confirmed.</p>
          </div>
        )}

        {(canStart || canMarkCash || canCancel) && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            {canStart && (
              <button type="button" onClick={startJob} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-200 hover:bg-green-700 disabled:opacity-60">
                <Play size={16} /> {busy === 'start' ? 'Starting...' : 'Start job'}
              </button>
            )}
            {canMarkCash && (
              <button type="button" onClick={markCash} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                <Banknote size={16} /> {busy === 'cash' ? 'Saving...' : `Mark ৳${amountDue.toLocaleString()} cash received`}
              </button>
            )}
            {canCancel && (
              <button type="button" onClick={cancelJob} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                <XCircle size={16} /> {busy === 'cancel' ? 'Cancelling...' : 'Cancel job'}
              </button>
            )}
          </div>
        )}

        {canBid && <BidForm gig={gig} bid={gig.myBid} onSaved={reload} />}

        {gig.status === 'completed' && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800 border border-green-200">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>This service request has been completed.</span>
          </div>
        )}
      </div>

      {canShareLocation && (
        <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-3xl bg-slate-200" />}>
          <LiveTrackingMap gigId={gig._id} mode="technician" destination={gig.location?.coordinates} address={gig.location?.address} />
        </Suspense>
      )}

      {isSelectedProvider && selectedBidId ? (
        <BidChatPanel
          bidId={selectedBidId}
          gigStatus={gig.status}
          role="technician"
        />
      ) : selectedBidId ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Lock size={22} />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-800">Chat is locked for this service request</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            The customer selected another technician for this request. P2P chat is only available between the customer and the selected technician.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <Lock size={22} />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-800">Chat unlocks once accepted</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Direct chat unlocks as soon as the customer accepts your bid.
          </p>
        </div>
      )}
    </div>
  );
}
