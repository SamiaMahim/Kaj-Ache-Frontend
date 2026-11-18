import { BriefcaseBusiness, CalendarDays, Clock3, MapPin, Pencil, RefreshCw, Send, ShieldCheck, Wallet, Wrench } from 'lucide-react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { createGig, fetchDistricts, fetchMatchingGigs, fetchServices, fetchTechnicianBids, placeGigBid } from '../services/api';
import SystemFeePaymentModal from '../components/dashboard/SystemFeePaymentModal';
import SwalMessage from '../components/ui/SwalMessage';

const LocationPickerMap = lazy(() => import('../components/maps/LocationPickerMap'));

// Same slots as the mobile app booking form
const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];

export default function AuthenticatedWorkView() {
  const { role } = useOutletContext() || { role: 'customer' };
  const technician = role === 'technician';
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ title: '', description: '', service: searchParams.get('service') || '', date: '', time: '', address: '', district: '' });
  const [coordinates, setCoordinates] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [bidForm, setBidForm] = useState({});
  const [bidSubmitting, setBidSubmitting] = useState('');

  useEffect(() => { fetchServices().then(setServices); }, []);
  useEffect(() => { if (!technician) fetchDistricts().then(setDistricts); }, [technician]);
  useEffect(() => {
    if (!technician) return undefined;
    let active = true;
    const loadGigs = async () => {
      try {
        const [matchingGigs, bids] = await Promise.all([fetchMatchingGigs(), fetchTechnicianBids()]);
        if (active) { setGigs(matchingGigs || []); setMyBids(bids || []); }
        setError('');
      } catch (loadError) { if (active) setError(loadError.message); }
    };
    loadGigs();
    const intervalId = window.setInterval(loadGigs, 5000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, [technician]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const selectedService = services.find((s) => String(s.id || s._id) === String(form.service));
  // fetchServices() returns placeholder services (ids 1, 2, ...) when the API is down;
  // posting those would send an invalid service id
  const servicesUnavailable = services.length > 0 && services.every((s) => s.isFallback);
  const systemFee = selectedService?.bidPlacementFee ?? selectedService?.bookingFee ?? 50;

  const validateForm = () => {
    if (servicesUnavailable || selectedService?.isFallback) {
      setError('Services could not be loaded from the server. Please refresh the page and try again.');
      return false;
    }
    if (!form.title.trim() || !form.service || !form.address.trim() || !form.date || !form.time || !form.description.trim()) {
      setError('Please fill in all required fields before proceeding.');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    // A type="button" click skips native validation, so run it explicitly
    const formElement = event.currentTarget.form;
    if (formElement && !formElement.reportValidity()) return;
    if (!validateForm()) return;
    setSubmitting(true);
    setError('');
    try {
      await createGig({
        ...form,
        photos,
        schedule: { date: form.date, time: form.time },
        coordinates,
        isDraft: true
      });
      navigate('/dashboard/customer');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setError('');
    setShowPaymentModal(true);
  };

  const handleConfirmPlacement = async ({ paymentMethod, transactionId }) => {
    setSubmitting(true);
    setError('');
    try {
      await createGig({
        ...form,
        photos,
        schedule: { date: form.date, time: form.time },
        coordinates,
        isDraft: false,
        paymentMethod,
        transactionId
      });
      setShowPaymentModal(false);
      navigate('/dashboard/customer');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!technician) return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <form onSubmit={handleOpenPayment} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-green-600">Customer service request</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Tell technicians what you need</h1>
        <p className="mt-2 text-sm text-slate-500">Your request will be shown to approved technicians once the bid placement system fee is confirmed.</p>
        
        {selectedService && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-green-100 bg-green-50/60 p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
              {selectedService.image ? (
                <img src={/^https?:\/\//i.test(selectedService.image) ? selectedService.image : `${import.meta.env.VITE_API_URL || ''}/${selectedService.image.replace(/^\//, '')}`} alt={selectedService.title?.EN} className="h-full w-full object-cover" />
              ) : (
                <Wrench className="text-green-600" size={28} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-green-600">Selected service</p>
              <p className="mt-1 truncate text-lg font-black text-slate-900">{selectedService.title?.EN || selectedService.title}</p>
              {selectedService.basePrice > 0 && <p className="mt-0.5 text-xs text-slate-500">Technician bids start from ৳{selectedService.basePrice}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {selectedService.basePrice > 0 && <span className="text-xl font-black text-green-700">৳{selectedService.basePrice}</span>}
              <Link to="/services" className="text-xs font-bold text-slate-500 hover:text-green-700">Change</Link>
            </div>
          </div>
        )}

        {/* The service is chosen on its service page ("Book Now"), same as the mobile app */}
        {!selectedService && services.length > 0 && !servicesUnavailable && (
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-bold text-amber-900">Choose a service first</p>
              <p className="mt-0.5 text-sm text-amber-800">Open the service you need and tap Book Now to start your request.</p>
            </div>
            <Link to="/services" className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-center text-sm font-bold text-white hover:bg-green-700">Browse services</Link>
          </div>
        )}

        {servicesUnavailable && !error && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Services could not be loaded from the server, so requests can't be posted right now. Please refresh the page and try again.</p>}
        <SwalMessage message={error} />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[['title','Service request title','e.g. Fix leaking kitchen pipe'],['address','Full address','House, road, area']].map(([key,label,placeholder]) => (
            <label key={key} className="text-sm font-bold text-slate-700">
              {label}
              <input required type="text" value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-green-500" />
            </label>
          ))}
          <label className="text-sm font-bold text-slate-700">
            District
            <select value={form.district} onChange={(event) => update('district', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-green-500">
              <option value="">Select district (optional)</option>
              {districts.map((district) => <option key={district._id} value={district.name}>{district.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Photos (up to 8)<input type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []).slice(0, 8))} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm" /></label>
          <label className="text-sm font-bold text-slate-700">Date<input required type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={(event) => update('date', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
          <label className="text-sm font-bold text-slate-700">Time slot<select required value={form.time} onChange={(event) => update('time', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-green-500"><option value="">Pick a time</option>{TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
          <div className="text-sm font-bold text-slate-700 md:col-span-2">
            Pin location on map
            <Suspense fallback={<div className="mt-2 h-64 animate-pulse rounded-xl bg-slate-100" />}>
              <div className="mt-2"><LocationPickerMap value={coordinates} onChange={setCoordinates} /></div>
            </Suspense>
          </div>
          <label className="text-sm font-bold text-slate-700 md:col-span-2">Description<textarea required rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the work clearly" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-green-500" /></label>
        </div>

        {selectedService && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-green-50/80 border border-green-200 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-800">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-green-900">Bid Placement System Charge: ৳{systemFee}</p>
                <p className="mt-0.5 text-xs text-green-700">
                  Required to publish this service request online for technician bidding. <strong>100% refundable</strong> to your account wallet if the service request is cancelled or fails.
                </p>
              </div>
            </div>
            <span className="shrink-0 self-end sm:self-center rounded-xl bg-green-200/60 px-3.5 py-1.5 text-base font-black text-green-900">
              ৳{systemFee}
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting || servicesUnavailable || !selectedService}
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
          >
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="submit"
            disabled={submitting || servicesUnavailable || !selectedService}
            className="w-full sm:w-auto rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-60 transition"
          >
            Pay ৳{systemFee} & Place Online
          </button>
        </div>
      </form>

      <SystemFeePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        fee={systemFee}
        onConfirm={handleConfirmPlacement}
        submitting={submitting}
      />
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-green-600">Technician marketplace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Matching service requests near you</h1><p className="mt-2 text-sm text-slate-500">Only active service requests matching your selected services are shown.</p></div><span className="text-sm font-bold text-slate-500">{gigs.length} open {gigs.length === 1 ? 'service request' : 'service requests'}</span></div>
      <SwalMessage message={error} />
      {(() => {
        const isAcceptedBid = (bid) => {
          if (bid.status === 'selected') return true;
          const bookingSelected = bid.booking?.selectedBid?._id || bid.booking?.selectedBid;
          return Boolean(bookingSelected && String(bookingSelected) === String(bid._id));
        };
        const acceptedBids = myBids.filter(isAcceptedBid);
        const reassignmentOffers = myBids.filter((bid) => bid.status === 'pending_reassignment');

        return (
          <>
          {reassignmentOffers.length > 0 && (
            <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-700"><RefreshCw size={14} /> Job offers for you</p>
              <p className="mt-1 text-sm text-sky-900">A selected technician cancelled and these jobs are now offered to you. Open one to accept or decline.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {reassignmentOffers.map((bid) => (
                  <Link key={bid._id} to={`/dashboard/technician/gigs/${bid.booking?._id || bid.booking}`} className="rounded-2xl border border-sky-200 bg-white p-4 transition hover:border-sky-500">
                    <p className="font-black text-slate-900">{bid.booking?.title || bid.booking?.service?.title || 'Service request'}</p>
                    <p className="mt-1 text-sm text-slate-500">Your bid ৳{bid.price}</p>
                    <p className="mt-3 text-xs font-bold text-sky-700">Review offer</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mb-8 rounded-3xl border border-green-200 bg-green-50/50 p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">Your accepted work</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">Customer connections</h2>
              </div>
              <span className="text-sm font-bold text-green-700">{acceptedBids.length}</span>
            </div>
            {acceptedBids.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {acceptedBids.map((bid) => (
                  <Link
                    key={bid._id}
                    to={`/dashboard/technician/gigs/${bid.booking?._id || bid.booking}`}
                    className="rounded-2xl border border-green-200 bg-white p-4 transition hover:border-green-500"
                  >
                    <p className="font-black text-slate-900">{bid.booking?.title || bid.booking?.service?.title || 'Accepted service request'}</p>
                    <p className="mt-1 text-sm text-slate-500">Bid ৳{bid.price} · {String(bid.booking?.status || bid.status).replace(/_/g, ' ')}</p>
                    <p className="mt-3 text-xs font-bold text-green-700">Open service request and chat</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No accepted service requests yet. Your accepted customer connections will appear here.</p>
            )}
          </div>
          </>
        );
      })()}
      <div className="grid gap-4 lg:grid-cols-2">
        {gigs.map((gig) => {
          const existingBid = gig.myBid || myBids.find((bid) => (bid.booking?._id || bid.booking) === gig._id);
          const bid = bidForm[gig._id] || { price: gig.minLimit || '', message: '', estimatedArrival: '30 mins' };
          return <article key={gig._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{gig.service?.title || 'Service request'}</span><h2 className="mt-3 text-xl font-black text-slate-900">{gig.title || 'Service request'}</h2></div><div className="flex items-center gap-1 text-sm font-black text-green-600"><Wallet size={16} /> ৳{gig.minLimit}</div></div><p className="mt-3 text-sm leading-6 text-slate-600">{gig.details}</p><div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3"><span className="flex items-center gap-1"><MapPin size={14} /> {gig.location?.address}</span><span className="flex items-center gap-1"><CalendarDays size={14} /> {gig.schedule?.date}</span><span className="flex items-center gap-1"><Clock3 size={14} /> {gig.schedule?.time}</span></div>{existingBid ? <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700"><span>Bid submitted: ৳{existingBid.price} · {String(existingBid.status || 'active').replace(/_/g, ' ')}</span><Link to={`/dashboard/technician/gigs/${gig._id}`} className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-bold text-green-700 hover:border-green-500"><Pencil size={13} /> View / edit bid</Link></div> : <div className="mt-5 border-t border-slate-100 pt-5"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">Your price<input type="number" min={gig.minLimit} value={bid.price} onChange={(event) => setBidForm((current) => ({ ...current, [gig._id]: { ...bid, price: event.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" /></label><label className="text-xs font-bold text-slate-500">Estimated arrival<input value={bid.estimatedArrival} onChange={(event) => setBidForm((current) => ({ ...current, [gig._id]: { ...bid, estimatedArrival: event.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500" /></label></div><textarea rows={2} value={bid.message} onChange={(event) => setBidForm((current) => ({ ...current, [gig._id]: { ...bid, message: event.target.value } }))} placeholder="Introduce yourself and explain how you will help" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-500" /><button type="button" disabled={bidSubmitting === gig._id} onClick={async () => { setBidSubmitting(gig._id); try { await placeGigBid(gig._id, bid); setGigs((current) => current.map((item) => item._id === gig._id ? { ...item, myBid: { price: bid.price, status: 'active' } } : item)); } catch (bidError) { setError(bidError.message); } finally { setBidSubmitting(''); } }} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"><Send size={16} />{bidSubmitting === gig._id ? 'Sending...' : 'Send bid'}</button></div>}</article>;
        })}
      </div>
      {!gigs.length && !error && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><BriefcaseBusiness className="mx-auto text-slate-300" size={34} /><h2 className="mt-4 text-lg font-black text-slate-800">No matching service requests yet</h2><p className="mt-2 text-sm text-slate-500">Update your profile services or wait for a customer to post a matching request.</p><Link to="/dashboard/technician/profile" className="mt-5 inline-flex rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white">Update services</Link></div>}
    </div>
  );
}
