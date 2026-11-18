import { useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, Check, UserCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import customerStep1 from '../../assets/image/how-customer-1.webp';
import customerStep2 from '../../assets/image/how-customer-2.webp';
import customerStep3 from '../../assets/image/how-customer-3.webp';
import customerStep4 from '../../assets/image/how-customer-4.webp';
import technicianStep1 from '../../assets/image/how-technician-1.webp';
import technicianStep2 from '../../assets/image/how-technician-2.webp';
import technicianStep3 from '../../assets/image/how-technician-3.webp';
import technicianStep4 from '../../assets/image/how-technician-4.webp';

const STEP_IMAGES = {
  customer: [customerStep1, customerStep2, customerStep3, customerStep4],
  technician: [technicianStep1, technicianStep2, technicianStep3, technicianStep4],
};

// `role` locks the section to one flow and hides the toggle (used on the join pages);
// `title`/`subtitle` override the default heading.
export default function HowItWorks({ role, title, subtitle }) {
  const { t } = useLanguage();
  const [selectedTab, setActiveTab] = useState('customer');
  const activeTab = role || selectedTab;
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  const steps = activeTab === 'customer' ? t.howItWorks.customerSteps : t.howItWorks.technicianSteps;
  const images = STEP_IMAGES[activeTab];

  // Start the reveal + autoplay only once the section scrolls into view
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActiveStepIndex(0);
  };

  // The active step's timer bar drives autoplay: when its CSS animation ends we advance.
  // Hovering pauses the animation (and so the autoplay); reduced-motion disables it.
  const advance = () => setActiveStepIndex((index) => (index + 1) % steps.length);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white py-20">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-green-300/20 blur-3xl motion-safe:animate-[hiw-float_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl motion-safe:animate-[hiw-float_11s_ease-in-out_infinite_reverse]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title || t.howItWorks.title}</h2>
          {(subtitle ?? t.howItWorks.subtitle) && (
            <p className="mt-3 text-sm text-slate-600 sm:text-base">{subtitle ?? t.howItWorks.subtitle}</p>
          )}

          {/* Sliding role toggle (home page only) */}
          {!role && (
          <div className="relative mt-8 inline-grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <span
              aria-hidden="true"
              className="absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-green-700 shadow-md shadow-green-700/25 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ transform: activeTab === 'technician' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[
              ['customer', UserCheck, t.howItWorks.customers],
              ['technician', BriefcaseBusiness, t.howItWorks.technicians],
            ].map(([tab, Icon, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                aria-pressed={activeTab === tab}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-colors duration-300 sm:px-7 ${
                  activeTab === tab ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Steps: rectangular photo cards. Phones stack them with the photo
            on the left; tablets 2 columns; desktop one row of 4. */}
        <ol key={activeTab} className="mt-14 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const image = images[idx % images.length];
            const isActive = idx === activeStepIndex;
            const isDone = idx < activeStepIndex;

            return (
              <li
                key={step.id || idx}
                className={`${inView ? 'motion-safe:animate-[hiw-rise_.6s_cubic-bezier(.2,.8,.2,1)_both]' : 'motion-safe:opacity-0'}`}
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group relative flex h-full w-full overflow-hidden rounded-2xl border bg-white text-left transition-all duration-500 sm:flex-col ${
                    isActive
                      ? 'border-green-500 shadow-xl shadow-green-900/10 ring-4 ring-green-500/10 lg:-translate-y-1.5'
                      : 'border-slate-200 shadow-sm hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  {/* Photo */}
                  <span className="relative block w-32 shrink-0 overflow-hidden bg-slate-100 sm:aspect-[4/3] sm:w-full">
                    <img
                      src={image}
                      alt=""
                      width={1254}
                      height={1254}
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        isActive ? 'scale-105 saturate-100' : 'saturate-[.7] group-hover:scale-105 group-hover:saturate-100'
                      }`}
                    />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/40 to-transparent" />
                    <span
                      className={`absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-black shadow-md transition-colors duration-500 ${
                        isActive ? 'bg-green-600 text-white' : isDone ? 'bg-white text-green-700' : 'bg-white/90 text-slate-700'
                      }`}
                    >
                      {isDone ? <Check size={14} strokeWidth={3} /> : String(idx + 1).padStart(2, '0')}
                    </span>
                  </span>

                  {/* Text */}
                  <span className="flex flex-1 flex-col p-4 sm:p-5">
                    <span className={`block text-base font-bold transition-colors sm:text-lg ${isActive ? 'text-green-800' : 'text-slate-900'}`}>
                      {step.title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{step.desc}</span>
                  </span>

                  {/* Autoplay timer along the card's bottom edge */}
                  <span className="absolute inset-x-0 bottom-0 block h-1 bg-slate-100">
                    {isActive && inView && (
                      <span
                        key={`${activeTab}-${idx}`}
                        onAnimationEnd={advance}
                        className="block h-full w-0 bg-green-600 motion-safe:animate-[hiw-fill_4.5s_linear_forwards] group-hover:[animation-play-state:paused] motion-reduce:w-full"
                      />
                    )}
                    {isDone && <span className="block h-full w-full bg-green-200" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
