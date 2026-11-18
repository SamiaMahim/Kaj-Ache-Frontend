import { useEffect, useState } from 'react';
import { translations } from '../locales';
import { fetchLandingContent } from '../services/api';
import { LanguageContext } from './languageContextObject';

const mergeValues = (base, override) => {
  if (Array.isArray(override)) return override;
  if (!override || typeof override !== 'object') return override ?? base;
  if (!base || typeof base !== 'object' || Array.isArray(base)) return override;

  return Object.keys({ ...base, ...override }).reduce((result, key) => {
    result[key] = mergeValues(base[key], override[key]);
    return result;
  }, {});
};

const LANGUAGE_STORAGE_KEY = 'kajacheLang';
const SUPPORTED_LANGS = ['BN', 'EN'];

const readStoredLang = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(stored) ? stored : 'BN';
  } catch {
    return 'BN';
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang);
  const [cmsContent, setCmsContent] = useState(null);

  // Persist the choice and keep <html lang> in sync for screen readers and search engines
  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Storage unavailable (private mode); the choice just won't persist
    }
    document.documentElement.lang = lang === 'BN' ? 'bn' : 'en';
  }, [lang]);

  useEffect(() => {
    fetchLandingContent().then((value) => setCmsContent(value && typeof value === 'object' ? value : null));
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'EN' ? 'BN' : 'EN'));
  };

  const base = translations[lang] || translations.EN;
  const localized = (value, fallback) => value?.[lang] || value?.EN || fallback;
  const cmsHero = cmsContent?.hero || {};
  const cmsValueProps = cmsContent?.valueProps || {};
  const cmsFooter = cmsContent?.footer || {};
  const sectionOverrides = cmsContent?.sections?.[lang] || {};
  // FAQ comes from its own endpoint, so drop any CMS faq override
  const landingSectionOverrides = { ...sectionOverrides };
  delete landingSectionOverrides.faq;
  const statuses = cmsContent?.pageStatuses || {};
  const published = (page) => statuses[page] !== 'draft';
  const visibleOverrides = {
    ...landingSectionOverrides,
    ...(published('home') ? {} : { howItWorks: base.howItWorks }),
    pages: {
      ...landingSectionOverrides.pages,
      ...(published('about') ? {} : { about: base.pages.about }),
      ...(published('contact') ? {} : { contact: base.pages.contact }),
    },
    ...(published('technician') ? {} : { technicianPage: base.technicianPage }),
    ...(published('customer') ? {} : { customerPage: base.customerPage }),
  };
  const t = cmsContent
    ? mergeValues(
        mergeValues(base, visibleOverrides),
        {
          hero: { title: localized(cmsHero.title, base.hero.title), desc: localized(cmsHero.description, base.hero.desc), btnTech: localized(cmsHero.technicianCta, base.hero.btnTech), btnCust: localized(cmsHero.customerCta, base.hero.btnCust) },
          valueProps: { title: localized(cmsValueProps.title, base.valueProps.title), subTitle: localized(cmsValueProps.subtitle, base.valueProps.subTitle) },
          footer: { description: localized(cmsFooter.description, base.footer.description), phone: cmsFooter.phone || base.footer.phone, email: cmsFooter.email || base.footer.email, website: cmsFooter.website || base.footer.website, location: localized(cmsFooter.location, base.footer.location) },
        },
      )
    : base;

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}