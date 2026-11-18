import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { fetchPublicInstantServices, fetchPublicRecruitmentRequests } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../context/AuthContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

const formatTaka = (value) => `৳${Number(value || 0).toLocaleString('en-IN')}`;

const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

// Jobs are open to technicians: both have a technician dashboard page. Instant links there for
// everyone (ProtectedRoute sends visitors to /join-technician); recruitment cards send signed-in
// technicians to their recruitment page and everyone else to the technician sign-up.
const SECTIONS = [
  {
    key: 'instant',
    fetch: fetchPublicInstantServices,
    titleKey: 'instantTitle',
    subtitleKey: 'instantSubtitle',
    to: '/dashboard/technician/instant',
    price: (item) => `${formatTaka(item.priceMin)} – ${formatTaka(item.priceMax)}`,
  },
  {
    key: 'recruitment',
    fetch: fetchPublicRecruitmentRequests,
    titleKey: 'recruitmentTitle',
    subtitleKey: 'recruitmentSubtitle',
    to: '/join-technician',
    technicianTo: '/dashboard/technician/recruitment',
    price: (item, t) => `${t.homeOpenJobs.salary} ${formatTaka(item.salary)}${item.duration ? ` · ${item.duration}` : ''}`,
  },
];

function JobCard({ item, price, to, lang, t }) {
  const image = resolveImage(item.image);
  const category = item.category && ((lang === 'BN' && item.category.nameBn) || item.category.name);
  const place = capitalize(item.location?.district || item.location?.city || '');

  return (
    <Link
      to={to}
      className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
        {image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        {category && (
          <span className="mb-1.5 inline-block rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
            {category}
          </span>
        )}
        <h3 className="line-clamp-1 font-bold text-slate-900 transition-colors group-hover:text-green-700">{item.title}</h3>
        <p className="mt-1 text-sm font-semibold text-green-700">{price}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            {place && (
              <>
                <MapPin size={13} /> {place}
              </>
            )}
          </span>
          <span>{t.homeOpenJobs.bids.replace('{count}', item.bidsCount || 0)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeOpenJobs() {
  const { lang, t } = useLanguage();
  const { isAuthenticated, role } = useAuth();
  const isTechnician = isAuthenticated && role === 'technician';
  const linkFor = (section) => (isTechnician && section.technicianTo) || section.to;
  const [lists, setLists] = useState({});

  useEffect(() => {
    let active = true;
    SECTIONS.forEach((section) => {
      section.fetch().then((items) => {
        if (active) setLists((prev) => ({ ...prev, [section.key]: items }));
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const visible = SECTIONS.filter((section) => lists[section.key]?.length);
  if (!visible.length) return null;

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6">
        {visible.map((section) => (
          <div key={section.key}>
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {t.homeOpenJobs[section.titleKey]}
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">{t.homeOpenJobs[section.subtitleKey]}</p>
            </div>
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
              {lists[section.key].map((item) => (
                <JobCard key={item._id} item={item} price={section.price(item, t)} to={linkFor(section)} lang={lang} t={t} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                to={linkFor(section)}
                className="inline-flex items-center gap-1 text-sm font-bold text-green-700 transition hover:text-green-800"
              >
                {t.homeOpenJobs.seeAll} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
