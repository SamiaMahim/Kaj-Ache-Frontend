import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { fetchCategories } from '../../services/api';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

const MAX_ITEMS = 8;

/** Sidebar list of the other categories on a category details page. */
export default function RelatedCategories({ currentId, isBn }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    fetchCategories().then((list) => {
      if (!active) return;
      setItems((list || []).filter((c) => String(c._id) !== String(currentId)).slice(0, MAX_ITEMS));
    });
    return () => { active = false; };
  }, [currentId]);

  if (items && items.length === 0) return null;

  return (
    <aside aria-labelledby="related-categories-title">
      <h2 id="related-categories-title" className="mb-2 px-2 text-base font-bold text-slate-900">
        {isBn ? 'অন্যান্য ক্যাটাগরি' : 'Related categories'}
      </h2>

      {items === null ? (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <li key={n} className="flex animate-pulse items-center gap-3 rounded-xl p-2">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-200" />
              <div className="h-3 flex-1 rounded bg-slate-100" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1">
          {items.map((category) => {
            const name = (isBn && category.nameBn) || category.name;
            const image = resolveImage(category.imageLink);
            return (
              <li key={category._id}>
                <Link
                  to={`/categories/${category._id}`}
                  className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-green-50"
                >
                  {/* Square card image, same as the home page category tiles */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50">
                    {image ? (
                      <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <LayoutGrid size={18} className="text-green-600" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 group-hover:text-green-700">{name}</span>
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
