import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, UserRound, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { registerAccount } from '../services/api';
import SwalMessage from '../components/ui/SwalMessage';

const PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ icon: Icon, label, error, trailing, ...inputProps }) {
  const autoId = useId();
  const fieldId = inputProps.id || autoId;
  const errorId = `${fieldId}-error`;
  return (
    <div>
      <div className={`group relative flex items-center rounded-xl border bg-white transition focus-within:border-2 ${error ? 'border-red-400 focus-within:border-red-500' : 'border-slate-300 focus-within:border-green-800'}`}>
        <Icon size={20} className="pointer-events-none absolute left-4 text-slate-500 group-focus-within:text-green-800" />
        <input
          {...inputProps}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder=" "
          className="peer w-full rounded-xl bg-transparent py-4 pl-12 pr-12 text-base text-slate-900 outline-none"
        />
        <label htmlFor={fieldId} className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 bg-white px-1 text-base text-slate-500 transition-all peer-focus:left-4 peer-focus:top-0 peer-focus:text-xs peer-focus:text-green-800 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs">
          {label}
        </label>
        {trailing}
      </div>
      {error && <p id={errorId} className="mt-1 pl-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function RegistrationView() {
  const { role: routeRole } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const bn = lang === 'BN';
  // The role comes from the sign-up button the visitor tapped (/register/customer or /register/technician);
  // there's no switch on the form, so a bare /register means customer
  const role = routeRole === 'technician' ? 'technician' : 'customer';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const copy = {
    title: role === 'technician'
      ? (bn ? 'টেকনিশিয়ান অ্যাকাউন্ট তৈরি করুন' : 'Create Technician Account')
      : (bn ? 'গ্রাহক অ্যাকাউন্ট তৈরি করুন' : 'Create Customer Account'),
    subtitle: role === 'technician'
      ? (bn ? 'রেজিস্টার করে আপনার এলাকার কাজের সুযোগ পান' : 'Register to find jobs near you')
      : (bn ? 'রেজিস্টার করে যাচাইকৃত টেকনিশিয়ান বুক করুন' : 'Register to book verified technicians'),
    name: bn ? 'পুরো নাম' : 'Full Name',
    email: bn ? 'ইমেইল' : 'Email',
    phone: bn ? 'ফোন' : 'Phone',
    password: bn ? 'পাসওয়ার্ড' : 'Password',
    confirm: bn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password',
    signUp: bn ? 'সাইন আপ' : 'Sign up',
    signingUp: bn ? 'সাইন আপ হচ্ছে...' : 'Signing up...',
    haveAccount: bn ? 'আগে থেকেই অ্যাকাউন্ট আছে?' : 'Already have an account?',
    login: bn ? 'লগইন' : 'Login',
    success: bn ? 'রেজিস্ট্রেশন সফল হয়েছে!' : 'Registration successful!',
    successBody: bn ? 'এখন আপনার অ্যাকাউন্টে লগইন করুন।' : 'You can now log in to your account.',
  };

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    const required = bn ? 'এই ঘরটি পূরণ করুন' : 'This field is required';
    if (!form.name.trim()) next.name = required;
    if (!form.email.trim()) next.email = required;
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email';
    if (!form.phone.trim()) next.phone = required;
    else if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, ''))) next.phone = bn ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন' : 'Enter a valid Bangladesh mobile number';
    if (!form.password) next.password = required;
    else if (form.password.length < 6) next.password = bn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters';
    if (form.confirmPassword !== form.password) next.confirmPassword = bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await registerAccount({
        role,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/[\s-]/g, ''),
        password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const eyeButton = (visible, toggle) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="absolute right-3 flex h-9 w-9 items-center justify-center text-slate-500 hover:text-green-800"
    >
      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-800 text-white"><Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" /></div>
          <h1 className="text-3xl font-bold text-slate-900">{copy.success}</h1>
          <p className="mt-3 text-slate-500">{copy.successBody}</p>
          <button
            type="button"
            onClick={() => navigate(`/login/${role}`)}
            className="mt-8 w-full rounded-xl bg-green-800 py-4 font-bold text-white transition hover:bg-green-900"
          >
            {copy.login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-white px-4 py-12 sm:py-16">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-slate-500">{copy.subtitle}</p>

        <SwalMessage message={serverError} />

        <div className="mt-6 space-y-5">
          <Field icon={UserRound} label={copy.name} value={form.name} onChange={update('name')} error={errors.name} autoComplete="name" />
          <Field icon={Mail} label={copy.email} type="email" value={form.email} onChange={update('email')} error={errors.email} autoComplete="email" />
          <Field icon={Phone} label={copy.phone} type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} autoComplete="tel" />
          <Field
            icon={Lock}
            label={copy.password}
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            autoComplete="new-password"
            trailing={eyeButton(showPassword, () => setShowPassword((v) => !v))}
          />
          <Field
            icon={Lock}
            label={copy.confirm}
            type={showConfirm ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
            trailing={eyeButton(showConfirm, () => setShowConfirm((v) => !v))}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 w-full rounded-xl bg-green-800 py-4 text-lg font-bold text-white transition hover:bg-green-900 disabled:opacity-70"
        >
          {submitting ? copy.signingUp : copy.signUp}
        </button>

        <p className="mt-8 text-center text-slate-500">
          {copy.haveAccount}{' '}
          <Link to={`/login/${role}`} className="ml-2 font-bold text-green-800 hover:underline">{copy.login}</Link>
        </p>
      </form>
    </div>
  );
}
