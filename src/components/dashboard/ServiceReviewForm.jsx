import { useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitServiceReview, submitTechnicianRating } from '../../services/api';
import { successToast } from '../../utils/alerts';
import SwalMessage from '../ui/SwalMessage';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Also used by JobReviewForm; `labels` overrides the rating words (index 1-5)
export function StarPicker({ value, onChange, label, labels = LABELS }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-green-600"
          >
            <Star size={32} className={n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-slate-500">{labels[shown]}</span>
      </div>
    </div>
  );
}

// Shown on a completed service request: service review (POST /review) + technician rating (POST /employeeRating)
export default function ServiceReviewForm({ gig, technicianName, onSubmitted }) {
  const { user } = useAuth();
  const needsService = !gig.serviceRated;
  const needsTechnician = !gig.providerRated;
  const [serviceRating, setServiceRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [techRating, setTechRating] = useState(0);
  const [techComment, setTechComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!needsService && !needsTechnician) {
    return (
      <section className="mt-6 flex items-center gap-3 rounded-3xl border border-green-200 bg-green-50 p-5 text-green-800 sm:p-6">
        <CheckCircle2 size={22} className="shrink-0 text-green-600" />
        <p className="text-sm font-semibold">Thanks for your feedback! Your review has been submitted.</p>
      </section>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (needsService && !serviceRating) return setError('Please rate the service.');
    if (needsService && !reviewText.trim()) return setError('Please write a short review of the service.');
    if (needsTechnician && !techRating) return setError('Please rate the technician.');

    setSubmitting(true);
    const done = {};
    try {
      if (needsService) {
        await submitServiceReview({
          bookingId: gig._id,
          rating: serviceRating,
          review: reviewText.trim(),
          employerName: user?.name,
        });
        done.serviceRated = true;
      }
      if (needsTechnician) {
        await submitTechnicianRating({ bookingId: gig._id, rating: techRating, comment: techComment });
        done.providerRated = true;
      }
      successToast('Thanks for your review!');
    } catch (err) {
      setError(err.message);
    } finally {
      // Keep whichever part succeeded, so a retry only resends what is missing
      if (Object.keys(done).length) onSubmitted(done);
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-green-600">Service completed</p>
      <h2 className="mt-2 text-2xl font-black text-slate-900">How was your experience?</h2>
      <p className="mt-1 text-sm text-slate-500">Your feedback helps other customers and rewards good technicians.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {needsService && (
          <div className="rounded-2xl bg-slate-50 p-5">
            <h3 className="font-bold text-slate-900">Rate the service</h3>
            <p className="text-sm text-slate-500">{gig.service?.title || 'Service'}</p>
            <div className="mt-3"><StarPicker value={serviceRating} onChange={setServiceRating} label="Service rating" /></div>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Tell others what went well or what could be better"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
            />
          </div>
        )}

        {needsTechnician && (
          <div className="rounded-2xl bg-slate-50 p-5">
            <h3 className="font-bold text-slate-900">Rate the technician</h3>
            <p className="text-sm text-slate-500">{technicianName || 'Your technician'}</p>
            <div className="mt-3"><StarPicker value={techRating} onChange={setTechRating} label="Technician rating" /></div>
            <textarea
              rows={2}
              value={techComment}
              onChange={(event) => setTechComment(event.target.value)}
              placeholder="Add a comment for the technician (optional)"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
            />
          </div>
        )}

        <SwalMessage message={error} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white shadow-md shadow-green-200 transition hover:bg-green-800 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {submitting ? 'Submitting...' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
