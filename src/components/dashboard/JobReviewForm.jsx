import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { fetchJobReviews, submitJobReview } from '../../services/api';
import { successToast } from '../../utils/alerts';
import { StarPicker } from './ServiceReviewForm';
import SwalMessage from '../ui/SwalMessage';

/**
 * "Rate technician" for the client of a completed instant service or an ended recruitment.
 * Pass exactly one of instantServiceId / recruitmentRequestId. Hidden behind a thank-you note once
 * a review exists (including when the API answers 409 because one was already left).
 */
export default function JobReviewForm({ instantServiceId, recruitmentRequestId, technicianName }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const j = t.jobs;
  // null while checking whether a review already exists
  const [reviewed, setReviewed] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchJobReviews({ instantServiceId, recruitmentRequestId })
      .then((reviews) => { if (active) setReviewed(reviews.length > 0); })
      .catch(() => { if (active) setReviewed(false); });
    return () => {
      active = false;
    };
  }, [instantServiceId, recruitmentRequestId]);

  if (reviewed === null) return null;
  if (reviewed) {
    return (
      <section className="mt-6 flex items-center gap-3 rounded-3xl border border-green-200 bg-green-50 p-5 text-green-800 sm:p-6">
        <CheckCircle2 size={22} className="shrink-0 text-green-600" />
        <p className="text-sm font-semibold">{j.reviewThanks}</p>
      </section>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!rating) {
      setError(j.reviewPickRating);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitJobReview({
        ...(instantServiceId ? { instantService: instantServiceId } : { recruitmentRequest: recruitmentRequestId }),
        rating,
        review: comment.trim(),
        employerName: user?.name,
      });
      successToast(j.reviewThanksToast);
      setReviewed(true);
    } catch (submitError) {
      if (submitError.status === 409) setReviewed(true);
      else setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black text-slate-900">{j.rateTechnician}</h2>
      <p className="mt-1 text-sm text-slate-500">{technicianName || j.yourTechnician}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <StarPicker value={rating} onChange={setRating} label={j.rateTechnician} labels={j.ratingWords} />
        <textarea
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={j.reviewPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
        />
        <SwalMessage message={error} />
        <button type="submit" disabled={submitting} className="rounded-xl bg-green-700 px-8 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">
          {submitting ? j.submitting : j.submitReview}
        </button>
      </form>
    </section>
  );
}
