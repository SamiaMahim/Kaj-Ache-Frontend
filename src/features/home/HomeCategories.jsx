import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { fetchCategories } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function HomeCategories() {
  const { lang, t } = useLanguage();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;
    fetchCategories().then((items) => {
      if (active) setCategories(items || []);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!categories.length) return null;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t.homeCategories.title}
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            {t.homeCategories.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-5 lg:grid-cols-6">
          {categories.map((category) => {
            const name = (lang === 'BN' && category.nameBn) || category.name;
            const image = resolveImage(category.imageLink);
            return (
              <Link key={category._id} to={`/categories/${category._id}`} className="group text-center focus-visible:outline-none">
                {/* Card: image only, no padding */}
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-green-50 shadow-sm ring-1 ring-slate-900/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-green-900/10 group-focus-visible:ring-2 group-focus-visible:ring-green-600">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                      <LayoutGrid className="text-green-600" size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-green-950/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                {/* Name under the card */}
                <span className="mt-2.5 line-clamp-2 block text-sm font-semibold text-slate-800 transition-colors group-hover:text-green-700 sm:text-base">
                  {name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
