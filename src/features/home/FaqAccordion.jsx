import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import HtmlContent from '../../components/content/HtmlContent';
import { stripHtml } from '../../utils/html';

export default function FaqAccordion({ faqs }) {
  const { lang, t } = useLanguage();
  const [openIdx, setOpenIdx] = useState(0);
  
  // Only FAQs managed in the admin panel; no built-in fallback questions
  const items = (faqs || [])
    .filter((faq) => faq.status !== 'inactive')
    .map((faq) => ({
      q: lang === 'BN' ? (faq.quesBn || faq.ques) : faq.ques,
      a: lang === 'BN' ? (faq.ansBn || faq.ans) : faq.ans,
    }))
    .filter((faq) => faq.q && stripHtml(faq.a));

  const toggleFaq = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  // Nothing published (or the API is down): leave the section out entirely
  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-slate-50 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.faq?.title || 'Frequently Asked Questions'}
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            {t.faq?.subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {items.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'border-green-500/80 bg-white shadow-md shadow-green-500/5' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 font-bold text-slate-900 flex justify-between items-center gap-4 transition"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <span className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                    isOpen ? 'bg-green-50 text-green-600' : 'text-slate-400'
                  }`}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-slate-600 text-sm border-t border-slate-100 pt-3 leading-relaxed">
                    {/* Answers are rich text (HTML) from the dashboard editor */}
                    <HtmlContent html={faq.a} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}