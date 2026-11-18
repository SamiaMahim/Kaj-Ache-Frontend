import { lazy, Suspense, useState } from 'react';
import { CalendarDays, ChevronRight, MapPin, Plus, Wallet, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMyInstantServices } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import usePagedList from '../hooks/usePagedList';
import { INSTANT_STATUS_STYLES, PAYMENT_STATUS_STYLES, enumLabel, fmt, formatTaka, placeText } from '../utils/jobs';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import PostImage from '../components/ui/PostImage';

// The post form carries the map picker, so it only loads once opened
const InstantServicePostModal = lazy(() => import('../components/dashboard/InstantServicePostModal'));

// Payment states worth flagging on the list (unpaid/paid are implied by the job status)
const FLAGGED_PAYMENTS = ['refund_pending', 'refunded'];

// Customer's instant requests; new requests are made in InstantServicePostModal
export default function CustomerInstantServicesView() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const j = t.jobs;
  const list = usePagedList(fetchMyInstantServices);
  const [showForm, setShowForm] = useState(false);

  const openForm = () => setShowForm(true);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><Zap size={14} /> {j.instantService}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{j.myInstantRequests}</h1>
          <p className="mt-2 text-sm text-slate-500">{j.myInstantRequestsSubtitle}</p>
        </div>
        <button type="button" onClick={openForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700">
          <Plus size={16} /> {j.postInstantRequest}
        </button>
      </div>

      {list.error && <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{list.error.message}</p>}

      {!list.loaded ? (
        <p className="mt-6 text-sm text-slate-500">{j.loading}</p>
      ) : list.items.length ? (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {list.items.map((item) => (
              <Link key={item._id} to={`/dashboard/customer/instant/${item._id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-green-500">
                <div className="flex min-w-0 items-start gap-3">
                  <PostImage image={item.image} icon={Zap} className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-slate-900">{item.title}</p>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${INSTANT_STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.instantStatus, item.status)}</span>
                      {FLAGGED_PAYMENTS.includes(item.paymentStatus) && (
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_STYLES[item.paymentStatus]}`}>{enumLabel(j.paymentStatus, item.paymentStatus)}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><Wallet size={13} /> {formatTaka(item.priceMin)}–{formatTaka(item.priceMax)}</span>
                      {placeText(item.location) && <span className="flex items-center gap-1"><MapPin size={13} /> {placeText(item.location)}</span>}
                      {item.schedule?.date && <span className="flex items-center gap-1"><CalendarDays size={13} /> {item.schedule.date}</span>}
                      <span>{fmt(j.bidsCount, { count: item.bidsCount || 0 })}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-400 group-hover:text-green-600" />
              </Link>
            ))}
          </div>
          <LoadMoreButton list={list} />
        </>
      ) : !list.error && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Zap size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">{j.noInstantRequests}</p>
          <button type="button" onClick={openForm} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
            <Plus size={14} /> {j.postFirstInstant}
          </button>
        </div>
      )}

      {showForm && (
        <Suspense fallback={null}>
          <InstantServicePostModal
            isOpen
            onClose={() => setShowForm(false)}
            onPosted={(created) => navigate(`/dashboard/customer/instant/${created._id}`)}
          />
        </Suspense>
      )}
    </div>
  );
}
