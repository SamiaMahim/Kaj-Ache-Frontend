import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  BriefcaseBusiness, 
  PlusCircle,
  Search
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import AppDownloadButton from '../../components/ui/AppDownloadButton';
import heroBgImage from '../../assets/image/hero-bg.webp';
import heroBgMobileImage from '../../assets/image/hero-bg-mobile.webp';

export default function HeroSection() {
  const { lang, t } = useLanguage();

  return (
    <section
      className="relative overflow-hidden bg-[#f4fef9] pt-16 pb-[85vw] lg:flex lg:min-h-[640px] lg:items-center lg:py-24"
      style={{ '--hero-bg': `url(${heroBgImage})`, '--hero-bg-mobile': `url(${heroBgMobileImage})` }}
    >
      {/* Photo backgrounds, each with an empty mint area made for the copy.
          Mobile/tablet: portrait image pinned to the bottom at full width; the
          section's bottom padding leaves room for the technician below the text.
          Desktop: landscape image, copy on its left side. CSS backgrounds inside
          media queries, so each device downloads only its own image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[image:var(--hero-bg-mobile)] bg-[length:100%_auto] bg-bottom bg-no-repeat lg:bg-[image:var(--hero-bg)] lg:bg-cover lg:bg-right"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Messaging & CTAs */}
          <div className="lg:col-span-6">

            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-green-700">
              On-demand home services in Bangladesh
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              {lang === 'BN' ? (
                <>দক্ষ টেকনিশিয়ান খুঁজুন, <br /><span className="bg-gradient-to-r from-green-600 via-green-600 to-green-600 bg-clip-text text-transparent">ঝামেলামুক্ত সেবা পান</span> ঘরে বসেই</>
              ) : (
                <>Hire Verified Technicians <br /><span className="bg-gradient-to-r from-green-600 via-green-600 to-green-600 bg-clip-text text-transparent">With Guaranteed Pricing</span></>
              )}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.hero.desc || 'Bangladesh’s premier on-demand technician network. Post your requirement, receive competitive technician bids, and pay zero risk with escrow-backed protection.'}
            </p>

            {/* Action Buttons: hidden on phones, where the bottom nav covers join/login/services */}
            <div className="mt-8 hidden flex-wrap items-center gap-3.5 sm:flex">
              <Link 
                to="/join-customer" 
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-all duration-200 hover:from-green-700 hover:to-teal-700 hover:shadow-xl hover:shadow-green-600/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <PlusCircle size={18} />
                <span>{t.hero.btnCust || 'Hire a Technician'}</span>
                <ArrowRight size={16} />
              </Link>
              
              <Link 
                to="/join-technician" 
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-xs transition-all duration-200 hover:border-green-600 hover:text-green-600 hover:bg-green-50/50 hover:-translate-y-0.5"
              >
                <BriefcaseBusiness size={18} className="text-green-600" />
                <span>{t.hero.btnTech || 'Become a Technician'}</span>
              </Link>
            </div>

            <div className="mt-5 hidden flex-wrap items-center gap-x-4 gap-y-3 sm:flex">
              <AppDownloadButton label={t.hero.downloadApp} />
              <Link to="/services" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-bold text-slate-600 backdrop-blur-sm hover:text-green-600 transition">
                <Search size={14} /> {t.hero.browseAll || 'Browse all services'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}