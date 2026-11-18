import { useEffect, useMemo, useState } from 'react';
import ServiceFilters from '../components/services/ServiceFilters';
import ServiceGrid from '../components/services/ServiceGrid';
import ServiceHeader from '../components/services/ServiceHeader';
import { useLanguage } from '../hooks/useLanguage';
import { fetchServices, fetchCategories } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const getLocalizedText = (value, lang, fallback = '') => {
  if (typeof value === 'string') return value || fallback;

  if (value && typeof value === 'object') {
    return value[lang] || value.EN || value.BN || value.en || value.bn || Object.values(value)[0] || fallback;
  }

  return fallback;
};

export default function ServicesView() {
  const { lang, t } = useLanguage();
  const [services, setServices] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    fetchServices()
      .then((data) => {
        if (isMounted) {
          setServices(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    fetchCategories().then((data) => {
      if (isMounted) setCategoryList(data || []);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryNameMap = useMemo(() => {
    const map = {};
    categoryList.forEach((cat) => {
      map[cat._id] = getLocalizedText({ EN: cat.name, BN: cat.nameBn }, lang, cat.name);
    });
    return map;
  }, [categoryList, lang]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(services.map((service) => service.category).filter(Boolean))];
    return ['all', ...uniqueCategories];
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const titleText = getLocalizedText(service.title, lang, '').toLowerCase();
      const descriptionText = getLocalizedText(service.description, lang, '').toLowerCase();
      const matchesSearch = !query || titleText.includes(query) || descriptionText.includes(query);
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory, lang]);

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <ServiceHeader title={t.servicesPage.title} subtitle={t.servicesPage.subtitle} />

        <ServiceFilters
          categories={categories}
          categoryNameMap={categoryNameMap}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          t={t}
        />

        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">{t.servicesPage.loading}</p>
          </div>
        ) : filteredServices.length > 0 ? (
          <ServiceGrid
            services={filteredServices}
            lang={lang}
            onSelectService={(service) => { if (service.slug) navigate(`/services/${service.slug}`); }}
            t={t}
          />
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">{t.servicesPage.noResults}</p>
          </div>
        )}
      </div>

    </div>
  );
}