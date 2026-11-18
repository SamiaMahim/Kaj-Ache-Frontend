import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseBusiness,
  LayoutDashboard,
  Languages,
  LogOut,
  LogIn,
  Menu,
  UserRound,
  UserPlus,
  Wallet,
  Wrench,
  X
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import BrandLogo from '../ui/BrandLogo';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { user, role, walletBalance, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus after navigating
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const dashboardPath = role === 'technician'
    ? '/dashboard/technician'
    : '/dashboard/customer';

  const accountLinks = [
    { to: dashboardPath, label: t.auth.dashboard || 'Dashboard', icon: LayoutDashboard },
    { to: `${dashboardPath}/profile`, label: lang === 'BN' ? 'প্রোফাইল' : 'Profile', icon: UserRound },
    ...(role === 'technician'
      ? [
          { to: `${dashboardPath}/portfolio`, label: lang === 'BN' ? 'পোর্টফোলিও' : 'Portfolio', icon: BriefcaseBusiness },
          { to: `${dashboardPath}/recruitment`, label: t.jobs.navRecruitmentTechnician, icon: BadgeCheck },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/services', label: t.nav.services },
    { to: '/about', label: t.nav.about },
    { to: '/contact', label: t.nav.contact },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent shadow-none'
      }`}
    >
      <div className="flex h-18 md:h-20 lg:h-22 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* Brand Logo */}
        <Link to="/" className="shrink-0 transition-transform hover:scale-[1.02]">
          <BrandLogo className="h-11 w-auto md:h-14 lg:h-16" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 font-semibold text-sm text-slate-600">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2 transition-all ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {!isAuthenticated && (
            <>
              <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" />
              <NavLink
                to="/join-customer"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-green-200 text-green-700 hover:border-green-400 hover:bg-green-50'
                  }`
                }
              >
                <UserRound size={14} />
                {t.nav.customer}
              </NavLink>
              <NavLink
                to="/join-technician"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`
                }
              >
                <Wrench size={14} />
                {t.nav.technician}
              </NavLink>
            </>
          )}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Change language"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-green-50 hover:text-green-700"
          >
            <Languages size={14} className="text-green-600" />
            <span>{lang === 'EN' ? 'বাংলা' : 'EN'}</span>
          </button>

          {isAuthenticated ? (
            /* Logged In User State */
            <div className="flex items-center gap-2 sm:gap-3">
              {role === 'customer' && (
                <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50/80 px-3 py-1.5 text-xs font-bold text-green-800">
                  <Wallet size={14} className="text-green-600" />
                  <span>৳{walletBalance}</span>
                </div>
              )}

              {/* Goes straight to the dashboard; Profile and the rest live there and in the mobile menu */}
              <Link
                to={dashboardPath}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 transition hover:border-green-300 hover:bg-green-50"
              >
                <UserRound size={16} className="text-green-600" />
                <span className="max-w-32 truncate">{user?.name?.split(' ')[0] || 'Account'}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                aria-label={t.auth.logout}
                title={t.auth.logout}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            /* Visitor State (Not Logged In) */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-green-500 hover:bg-green-50/50 hover:text-green-600 shadow-2xs"
              >
                <LogIn size={14} className="text-green-600" />
                <span>{t.auth.login}</span>
              </Link>

              <Link
                to="/join-customer"
                className="hidden sm:flex items-center gap-1.5 rounded-md bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-green-600/20 transition hover:bg-green-700 hover:shadow-md hover:-translate-y-0.5"
              >
                <UserPlus size={14} />
                <span>Sign Up</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl lg:hidden">
          <nav className="grid gap-1.5">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-green-50 text-green-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <span>{label}</span>
              </NavLink>
            ))}

            {isAuthenticated ? (
              <>
                <div className="mt-2 border-t border-slate-100 pt-2" />
                {accountLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        isActive ? 'bg-green-50 text-green-700' : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                  <span>{t.auth.logout}</span>
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <Link
                  to="/join-customer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-green-200 py-2.5 text-xs font-bold text-green-700"
                >
                  <UserRound size={15} />
                  <span>{t.nav.customer}</span>
                </Link>
                <Link
                  to="/join-technician"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700"
                >
                  <Wrench size={15} />
                  <span>{t.nav.technician}</span>
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-800"
                >
                  <LogIn size={15} />
                  <span>{t.auth.login}</span>
                </Link>
                <Link
                  to="/join-customer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white shadow-xs"
                >
                  <UserPlus size={15} />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}