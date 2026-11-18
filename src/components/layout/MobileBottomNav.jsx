import { NavLink, useNavigate } from 'react-router-dom';
import { House, LayoutDashboard, LogIn, LogOut, UserPlus, Wrench } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { role, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const links = isAuthenticated
    ? [
        { to: '/', label: t.nav?.home || 'Home', icon: House, end: true },
        { to: '/services', label: t.nav?.services || 'Services', icon: Wrench },
        { to: `/dashboard/${role}`, label: t.auth?.dashboard || 'Dashboard', icon: LayoutDashboard },
      ]
    : [
        { to: '/', label: t.nav?.home || 'Home', icon: House, end: true },
        { to: '/services', label: t.nav?.services || 'Services', icon: Wrench },
        { to: '/login', label: t.auth?.login || 'Log in', icon: LogIn },
        { to: '/join-customer', label: 'Sign up', icon: UserPlus },
      ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            title={label}
            className={({ isActive }) => 
              `flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl transition ${
                isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`
            }
          >
            <Icon aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">{label}</span>
          </NavLink>
        ))}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t.auth?.logout || 'Log out'}
            title={t.auth?.logout || 'Log out'}
            className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">{t.auth?.logout || 'Log out'}</span>
          </button>
        )}
      </div>
    </nav>
  );
}