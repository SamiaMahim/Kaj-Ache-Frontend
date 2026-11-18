import {
  ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, LogIn, MapPin, Search, ShieldCheck, Star,
} from 'lucide-react';
import HowItWorks from '../home/HowItWorks';

const ICONS = {
  customer: { highlights: [Search, ShieldCheck, ClipboardCheck] },
  technician: { highlights: [BadgeCheck, MapPin, Star] },
};

// Shared layout for the Join Customer / Join Technician pages
export default function JoinRoleView({ role, page, onJoin, onLogin }) {
  const icons = ICONS[role] || ICONS.customer;

  return (
    <div className="bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-green-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-slate-950 sm:text-6xl">{page.headline}</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">{page.intro}</p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onJoin}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-7 py-4 text-base font-bold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 sm:w-auto"
            >
              {page.joinCta}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-800 transition hover:border-green-300 hover:text-green-700 sm:w-auto"
            >
              <LogIn size={18} />
              {page.loginCta}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
            {[page.heroPointOne, page.heroPointTwo].filter(Boolean).map((point) => (
              <span key={point} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-600" /> {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="bg-slate-50/70 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{page.aboutTitle}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{page.aboutText}</p>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {page.highlights.map((item, index) => {
              const Icon = icons.highlights[index % icons.highlights.length];
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                    <Icon size={28} />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journey: the home page's photo flow, locked to this role */}
      <HowItWorks role={role === 'technician' ? 'technician' : 'customer'} title={page.processTitle} subtitle="" />

      {/* Closing CTA */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 to-green-900 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{page.actionTitle}</h2>
          <p className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-sm leading-6 text-green-100">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green-300" />
            <span>{page.trustNote}</span>
          </p>
          <button
            type="button"
            onClick={onJoin}
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-bold text-green-800 shadow-lg transition hover:bg-green-50"
          >
            {page.joinCta}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>
    </div>
  );
}
