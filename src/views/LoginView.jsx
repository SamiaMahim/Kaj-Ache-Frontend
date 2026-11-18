import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowRight, 
  BriefcaseBusiness, 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  Mail, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { loginAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { resolveAccountRole } from '../utils/accountRole';
import SwalMessage from '../components/ui/SwalMessage';

export default function LoginView() {
  const { role: routeRole } = useParams();
  const [selectedRole, setSelectedRole] = useState(() => {
    if (routeRole === 'technician' || routeRole === 'customer') return routeRole;
    return 'customer';
  });

  // Follow /login/:role changes by adjusting state during render (no effect needed)
  const [prevRouteRole, setPrevRouteRole] = useState(routeRole);
  if (routeRole !== prevRouteRole) {
    setPrevRouteRole(routeRole);
    if (routeRole === 'technician' || routeRole === 'customer') setSelectedRole(routeRole);
  }

  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = await loginAccount(formData.email.trim(), formData.password, rememberMe);
      
      // Role comes from the backend account; the website only supports customers and technicians
      const userObj = payload.user || {};
      const backendRole = resolveAccountRole(userObj);
      if (!backendRole) {
        setError('This account type can\'t sign in on the website. Please use a customer or technician account.');
        return;
      }

      // Trigger instantaneous global state update via AuthContext
      await login(payload.token, userObj, backendRole, rememberMe);

      setSuccessMessage(`Login successful! Redirecting to ${backendRole} dashboard...`);

      setTimeout(() => {
        navigate(`/dashboard/${backendRole}`, { replace: true });
      }, 350);

    } catch (loginError) {
      setError(loginError.message || t.auth.invalidCredentials || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTechnician = selectedRole === 'technician';

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-slate-50 via-sky-50/20 to-white px-4 py-12 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        
        {/* Card Container */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.auth.loginTitle || 'Welcome back'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Access your KajAche account and dashboard
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="mb-6 p-1.5 bg-slate-100/90 rounded-2xl flex border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setSelectedRole('customer'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                !isTechnician
                  ? 'bg-white text-green-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck size={16} />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('technician'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                isTechnician
                  ? 'bg-white text-green-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BriefcaseBusiness size={16} />
              <span>Technician</span>
            </button>
          </div>

          <SwalMessage message={error} />
          <SwalMessage message={successMessage} type="success" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                {t.auth.email || 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={17} />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isTechnician ? 'technician@example.com' : 'customer@example.com'}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.auth.password || 'Password'}
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-slate-600 sm:text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                {t.auth.rememberMe || 'Remember me'}
              </label>
              <Link
                to="/forgot-password"
                state={{ email: formData.email.trim() }}
                className="text-xs font-bold text-green-600 transition hover:underline sm:text-sm"
              >
                {t.auth.forgotPassword || 'Forgot password?'}
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-bold text-white shadow-lg transition-all duration-200 disabled:opacity-60 active:scale-[0.99] mt-2 ${
                isTechnician
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {isTechnician ? 'Technician' : 'Customer'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs sm:text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link 
                to={isTechnician ? '/join-technician' : '/join-customer'} 
                className={`font-bold transition hover:underline ${
                  isTechnician ? 'text-green-600' : 'text-green-600'
                }`}
              >
                Register as {isTechnician ? 'Technician' : 'Customer'}
              </Link>
            </p>
          </div>

        </div>

        {/* Security Trust Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-green-600" />
          <span>Your details are only used to sign you in</span>
        </div>

      </div>
    </div>
  );
}
