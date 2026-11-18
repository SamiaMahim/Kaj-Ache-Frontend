import { Mail, MapPin, Phone } from 'lucide-react';
import RichText from './RichText';

const CONTACT_ICONS = { email: Mail, phone: Phone, location: MapPin };

export default function ContentPageView({ page }) {
  return (
    <div className="bg-slate-50 px-6 py-12 sm:py-16">
      <article className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.3)]">
        <header className="border-b border-slate-100 bg-gradient-to-br from-green-50 via-white to-green-50 px-6 py-10 sm:px-12 sm:py-14">
          {page.eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">{page.eyebrow}</p>}
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{page.intro}</p>
        </header>

        <div className="grid gap-10 px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1fr_0.7fr]">
          <div className="space-y-10">
            {page.sections?.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-bold text-slate-950">{section.title}</h2>
                <div className="mt-4">
                  <RichText blocks={section.blocks} />
                </div>
              </section>
            ))}
          </div>

          {page.details?.length > 0 && (
            <aside className="h-fit rounded-2xl border border-green-100 bg-green-50/50 p-6">
              <h2 className="text-xl font-bold text-slate-950">{page.detailsTitle}</h2>
              <div className="mt-5 space-y-4">
                {page.details.map((detail) => {
                  const Icon = CONTACT_ICONS[detail.type] || Mail;
                  return (
                    <div key={detail.type} className="flex gap-3">
                      <Icon className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" size={19} />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{detail.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{detail.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </article>
    </div>
  );
}