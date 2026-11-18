import { NavLink, Outlet } from 'react-router-dom';
import { BadgeCheck, BriefcaseBusiness, LayoutDashboard, Search, UserRound, Zap } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';

export default function AuthenticatedLayout({ role: routeRole }) {
  const { role: authRole } = useAuth();
  const { t } = useLanguage();

  const role = routeRole || authRole || 'customer';
  const dashboardPath = `/dashboard/${role}`;

  const links = [
    { to: dashboardPath, label: 'Dashboard', icon: LayoutDashboard, end: true },
    {
      to: role === 'technician' ? `${dashboardPath}/gigs` : `${dashboardPath}/services`,
      label: role === 'technician' ? 'Find Service Requests' : 'Post a Service Request',
      icon: role === 'technician' ? BriefcaseBusiness : Search
    },
    { to: `${dashboardPath}/instant`, label: role === 'technician' ? 'Instant Jobs' : 'Instant Service', icon: Zap },
    { to: `${dashboardPath}/recruitment`, label: role === 'technician' ? t.jobs.navRecruitmentTechnician : t.jobs.navRecruitmentCustomer, icon: BadgeCheck },
    { to: `${dashboardPath}/profile`, label: 'Profile', icon: UserRound },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Same header as the public site */}
      <Navbar />

      {/* Main Outlet */}
      <main className="mx-auto max-w-7xl pb-24 md:pb-10">
        <Outlet context={{ role }} />
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg justify-around gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl transition ${
                  isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-500'
                }`
              }
              aria-label={label}
              title={label}
            >
              <Icon size={19} />
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
