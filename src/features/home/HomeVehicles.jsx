import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ambulance, ArrowRight, Bike, PhoneCall, Truck } from 'lucide-react';
import { fetchCategories, fetchServices } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTaka } from '../../utils/jobs';

// Highlighted strip for the vehicle category (van, truck, ambulance) right under the hero.
// Renders nothing until a category with this slug exists and has active services.
const VEHICLE_CATEGORY_SLUG = 'vehicle-rental';
// Shown on the ambulance card; same number as the footer
const SUPPORT_PHONE = '+8801309403219';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

// Picked by slug keyword so renamed services still get the right icon and order.
// "van" is the rickshaw van (pedal cycle van), hence the bike icon.
const KINDS = [
  { key: 'van', Icon: Bike },
  { key: 'truck', Icon: Truck },
  { key: 'ambulance', Icon: Ambulance },
];
const kindOf = (service) => {
  const slug = (service.slug || '').toLowerCase();
  const index = KINDS.findIndex((k) => slug.includes(k.key));
  return index === -1 ? { index: KINDS.length, Icon: Truck, key: '' } : { index, ...KINDS[index] };
};

export default function HomeVehicles() {
  const { lang, t } = useLanguage();
  const [services, setServices] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCategories(), fetchServices()]).then(([categories, allServices]) => {
      const category = (categories || []).find((c) => c.slug === VEHICLE_CATEGORY_SLUG);
      if (!active || !category) return;
      const items = (allServices || [])
        .filter((s) => String(s.category?._id ?? s.category) === String(category._id) && s.slug)
        .sort((a, b) => kindOf(a).index - kindOf(b).index);
      setServices(items);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!services.length) return null;
  const copy = t.homeVehicles;

  return (
    <section className="relative overflow-hidden bg-[#0B4C24] py-16 sm:py-20">
      {/* Soft yellow glow so the band reads as a feature, not another white section */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#FBC40F]/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-[#FBC40F] px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-[#0B4C24]">
              {copy.badge}
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">{copy.title}</h2>
            <p className="mt-3 text-sm text-green-100/90 sm:text-base">{copy.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const { Icon, key } = kindOf(service);
            const isAmbulance = key === 'ambulance';
            const title = service.title?.[lang] || service.title?.EN;
            const image = resolveImage(service.image);
            const hasPrice = Number(service.basePrice) > 0;

            return (
              <div
                key={service.id}
                className={`group flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-black/20 ring-1 transition duration-300 hover:-translate-y-1 ${isAmbulance ? 'ring-red-500/60' : 'ring-white/10'}`}
              >
                <Link to={`/services/${service.slug}`} className="flex flex-1 flex-col focus-visible:outline-none">
                  <div className="relative aspect-[16/10] overflow-hidden bg-green-50">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                        <Icon className="text-green-700" size={56} strokeWidth={1.5} />
                      </div>
                    )}
                    <span
                      className={`absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${isAmbulance ? 'bg-red-600 text-white' : 'bg-[#FBC40F] text-[#0B4C24]'}`}
                    >
                      <Icon size={24} strokeWidth={2.25} aria-hidden="true" />
                    </span>
                    {isAmbulance && (
                      <span className="absolute right-4 top-4 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                        {copy.available24}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-green-700">{title}</h3>
                    <div className="mt-auto flex items-center justify-between pt-5">
                      {hasPrice ? (
                        <span className="text-sm text-slate-500">
                          {copy.from} <span className="text-lg font-bold text-green-700">{formatTaka(service.basePrice)}</span>
                        </span>
                      ) : <span />}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B4C24] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-green-700">
                        {copy.book} <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>

                {isAmbulance && (
                  <a
                    href={`tel:${SUPPORT_PHONE}`}
                    className="flex items-center justify-center gap-2 bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <PhoneCall size={16} aria-hidden="true" /> {copy.callNow}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-green-100/70">{copy.emergencyNote}</p>
      </div>
    </section>
  );
}
