import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MessageSquare, Send, Star, Wrench } from 'lucide-react';
import HtmlContent from '../components/content/HtmlContent';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../context/AuthContext';
import { fetchServiceBySlug, fetchServiceComments, fetchServiceReviews, postServiceComment } from '../services/api';
import SwalMessage from '../components/ui/SwalMessage';
import RelatedServices from '../components/services/RelatedServices';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

function Stars({ value, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </div>
  );
}

function Avatar({ src, name }) {
  const image = resolveImage(src);
  if (image) return <img src={image} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function ServiceDetailsView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, role, isAuthenticated } = useAuth();
  const isBn = lang === 'BN';
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  // Which slug the current data/error belongs to; loading is derived from it, so a
  // slug change needs no synchronous setState in the effect
  const [loadedSlug, setLoadedSlug] = useState(null);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentNotice, setCommentNotice] = useState('');
  const loading = loadedSlug !== slug;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const details = await fetchServiceBySlug(slug);
        if (!active) return;
        setService(details);
        const [reviewList, commentList] = await Promise.all([fetchServiceReviews(details._id), fetchServiceComments(details._id)]);
        if (!active) return;
        setReviews(reviewList);
        setComments(commentList);
        setError('');
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoadedSlug(slug);
      }
    };
    load();

    return () => {
      active = false;
    };
  }, [slug]);

  const handleComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setPosting(true);
    setCommentError('');
    setCommentNotice('');
    try {
      const name = user?.profileDetail?.fullName || user?.username || user?.email;
      const created = await postServiceComment({ serviceId: service._id, comment: text, name });
      if ((created?.status ?? 'approved') === 'approved') {
        setComments((current) => [{ ...created, name: created?.name || name }, ...current]);
      } else {
        // Held for moderation: don't show it as published (it would vanish on reload)
        setCommentNotice(isBn ? 'আপনার মন্তব্য জমা হয়েছে। অনুমোদনের পর এটি দেখা যাবে।' : 'Your comment was submitted and will appear once it is approved.');
      }
      setCommentText('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const isTechnicianUser = isAuthenticated && role === 'technician';
  const handleBook = () => {
    if (isTechnicianUser) return; // technicians can't book; see the note under the button
    if (isAuthenticated && role === 'customer') navigate(`/dashboard/customer/services?service=${service._id}`);
    else navigate('/join-customer');
  };

  const pageTitle = service && loadedSlug === slug && !error
    ? `${isBn ? 'কাজ আছে' : 'Kaj Ache'} | ${(isBn && service.titleBn) || service.title}`
    : `${isBn ? 'কাজ আছে | সার্ভিস' : 'Kaj Ache | Service'}`;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-hidden="true">
        <div className="min-w-0">
          <div className="aspect-[16/10] rounded-2xl bg-slate-200" />
          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="h-9 w-1/2 rounded-lg bg-slate-200" />
            <div className="h-8 w-24 rounded-lg bg-slate-200" />
          </div>
          <div className="mt-6 h-6 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="mx-2 mb-3 h-5 w-36 rounded bg-slate-200" />
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-3 p-2">
              <div className="h-[3.125rem] w-20 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold text-slate-700">{error || (isBn ? 'সার্ভিস পাওয়া যায়নি' : 'Service not found')}</p>
      </div>
    );
  }

  const title = (isBn && service.titleBn) || service.title;
  const description = (isBn && service.descriptionBn) || service.longDescription || service.description;
  const image = resolveImage(service.image);
  const averageRating = reviews.length ? reviews.reduce((sum, item) => sum + (item.rating || 0), 0) / reviews.length : 0;

  return (
    <div className="bg-white pb-16">
      {/* Main column + related services sidebar on desktop; sidebar drops below on phones */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">

        {/* 16:10, the one shape service images are made for (cards, app, here) */}
        {image ? (
          <img src={image} alt={title} className="aspect-[16/10] w-full rounded-2xl object-cover shadow-md" />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-green-50">
            <Wrench className="text-green-600" size={48} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          {service.basePrice > 0 && <span className="text-2xl font-black text-green-700">৳{service.basePrice}</span>}
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold text-slate-900">{isBn ? 'বিবরণ' : 'Description'}</h2>
          <HtmlContent html={description} className="sm:text-lg" />
        </section>

        {service.features?.length > 0 && (
          <ul className="mt-6 list-disc space-y-1 pl-5 text-slate-600 marker:text-green-500">
            {service.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
        )}

        <button type="button" onClick={handleBook} disabled={isTechnicianUser} aria-describedby={isTechnicianUser ? 'book-technician-note' : undefined} className="mt-8 w-full rounded-xl bg-green-800 py-3.5 text-lg font-bold text-white shadow-lg transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-green-800">
          {isBn ? 'এখনই বুক করুন' : 'Book Now'}
        </button>
        {isTechnicianUser && (
          <p id="book-technician-note" className="mt-2 text-center text-sm text-slate-600">
            {isBn ? 'আপনি টেকনিশিয়ান হিসেবে লগইন করেছেন। বুক করতে গ্রাহক অ্যাকাউন্ট দিয়ে লগইন করুন।' : "You're signed in as a technician. Log in with a customer account to book this service."}
          </p>
        )}

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{isBn ? 'রেটিং ও রিভিউ' : 'Ratings & Reviews'}</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Stars value={averageRating} /> {averageRating.toFixed(1)} ({reviews.length})
              </div>
            )}
          </div>
          {reviews.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-5 text-slate-500">
              <Star size={20} /> {isBn ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">{review.employerName || (isBn ? 'গ্রাহক' : 'Customer')}</span>
                    <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                  </div>
                  <div className="mt-1"><Stars value={review.rating || 0} size={14} /></div>
                  {review.review && <p className="mt-2 text-sm text-slate-600">{review.review}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{isBn ? 'মন্তব্য' : 'Comments'}</h2>
            <span className="rounded-full bg-green-700 px-2.5 py-0.5 text-xs font-bold text-white">{comments.length}</span>
          </div>

          <form onSubmit={handleComment} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 focus-within:border-green-400">
            <input
              aria-label={isBn ? 'মন্তব্য' : 'Comment'}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={isBn ? 'একটি মন্তব্য লিখুন...' : 'Add a comment...'}
              className="flex-1 bg-transparent py-2 text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button type="submit" disabled={posting || !commentText.trim()} aria-label="Send comment" className="p-2 text-green-700 disabled:opacity-40">
              <Send size={20} />
            </button>
          </form>
          <SwalMessage message={commentError} />
          {commentNotice && <p role="status" className="mt-2 text-sm text-green-700">{commentNotice}</p>}

          {comments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500">
              <MessageSquare size={40} className="text-slate-300" />
              {isBn ? 'এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি করুন!' : 'No comments yet. Be the first to comment!'}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <Avatar src={comment.propic} name={comment.name} />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-800">{comment.name || (isBn ? 'ব্যবহারকারী' : 'User')}</span>
                        <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{comment.comment}</p>
                    </div>
                    {comment.replies?.filter((reply) => (reply.status ?? 'approved') === 'approved').map((reply) => (
                      <div key={reply._id} className="mt-2 ml-6 flex gap-2">
                        <Avatar src={reply.propic} name={reply.name} />
                        <div className="flex-1 rounded-2xl bg-green-50 px-4 py-2">
                          <span className="text-sm font-semibold text-slate-800">{reply.name}</span>
                          <p className="text-sm text-slate-600">{reply.reply}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <RelatedServices key={service._id || slug} service={service} isBn={isBn} />
      </div>
      </div>
    </div>
  );
}
