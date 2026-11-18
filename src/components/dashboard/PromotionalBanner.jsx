import { useEffect, useState } from 'react';
import { ArrowUpRight, Megaphone } from 'lucide-react';
import { fetchBanners } from '../../services/api';
import { safeHref } from '../../utils/safeHref';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  // Relative `/uploads/...` paths are served by the API, not this site
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function PromotionalBanner({ role }) {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const nextBanners = await fetchBanners();
      if (active) setBanners(nextBanners);
    };
    load();
    const intervalId = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [role]);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const intervalId = window.setInterval(() => setActiveIndex((index) => (index + 1) % banners.length), 6000);
    return () => window.clearInterval(intervalId);
  }, [banners.length]);

  if (!banners.length) return null;
  const banner = banners[activeIndex % banners.length];
  const image = resolveImage(banner.webImageLink || banner.appImageApp);
  const redirect = safeHref(banner.redirect);

  return (
    <section className="relative mb-6 min-h-44 overflow-hidden rounded-3xl bg-slate-900 shadow-xl sm:min-h-56">
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/75 to-transparent" />
      <div className="relative flex min-h-44 max-w-xl flex-col justify-center p-6 text-white sm:min-h-56 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"><Megaphone size={15} /> {role === 'technician' ? 'Technician update' : 'Kaj Ache update'}</div>
        <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{banner.newTitle}</h2>
        {redirect && <a href={redirect} className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-cyan-50">Explore now <ArrowUpRight size={16} /></a>}
      </div>
      {banners.length > 1 && <div className="absolute bottom-4 right-5 flex gap-1.5">{banners.map((item, index) => <button key={item._id || index} type="button" aria-label={`Show promotion ${index + 1}`} onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />)}</div>}
    </section>
  );
}
