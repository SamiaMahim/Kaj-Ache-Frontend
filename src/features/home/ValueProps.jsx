import { ShieldCheck, Users, Search, Headphones } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function ValueProps() {
  const { t } = useLanguage();

  const cards = [
    {
      Icon: ShieldCheck,
      color: 'from-green-500 to-teal-600',
      bgLight: 'bg-green-50 text-green-600 border-green-100',
      title: t.valueProps.card1Title,
      desc: t.valueProps.card1Desc,
    },
    {
      Icon: Users,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50 text-green-600 border-green-100',
      title: t.valueProps.card2Title,
      desc: t.valueProps.card2Desc,
    },
    {
      Icon: Search,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50 text-green-600 border-green-100',
      title: t.valueProps.card3Title,
      desc: t.valueProps.card3Desc,
    },
    {
      Icon: Headphones,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50 text-green-600 border-green-100',
      title: t.valueProps.card4Title,
      desc: t.valueProps.card4Desc,
    },
  ];

  return (
    <section className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.valueProps.title}
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            {t.valueProps.subTitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((item, index) => {
            const Icon = item.Icon;
            return (
              <div 
                key={index} 
                className="group relative rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:border-green-400 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 flex flex-col items-start"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${item.bgLight} transition-all duration-300 group-hover:scale-110 mb-6`}>
                  <Icon size={26} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-green-600 transition-colors mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}