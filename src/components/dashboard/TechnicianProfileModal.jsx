import { useEffect, useRef, useState } from 'react';
import { Briefcase, ChevronLeft, ChevronRight, ImageOff, MapPin, RefreshCw, Star, Wrench, X } from 'lucide-react';
import { fetchPublicProfile, fetchTechnicianPortfolio, fetchTechnicianReviews } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { fmt } from '../../utils/jobs';
import { stripHtml } from '../../utils/html';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
// Uploaded files are stored as relative paths (e.g. /uploads/portfolios/...)
const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

const RECENT_REVIEWS = 3;

function Stars({ rating, size = 16 }) {
  const filled = Math.round(Number(rating) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={size} className={value <= filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </span>
  );
}

/**
 * Public profile of a bidding technician with their portfolio.
 * `technician` is what the bid card already has: { id (USER id), name, avatar, rating, totalJobsCompleted }.
 * Mount it with key={technician.id} so each technician starts from a clean state.
 */
export default function TechnicianProfileModal({ technician, onClose }) {
  const { t } = useLanguage();
  const p = t.technicianProfile;
  const userId = technician?.id;

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(Boolean(userId));
  const [portfolioError, setPortfolioError] = useState('');
  const [portfolioKey, setPortfolioKey] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const dialogRef = useRef(null);
  const lightboxRef = useRef(null);
  const stateRef = useRef({ onClose, lightboxIndex, count: 0 });
  useEffect(() => {
    stateRef.current = { onClose, lightboxIndex, count: portfolio.length };
  });

  // Header details beyond what the bid carries; the bid data is enough if this fails
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    fetchPublicProfile(userId).then((data) => { if (active) setProfile(data?.profileDetail || null); }).catch(() => {});
    fetchTechnicianReviews(userId).then((list) => { if (active) setReviews(list); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    fetchTechnicianPortfolio(userId)
      .then((list) => { if (active) { setPortfolio(Array.isArray(list) ? list.filter((entry) => entry?.image) : []); setPortfolioError(''); } })
      .catch((error) => { if (active) setPortfolioError(error.message || p.loadFailed); })
      .finally(() => { if (active) setPortfolioLoading(false); });
    return () => { active = false; };
  }, [userId, portfolioKey, p.loadFailed]);

  // Focus the dialog, lock page scroll, Esc closes the lightbox first, then the dialog
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      const { lightboxIndex: index, count, onClose: close } = stateRef.current;
      if (index !== null) {
        if (event.key === 'Escape') setLightboxIndex(null);
        else if (event.key === 'ArrowLeft') setLightboxIndex((index - 1 + count) % count);
        else if (event.key === 'ArrowRight') setLightboxIndex((index + 1) % count);
        return;
      }
      if (event.key === 'Escape') close?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const lightboxOpen = lightboxIndex !== null;
  useEffect(() => {
    if (lightboxOpen) lightboxRef.current?.focus();
    else dialogRef.current?.focus();
  }, [lightboxOpen]);

  if (!technician) return null;

  const detail = profile || {};
  const name = detail.fullName || technician.name || p.technician;
  const avatar = resolveImage(detail.avatar || technician.avatar);
  const rating = Number(detail.rating ?? technician.rating ?? 0);
  const jobsCompleted = detail.totalJobsCompleted ?? technician.totalJobsCompleted;
  const experience = detail.experience || (detail.experienceYears ? fmt(p.experienceYears, { count: detail.experienceYears }) : '');
  const serviceArea = detail.serviceArea || [detail.area, detail.district].filter(Boolean).join(', ');
  const skills = Array.isArray(detail.skills) ? detail.skills.filter(Boolean) : [];
  const recentReviews = reviews.slice(0, RECENT_REVIEWS);

  const facts = [
    experience && { icon: Briefcase, label: p.experience, value: experience },
    serviceArea && { icon: MapPin, label: p.serviceArea, value: serviceArea },
    jobsCompleted != null && { icon: Wrench, label: p.jobsCompleted, value: jobsCompleted },
  ].filter(Boolean);

  const retryPortfolio = () => {
    setPortfolioLoading(true);
    setPortfolioError('');
    setPortfolioKey((current) => current + 1);
  };

  const active = lightboxOpen ? portfolio[lightboxIndex] : null;
  const step = (delta) => setLightboxIndex((index) => (index + delta + portfolio.length) % portfolio.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="technician-profile-title"
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">{p.title}</p>
          <button type="button" onClick={onClose} aria-label={p.close} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-xl font-black text-slate-500 sm:h-20 sm:w-20">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 id="technician-profile-title" className="text-xl font-black text-slate-900 sm:text-2xl">{name}</h2>
              {detail.businessName && <p className="mt-0.5 text-sm font-semibold text-slate-600">{detail.businessName}</p>}
              {detail.category && <span className="mt-2 inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{detail.category}</span>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {rating > 0 ? (
                  <>
                    <Stars rating={rating} />
                    <span className="font-bold text-slate-900">{rating.toFixed(1)}</span>
                    <span className="sr-only">{fmt(p.ratingOutOf, { rating: rating.toFixed(1) })}</span>
                    {reviews.length > 0 && <span className="text-slate-500">({fmt(p.reviewsCount, { count: reviews.length })})</span>}
                  </>
                ) : (
                  <span className="text-slate-500">{p.noRating}</span>
                )}
              </div>
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="text-sm font-bold text-slate-900 break-words">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}

          {detail.bio && (
            <section className="mt-5">
              <h3 className="text-sm font-black text-slate-900">{p.about}</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{detail.bio}</p>
            </section>
          )}

          {skills.length > 0 && (
            <section className="mt-5">
              <h3 className="text-sm font-black text-slate-900">{p.skills}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill) => <span key={skill} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{skill}</span>)}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h3 className="text-lg font-black text-slate-900">{p.portfolio}</h3>
            {portfolioLoading ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((key) => (
                  <div key={key}>
                    <div className="aspect-square animate-pulse rounded-2xl bg-slate-200" />
                    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : portfolioError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
                <p className="text-sm font-semibold text-rose-700">{p.loadFailed}</p>
                <button type="button" onClick={retryPortfolio} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">
                  <RefreshCw size={15} /> {p.retry}
                </button>
              </div>
            ) : portfolio.length ? (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {portfolio.map((entry, index) => {
                  const caption = stripHtml(entry.servicedetails);
                  return (
                    <li key={entry._id || index}>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        aria-label={fmt(p.openImage, { index: index + 1 })}
                        className="block w-full overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      >
                        <img src={resolveImage(entry.image)} alt={caption} loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
                      </button>
                      {caption && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">{caption}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <ImageOff size={28} className="text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-slate-700">{p.portfolioEmpty}</p>
                <p className="mt-1 text-xs text-slate-500">{p.portfolioEmptyText}</p>
              </div>
            )}
          </section>

          {recentReviews.length > 0 && (
            <section className="mt-6">
              <h3 className="text-lg font-black text-slate-900">{p.recentReviews}</h3>
              <ul className="mt-3 space-y-3">
                {recentReviews.map((review) => (
                  <li key={review._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{review.employerName || p.customer}</p>
                      <Stars rating={review.rating} size={13} />
                    </div>
                    {review.review && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{stripHtml(review.review)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxIndex(null); }}
        >
          <div ref={lightboxRef} role="dialog" aria-modal="true" aria-label={p.imageViewer} tabIndex={-1} className="flex max-h-full w-full max-w-4xl flex-col items-center outline-none">
            <img src={resolveImage(active.image)} alt={stripHtml(active.servicedetails)} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
            <div className="mt-3 w-full text-center text-white">
              {active.servicedetails && <p className="mx-auto max-w-2xl text-sm leading-6 text-white/90">{stripHtml(active.servicedetails)}</p>}
              {portfolio.length > 1 && <p className="mt-1 text-xs text-white/60">{fmt(p.imageCounter, { index: lightboxIndex + 1, total: portfolio.length })}</p>}
            </div>
          </div>
          <button type="button" onClick={() => setLightboxIndex(null)} aria-label={p.close} className="absolute right-3 top-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20">
            <X size={22} />
          </button>
          {portfolio.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label={p.previous} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:left-4">
                <ChevronLeft size={24} />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={p.next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-4">
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
