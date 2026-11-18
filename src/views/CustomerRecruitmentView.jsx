import { lazy, Suspense, useState } from 'react';
import { BadgeCheck, ChevronRight, Plus, Users, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMyRecruitmentRequests } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import usePagedList from '../hooks/usePagedList';
import { stripHtml } from '../utils/html';
import { PAYMENT_STATUS_STYLES, enumLabel, fmt, formatTaka } from '../utils/jobs';
import { RECRUITMENT_STATUS } from '../utils/recruitment';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import PostImage from '../components/ui/PostImage';

// The post form carries the rich text editor, so it only loads once opened
const RecruitmentPostModal = lazy(() => import('../components/dashboard/RecruitmentPostModal'));

// Payment states worth flagging on the list (unpaid/paid are implied by the post status)
const FLAGGED_PAYMENTS = ['refund_pending', 'refunded', 'forfeited'];

// Customer's job posts (recruitment requests); new posts are made in RecruitmentPostModal
export default function CustomerRecruitmentView() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const j = t.jobs;
  const list = usePagedList(fetchMyRecruitmentRequests);
  const [showForm, setShowForm] = useState(false);

  const openForm = () => setShowForm(true);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><BadgeCheck size={14} /> {j.recruitmentRequests}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{j.myJobPosts}</h1>
          <p className="mt-2 text-sm text-slate-500">{j.myJobPostsSubtitle}</p>
        </div>
        <button type="button" onClick={openForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700">
          <Plus size={16} /> {j.postRecruitmentRequest}
        </button>
      </div>

      {list.error && <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{list.error.message}</p>}

      {!list.loaded ? (
        <p className="mt-6 text-sm text-slate-500">{j.loading}</p>
      ) : list.items.length ? (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {list.items.map((item) => {
              const status = RECRUITMENT_STATUS[item.status];
              const summary = stripHtml(item.details);
              return (
                <Link key={item._id} to={`/dashboard/customer/recruitment/${item._id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-green-500">
                  <div className="flex min-w-0 items-start gap-3">
                    <PostImage image={item.image} icon={BadgeCheck} className="h-12 w-12 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-900">{item.title || j.jobPost}</p>
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${status?.className || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.recruitmentStatus, item.status)}</span>
                        {FLAGGED_PAYMENTS.includes(item.paymentStatus) && (
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_STYLES[item.paymentStatus]}`}>{enumLabel(j.paymentStatus, item.paymentStatus)}</span>
                        )}
                      </div>
                      {summary && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{summary}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Wallet size={13} /> {item.duration ? fmt(j.salaryWithDuration, { salary: formatTaka(item.salary), duration: item.duration }) : fmt(j.salaryOnly, { salary: formatTaka(item.salary) })}
                        </span>
                        <span className="flex items-center gap-1"><Users size={13} /> {fmt(j.applicantsCount, { count: item.bidsCount || 0 })}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400 group-hover:text-green-600" />
                </Link>
              );
            })}
          </div>
          <LoadMoreButton list={list} />
        </>
      ) : !list.error && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BadgeCheck size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">{j.noJobPosts}</p>
          <button type="button" onClick={openForm} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
            <Plus size={14} /> {j.postFirstJob}
          </button>
        </div>
      )}

      {showForm && (
        <Suspense fallback={null}>
          <RecruitmentPostModal
            isOpen
            onClose={() => setShowForm(false)}
            onPosted={(created) => navigate(`/dashboard/customer/recruitment/${created._id}`)}
          />
        </Suspense>
      )}
    </div>
  );
}
