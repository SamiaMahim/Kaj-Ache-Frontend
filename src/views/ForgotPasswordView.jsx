import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { requestPasswordReset, resetPassword } from '../services/api';
import { errorAlert, successToast } from '../utils/alerts';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600';
const iconClass = 'absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400';

// Two steps: request a code by email, then enter it with the new password
export default function ForgotPasswordView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (event) => {
    event?.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setStep('reset');
      successToast(t.auth.codeSent);
    } catch (error) {
      errorAlert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      errorAlert('Error', t.auth.passwordsDoNotMatch);
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email.trim(), code.trim(), password);
      successToast(t.auth.resetSuccess);
      navigate('/login', { replace: true });
    } catch (error) {
      errorAlert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitButton = (label) => (
    <button
      type="submit"
      disabled={submitting}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all duration-200 hover:bg-green-700 active:scale-[0.99] disabled:opacity-60"
    >
      {submitting && <Loader2 size={18} className="animate-spin" />}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-slate-50 via-sky-50/20 to-white px-4 py-12 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex rounded-2xl bg-green-50 p-3 text-green-600">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.auth.resetTitle}</h1>
            <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
              {step === 'email' ? t.auth.resetEmailHint : `${t.auth.resetCodeHint} ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className={labelClass}>{t.auth.email}</label>
                <div className="relative">
                  <div className={iconClass}><Mail size={17} /></div>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
              </div>
              {submitButton(t.auth.sendCode)}
            </form>
          ) : (
            <form onSubmit={submitReset} className="space-y-4">
              <div>
                <label htmlFor="reset-code" className={labelClass}>{t.auth.resetCode}</label>
                <div className="relative">
                  <div className={iconClass}><KeyRound size={17} /></div>
                  <input
                    id="reset-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="\d{6}"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className={`${inputClass} tracking-widest`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="reset-password" className={labelClass}>{t.auth.newPassword}</label>
                <div className="relative">
                  <div className={iconClass}><Lock size={17} /></div>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirm" className={labelClass}>{t.auth.confirmPassword}</label>
                <div className="relative">
                  <div className={iconClass}><Lock size={17} /></div>
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>
              </div>
              {submitButton(t.auth.resetPasswordButton)}
              <button
                type="button"
                disabled={submitting}
                onClick={() => sendCode()}
                className="w-full text-xs font-bold text-green-600 transition hover:underline disabled:opacity-60 sm:text-sm"
              >
                {t.auth.resendCode}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
