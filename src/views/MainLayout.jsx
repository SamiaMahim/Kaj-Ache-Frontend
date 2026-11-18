import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import SupportChatWidget from '../components/support/SupportChatWidget';
import { trackPageView } from '../services/api';

export default function MainLayout() {
  const { lang } = useLanguage();
  const location = useLocation();
  const path = location.pathname;
  const isDashboard = path.startsWith('/dashboard/');

  useEffect(() => {
    // Short delay so detail views have set their own document.title first;
    // the cleanup also drops the duplicate StrictMode run in development.
    const timer = setTimeout(() => trackPageView(path), 1000);
    return () => clearTimeout(timer);
  }, [path]);

  useEffect(() => {
    // Service and category detail views set their own title from the loaded name
    if (/^\/(services|categories)\/[^/]+/.test(path)) return;

    const bn = lang === 'BN';
    const brand = bn ? 'কাজ আছে' : 'Kaj Ache';
    // [pattern, EN, BN]; first match wins
    const pageTitles = [
      [/^\/$/, 'Home', 'হোম'],
      [/^\/services\/?$/, 'Services', 'সার্ভিস'],
      [/^\/join-technician\/?$/, 'Join as Technician', 'টেকনিশিয়ান হিসেবে যুক্ত হোন'],
      [/^\/join-customer\/?$/, 'Join as Customer', 'গ্রাহক হিসেবে যুক্ত হোন'],
      [/^\/about\/?$/, 'About Us', 'আমাদের সম্পর্কে'],
      [/^\/contact\/?$/, 'Contact Us', 'যোগাযোগ'],
      [/^\/login(\/|$)/, 'Log in', 'লগইন'],
      [/^\/register(\/|$)/, 'Create Account', 'অ্যাকাউন্ট তৈরি করুন'],
      [/^\/dashboard\/customer\/services\/?$/, 'New Service Request', 'নতুন সার্ভিস রিকোয়েস্ট'],
      [/^\/dashboard\/technician\/gigs\/?$/, 'Service Requests', 'সার্ভিস রিকোয়েস্ট'],
      [/^\/dashboard\/[^/]+\/gigs\/[^/]+/, 'Service Request Details', 'সার্ভিস রিকোয়েস্টের বিবরণ'],
      [/^\/dashboard\/[^/]+\/profile\/?$/, 'My Profile', 'আমার প্রোফাইল'],
      [/^\/dashboard\/technician\/portfolio\/?$/, 'Portfolio', 'পোর্টফোলিও'],
      [/^\/dashboard\/[^/]+\/?$/, 'Dashboard', 'ড্যাশবোর্ড'],
    ];

    const match = pageTitles.find(([pattern]) => pattern.test(path));
    document.title = match ? `${brand} | ${bn ? match[2] : match[1]}` : brand;
  }, [lang, path]);

  return (
    <>
      {isDashboard ? <Outlet /> : (
        <div className="app-container">
          <Navbar />
          <main className="content pb-20 md:pb-0">
            <Outlet />
          </main>
          <Footer />
          <MobileBottomNav />
        </div>
      )}
      {/* Floating support chat on every page, dashboards included */}
      <SupportChatWidget />
    </>
  );
}