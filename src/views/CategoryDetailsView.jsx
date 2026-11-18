import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { fetchCategoryDetails, fetchServicesByCategory } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import HtmlContent from '../components/content/HtmlContent';
import { stripHtml } from '../utils/html';
import ServiceCard from '../components/services/ServiceCard';
import RelatedCategories from '../components/services/RelatedCategories';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function CategoryDetailsView() {
  const { id } = useParams();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const isBn = lang === 'BN';
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  // Which id the current data/error belongs to; loading is derived, so an id change
  // needs no synchronous setState in the effect
  const [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState('');
  const loading = loadedId !== id;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const details = await fetchCategoryDetails(id);
        if (!active) return;
        setCategory(details);
        const items = await fetchServicesByCategory(details?.slug || id);
        if (!active) return;
        setServices(items);
        setError('');
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoadedId(id);
      }
    };
    load();

    return () => {
      active = false;
    };
  }, [id]);

  const pageTitle = category && !loading && !error
    ? `${isBn ? 'কাজ আছে' : 'Kaj Ache'} | ${(isBn && category.nameBn) || category.name}`
    : (isBn ? 'কাজ আছে | ক্যাটাগরি' : 'Kaj Ache | Category');
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-hidden="true">
        <div className="min-w-0">
          <div className="aspect-[3/1] rounded-2xl bg-slate-200" />
          <div className="mt-8 h-9 w-1/3 rounded-lg bg-slate-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-10 mb-4 h-6 w-28 rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <div key={n} className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="aspect-[16/10] bg-slate-200" />
                <div className="space-y-2 px-6 py-5">
                  <div className="h-5 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-5/6 rounded bg-slate-100" />
                  <div className="mt-4 h-4 w-1/3 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="mx-2 mb-3 h-5 w-32 rounded bg-slate-200" />
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-3 p-2">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-200" />
              <div className="h-3 flex-1 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold text-slate-700">{error || (isBn ? 'ক্যাটাগরি পাওয়া যায়নি' : 'Category not found')}</p>
      </div>
    );
  }

  const name = (isBn && category.nameBn) || category.name;
  const description = (isBn && category.descriptionBn) || category.description;
  // Wide cover made for this 3:1 banner; the square card image is the fallback
  const image = resolveImage(category.coverImageLink || category.imageLink);

  return (
    <div className="bg-white pb-16">
      {/* Main column + related categories sidebar on desktop; sidebar drops below on phones */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">

        {image ? (
          <img src={image} alt={name} className="aspect-[3/1] w-full rounded-2xl object-cover shadow-md" />
        ) : (
          <div className="flex aspect-[3/1] w-full items-center justify-center rounded-2xl bg-green-50">
            <LayoutGrid className="text-green-600" size={48} />
          </div>
        )}

        <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{name}</h1>
        <HtmlContent html={description} className="mt-4 max-w-3xl sm:text-lg" />

        <h2 className="mt-10 mb-4 text-xl font-bold text-slate-900">{isBn ? 'সার্ভিসসমূহ' : 'Services'}</h2>

        {services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            {isBn ? 'এই ক্যাটাগরিতে এখনো কোনো সার্ভিস নেই' : 'No services in this category yet'}
          </p>
        ) : (
          // Same cards as the Services page
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service._id}
                title={(isBn && service.titleBn) || service.title}
                description={stripHtml((isBn && service.descriptionBn) || service.shortDescription || service.description)}
                image={resolveImage(service.image)}
                price={service.basePrice}
                startingFromLabel={t.servicesPage.startingFrom}
                onClick={service.slug ? () => navigate(`/services/${service.slug}`) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <RelatedCategories currentId={category._id || id} isBn={isBn} />
      </div>
      </div>
    </div>
  );
}
