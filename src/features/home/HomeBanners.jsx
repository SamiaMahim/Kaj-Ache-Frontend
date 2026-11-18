import { useEffect, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBanners } from '../../services/api';
import { safeHref } from '../../utils/safeHref';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (callback) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const getReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(REDUCED_MOTION_QUERY).matches);

export default function HomeBanners() {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const paused = hovered || focused || reducedMotion;

  useEffect(() => {
    let active = true;
    fetchBanners().then((items) => {
      if (!active) return;
      const webBanners = items
        .filter((item) => item?.webImageLink)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setBanners(webBanners);
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-advance, except while the user hovers/focuses the carousel or prefers reduced motion
  useEffect(() => {
    if (banners.length < 2 || paused) return undefined;
    const intervalId = window.setInterval(() => setActiveIndex((index) => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(intervalId);
  }, [banners.length, activeIndex, paused]);

  if (!banners.length) return null;

  const go = (step) => setActiveIndex((index) => (index + step + banners.length) % banners.length);

  return (
    <section className="bg-white py-8" aria-roledescription="carousel" aria-label="Promotions">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className="relative overflow-hidden rounded-2xl shadow-lg"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
        >
          <div
            className={`flex ${reducedMotion ? '' : 'transition-transform duration-700 ease-out'}`}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {banners.map((banner, index) => {
              const hidden = index !== activeIndex;
              const href = safeHref(banner.redirect);
              const image = (
                <img
                  src={resolveImage(banner.webImageLink)}
                  alt={banner.newTitle || `Banner ${index + 1}`}
                  className="aspect-[5/2] w-full object-cover sm:aspect-[4/1]"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              );
              return (
                <div
                  key={banner._id || index}
                  className="w-full shrink-0"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${banners.length}`}
                  // Off-screen slides: hidden from screen readers and not tabbable
                  aria-hidden={hidden || undefined}
                  inert={hidden || undefined}
                >
                  {href ? <a href={href} className="block" tabIndex={hidden ? -1 : undefined}>{image}</a> : image}
                </div>
              );
            })}
          </div>

          {banners.length > 1 && (
            <>
              <button type="button" aria-label="Previous banner" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white">
                <ChevronLeft size={20} />
              </button>
              <button type="button" aria-label="Next banner" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white">
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {banners.map((item, index) => (
                  <button
                    key={item._id || index}
                    type="button"
                    aria-label={`Show banner ${index + 1}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
