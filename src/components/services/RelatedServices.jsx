import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Wrench } from 'lucide-react';
import { fetchRelatedServices } from '../../services/api';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

/** Sidebar list of other services on a service details page. */
export default function RelatedServices({ service, isBn }) {
  // Keyed by service id in the parent, so each service starts fresh
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    fetchRelatedServices(service).then((list) => {
      if (active) setItems(list);
    });
    return () => { active = false; };
  }, [service]);

  if (items && items.length === 0) return null;

  return (
    <aside aria-labelledby="related-services-title">
      <div className="mb-2 flex items-center justify-between gap-2 px-2">
        <h2 id="related-services-title" className="text-base font-bold text-slate-900">
          {isBn ? 'সম্পর্কিত সার্ভিস' : 'Related services'}
        </h2>
        <Link to="/services" className="text-xs font-semibold text-green-700 hover:underline">
          {isBn ? 'সব দেখুন' : 'See all'}
        </Link>
      </div>

      {items === null ? (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="flex animate-pulse items-center gap-3 rounded-xl p-2">
              <div className="h-[3.125rem] w-20 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const title = (isBn && item.titleBn) || item.title;
            const image = resolveImage(item.image);
            return (
              <li key={item._id}>
                <Link
                  to={`/services/${item.slug}`}
                  className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-green-50"
                >
                  {/* 16:10 thumbnail, the shape service images are made for */}
                  <div className="flex h-[3.125rem] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50">
                    {image ? (
                      <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <Wrench size={18} className="text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-green-700">{title}</p>
                    {item.basePrice > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {isBn ? 'শুরু' : 'From'} <span className="font-bold text-green-700">৳{Number(item.basePrice).toLocaleString('en-IN')}</span>
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-green-600" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
