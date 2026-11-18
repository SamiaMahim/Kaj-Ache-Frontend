import { useState } from 'react';
import { BadgeCheck, Clock3, MapPin, Pencil, Send, Users, Wallet } from 'lucide-react';
import HtmlContent from '../components/content/HtmlContent';
import NotApprovedNotice from '../components/dashboard/NotApprovedNotice';
import ReportProblemButton from '../components/dashboard/ReportProblemButton';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { fetchAvailableRecruitmentRequests, fetchMyRecruitmentApplications, placeRecruitmentBid, updateRecruitmentBid } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import usePagedList from '../hooks/usePagedList';
import { successToast } from '../utils/alerts';
import { BID_STATUS_STYLES, enumLabel, fmt, formatTaka, placeText } from '../utils/jobs';
import { RECRUITMENT_STATUS } from '../utils/recruitment';
import SwalMessage from '../components/ui/SwalMessage';
import PostImage from '../components/ui/PostImage';

const REFRESH_MS = 15000;
const MAX_SALARY = 10000000;

const salaryLine = (j, item) => (item.duration
  ? fmt(j.salaryWithDuration, { salary: formatTaka(item.salary), duration: item.duration })
  : fmt(j.salaryOnly, { salary: formatTaka(item.salary) }));

// `bid` is the technician's own application on this post (myBid from /available), or null
function ApplicationForm({ item, bid, onSaved }) {
  const { t } = useLanguage();
  const j = t.jobs;
  // The application returned by the last save, shown until the next refresh brings myBid
  const [savedBid, setSavedBid] = useState(null);
  const currentBid = bid || savedBid;
  const formFrom = (source) => ({ proposedSalary: source?.proposedSalary ?? (Math.trunc(Number(item.salary)) || ''), message: source?.message || '' });
  const [form, setForm] = useState(() => formFrom(currentBid));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (currentBid && !editing) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
        <span>{fmt(j.yourApplication, { salary: formatTaka(currentBid.proposedSalary) })} · {enumLabel(j.bidStatus, currentBid.status)}</span>
        {currentBid.status === 'active' && (
          <button
            type="button"
            onClick={() => { setForm(formFrom(currentBid)); setEditing(true); }}
            className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-bold text-green-700 hover:border-green-500"
          >
            <Pencil size={13} /> {j.editApplication}
          </button>
        )}
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const proposedSalary = Number(form.proposedSalary);
    if (!Number.isFinite(proposedSalary) || proposedSalary < 1 || proposedSalary > MAX_SALARY) {
      setError(fmt(j.salaryOutOfRange, { max: formatTaka(MAX_SALARY) }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { proposedSalary, message: form.message.trim() };
      const saved = currentBid?._id
        ? await updateRecruitmentBid(item._id, currentBid._id, payload)
        : await placeRecruitmentBid(item._id, payload);
      successToast(currentBid?._id ? j.applicationUpdated : j.applicationSent);
      if (saved?._id) setSavedBid(saved);
      setEditing(false);
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
      if (saveError.status === 409) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
      <label className="block text-xs font-bold text-slate-500">
        {j.proposedSalary}
        <input type="number" required min={1} max={MAX_SALARY} value={form.proposedSalary} onChange={(event) => update('proposedSalary', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500 sm:w-1/2" />
      </label>
      <textarea rows={3} maxLength={500} value={form.message} onChange={(event) => update('message', event.target.value)} placeholder={j.applicationMessagePlaceholder} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-500" />
      <SwalMessage message={error} />
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
          <Send size={16} /> {saving ? j.sending : currentBid?._id ? j.updateApplication : j.apply}
        </button>
        {currentBid && (
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">{j.cancel}</button>
        )}
      </div>
    </form>
  );
}

function OpenPosts({ list, onSaved }) {
  const { t } = useLanguage();
  const j = t.jobs;

  if (list.error?.status === 403) return <NotApprovedNotice message={list.error.message} />;
  if (!list.loaded) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
        {[0, 1].map((key) => <div key={key} className="h-56 animate-pulse rounded-3xl bg-slate-100" />)}
      </div>
    );
  }
  if (!list.items.length) {
    return list.error ? null : (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <BadgeCheck className="mx-auto text-slate-300" size={34} />
        <h2 className="mt-4 text-lg font-black text-slate-800">{j.noOpenRecruitment}</h2>
        <p className="mt-2 text-sm text-slate-500">{j.newPostsAppear}</p>
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {list.items.map((item) => (
          <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex min-w-0 items-start gap-3">
              <PostImage image={item.image} icon={BadgeCheck} className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0">
                {item.category?.name && <span className="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{item.category.name}</span>}
                <h2 className="mt-2 text-xl font-black text-slate-900">{item.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm font-black text-green-600"><Wallet size={15} /> {salaryLine(j, item)}</p>
              </div>
            </div>
            <HtmlContent html={item.details} className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600" />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              {placeText(item.location) && <span className="flex items-center gap-1"><MapPin size={14} /> {placeText(item.location)}</span>}
              <span className="flex items-center gap-1"><Users size={14} /> {fmt(j.applicantsCount, { count: item.bidsCount || 0 })}</span>
            </div>
            {/* Remounts once myBid arrives so the form state follows the saved application */}
            <ApplicationForm key={item.myBid?._id || 'new'} item={item} bid={item.myBid} onSaved={onSaved} />
          </article>
        ))}
      </div>
      <LoadMoreButton list={list} />
    </>
  );
}

function MyApplications({ list }) {
  const { t } = useLanguage();
  const j = t.jobs;

  if (!list.loaded) return <p className="text-sm text-slate-500">{j.loading}</p>;
  if (!list.items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
        {j.noApplicationsYet}
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {list.items.map((bid) => {
          const job = bid.recruitmentRequest;
          if (!job) return null;
          const jobStatus = RECRUITMENT_STATUS[job.status];
          const hired = bid.status === 'selected';
          return (
            <article key={bid._id} className={`rounded-2xl border bg-white p-4 ${hired ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <PostImage image={job.image} icon={BadgeCheck} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900">{job.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${BID_STATUS_STYLES[bid.status] || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.bidStatus, bid.status)}</span>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${jobStatus?.className || 'bg-slate-100 text-slate-600'}`}>{enumLabel(j.recruitmentStatus, job.status)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1"><Wallet size={13} /> {salaryLine(j, job)}</span>
                <span className="flex items-center gap-1"><Send size={13} /> {fmt(j.yourApplication, { salary: formatTaka(bid.proposedSalary) })}</span>
                {placeText(job.location) && <span className="flex items-center gap-1"><MapPin size={13} /> {placeText(job.location)}</span>}
                {job.duration && <span className="flex items-center gap-1"><Clock3 size={13} /> {job.duration}</span>}
              </div>
              {hired && job.status === 'hired' && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{j.youWereHired}</p>}
              {job.status === 'cancelled' && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {j.recruitmentStatus.cancelled}{job.cancellationReason ? `: ${job.cancellationReason}` : ''}
                </p>
              )}
              <div className="mt-3"><ReportProblemButton recruitmentRequest={job._id} /></div>
            </article>
          );
        })}
      </div>
      <LoadMoreButton list={list} />
    </>
  );
}

// Technician side of recruitment: open job posts to apply to, and their own applications
export default function TechnicianRecruitmentView() {
  const { t } = useLanguage();
  const j = t.jobs;
  const [tab, setTab] = useState('open');
  // Bumped after an application so both lists reload immediately
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  const available = usePagedList(fetchAvailableRecruitmentRequests, { refreshMs: REFRESH_MS, reloadKey });
  const applications = usePagedList(fetchMyRecruitmentApplications, { refreshMs: REFRESH_MS, reloadKey });
  const current = tab === 'open' ? available : applications;
  const loadError = current.error && current.error.status !== 403 ? current.error.message : '';

  const tabs = [
    { key: 'open', label: j.openJobsTab, count: available.total },
    { key: 'mine', label: j.myApplicationsTab, count: applications.total },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-600"><BadgeCheck size={14} /> {j.recruitment}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{j.techRecruitmentTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{j.techRecruitmentSubtitle}</p>
      </div>

      <div role="tablist" className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {label} <span className="ml-1 opacity-75">{count}</span>
          </button>
        ))}
      </div>

      {loadError && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>}

      {tab === 'open' ? <OpenPosts list={available} onSaved={reload} /> : <MyApplications list={applications} />}
    </div>
  );
}
