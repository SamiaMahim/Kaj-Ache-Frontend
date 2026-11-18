import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Building, Building2, Check, ChevronDown, Cog, IdCard, Mail, Map as MapIcon, MapPin, Pencil, Phone, Trash2, UserRound,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../context/AuthContext';
import {
  deleteMyAccount, fetchAreas, fetchCategories, fetchDistricts, fetchServices, getCurrentAccount, updateTechnicianProfile,
} from '../../services/api';
import SwalMessage from '../ui/SwalMessage';
import { confirmDialog, errorAlert, successToast } from '../../utils/alerts';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

// Outlined field with a label that floats into the border, like the mobile app
function OutlinedField({ icon: Icon, label, value, disabled, children, ...inputProps }) {
  const filled = value !== undefined && value !== null && String(value) !== '';
  const autoId = useId();
  const fieldId = inputProps.id || autoId;
  // Tie the floating <label> to its control so screen readers announce a name
  const control = children
    ? (isValidElement(children) ? cloneElement(children, { id: children.props.id || fieldId }) : children)
    : (
      <input
        {...inputProps}
        id={fieldId}
        value={value}
        disabled={disabled}
        placeholder=" "
        className="peer w-full rounded-xl bg-transparent py-4 pl-12 pr-4 text-base text-slate-900 outline-none disabled:text-slate-500"
      />
    );

  return (
    <div className={`group relative flex items-center rounded-xl border bg-white transition focus-within:border-2 focus-within:border-green-800 ${disabled ? 'border-slate-200' : 'border-slate-300'}`}>
      <Icon size={20} className={`pointer-events-none absolute left-4 ${disabled ? 'text-slate-300' : 'text-slate-500'} group-focus-within:text-green-800`} />
      {control}
      <label
        htmlFor={fieldId}
        className={`pointer-events-none absolute bg-white px-1 transition-all ${
          filled
            ? 'left-4 top-0 -translate-y-1/2 text-xs text-slate-500 group-focus-within:text-green-800'
            : `left-12 top-1/2 -translate-y-1/2 text-base ${disabled ? 'text-slate-300' : 'text-slate-500'} group-focus-within:left-4 group-focus-within:top-0 group-focus-within:text-xs group-focus-within:text-green-800`
        }`}
      >
        {label}
      </label>
    </div>
  );
}

function OutlinedSelect({ icon, label, value, onChange, options, disabled }) {
  return (
    <OutlinedField icon={icon} label={label} value={value} disabled={disabled}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`w-full cursor-pointer appearance-none rounded-xl bg-transparent py-4 pl-12 pr-10 text-base outline-none disabled:cursor-not-allowed ${value ? 'text-slate-900' : 'text-transparent'}`}
      >
        <option value="" disabled hidden />
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">{option.label}</option>
        ))}
      </select>
      <ChevronDown size={18} className={`pointer-events-none absolute right-4 ${disabled ? 'text-slate-300' : 'text-slate-500'}`} />
    </OutlinedField>
  );
}

export default function ProfileEditForm({ role }) {
  const isTechnician = role === 'technician';
  const { lang, t: tr } = useLanguage();
  const { refreshAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  // Schedules deletion in 60 days; the API signs the account out everywhere
  const handleDeleteAccount = async () => {
    const confirmed = await confirmDialog({
      title: tr.auth.deleteAccount,
      text: tr.auth.deleteAccountConfirm,
      confirmText: tr.auth.deleteAccount,
      danger: true,
      icon: 'warning',
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteMyAccount();
      logout();
      successToast(tr.auth.deleteAccountScheduled);
      navigate('/', { replace: true });
    } catch (deleteError) {
      errorAlert('Error', deleteError.message);
    } finally {
      setDeleting(false);
    }
  };
  const bn = lang === 'BN';
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [files, setFiles] = useState({ avatar: null, nidFrontImage: null, nidBackImage: null });
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    fullName: '', phone: '', district: '', area: '', address: '',
    businessName: '', category: '', experience: '', serviceArea: '', serviceIds: [],
  });

  const t = {
    fullName: bn ? 'পুরো নাম' : 'Full Name',
    email: bn ? 'ইমেইল' : 'Email',
    phone: bn ? 'ফোন' : 'Phone',
    district: bn ? 'জেলা' : 'District',
    area: bn ? 'এলাকা' : 'Area',
    address: bn ? 'ঠিকানা' : 'Address',
    businessName: bn ? 'ব্যবসার নাম' : 'Business Name',
    category: bn ? 'সার্ভিস ক্যাটাগরি' : 'Service Category',
    experience: bn ? 'অভিজ্ঞতা' : 'Experience',
    serviceArea: bn ? 'সার্ভিস এলাকা' : 'Service Area',
    services: bn ? 'আপনি যে সার্ভিসগুলো দেন' : 'Services you provide',
    servicesHint: bn ? 'নির্বাচিত সার্ভিসের সাথে মিলে গেলে গ্রাহকের সার্ভিস রিকোয়েস্ট আপনার কাছে আসবে।' : "Customers' service requests will reach you when the selected service matches.",
    nid: bn ? 'এনআইডি ছবি' : 'NID images',
    nidFront: bn ? 'সামনের দিক' : 'Front side',
    nidBack: bn ? 'পেছনের দিক' : 'Back side',
    save: bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes',
    saving: bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...',
    saved: bn ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated successfully',
    loading: bn ? 'লোড হচ্ছে...' : 'Loading profile...',
    missingDistrict: bn ? 'একটি জেলা নির্বাচন করুন' : 'Please select a district',
    missingCategory: bn ? 'একটি সার্ভিস ক্যাটাগরি নির্বাচন করুন' : 'Please select a service category',
    changePhoto: bn ? 'ছবি পরিবর্তন করুন' : 'Change photo',
  };

  const localized = (item) => (bn && item?.nameBn) || item?.name || '';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [account, districtList, categoryList, serviceList] = await Promise.all([
          getCurrentAccount(),
          fetchDistricts(),
          isTechnician ? fetchCategories() : Promise.resolve([]),
          isTechnician ? fetchServices() : Promise.resolve([]),
        ]);
        if (!active) return;
        const profile = account?.profileDetail || {};
        setEmail(account?.email || '');
        setAvatarUrl(profile.avatar || '');
        setDistricts(districtList);
        setCategories(categoryList);
        // Placeholder services (offline fallback) have fake ids; never offer them for saving
        setServices(serviceList.filter((service) => !service.isFallback));
        setForm({
          fullName: profile.fullName || '',
          phone: profile.phoneNumber || profile.phone || '',
          district: profile.district || '',
          area: profile.area || '',
          address: profile.address || '',
          businessName: profile.businessName || '',
          category: profile.category || '',
          experience: profile.experience || '',
          serviceArea: profile.serviceArea || '',
          serviceIds: (profile.serviceIds || []).map((id) => String(id?._id || id)),
        });
        const savedDistrict = districtList.find((d) => d.name === profile.district);
        if (savedDistrict) {
          const areaList = await fetchAreas(savedDistrict._id);
          if (active) setAreas(areaList);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isTechnician]);

  useEffect(() => () => {
    if (avatarUrl.startsWith('blob:')) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleDistrict = async (name) => {
    setForm((current) => ({ ...current, district: name, area: '' }));
    setAreas([]);
    const district = districts.find((d) => d.name === name);
    if (district) setAreas(await fetchAreas(district._id));
  };

  const handleAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFiles((current) => ({ ...current, avatar: file }));
    setAvatarUrl(URL.createObjectURL(file));
  };

  const toggleService = (id) => setForm((current) => ({
    ...current,
    serviceIds: current.serviceIds.includes(id) ? current.serviceIds.filter((item) => item !== id) : [...current.serviceIds, id],
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.district) return setError(t.missingDistrict);
    if (isTechnician && !form.category) return setError(t.missingCategory);

    const fields = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      district: form.district,
      area: form.area,
      avatar: files.avatar,
    };
    if (isTechnician) {
      Object.assign(fields, {
        businessName: form.businessName.trim(),
        category: form.category,
        experience: form.experience.trim(),
        serviceArea: form.serviceArea.trim(),
        serviceIds: form.serviceIds,
        nidFrontImage: files.nidFrontImage,
        nidBackImage: files.nidBackImage,
      });
    }

    setSaving(true);
    try {
      await updateTechnicianProfile(fields);
      setFiles({ avatar: null, nidFrontImage: null, nidBackImage: null });
      setMessage(t.saved);
      refreshAccount();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="px-4 py-16 text-center text-slate-500">{t.loading}</div>;

  const districtOptions = districts.map((d) => ({ value: d.name, label: localized(d) }));
  if (form.district && !districts.some((d) => d.name === form.district)) districtOptions.unshift({ value: form.district, label: form.district });
  const areaOptions = areas.map((a) => ({ value: a.name, label: localized(a) }));
  if (form.area && !areas.some((a) => a.name === form.area)) areaOptions.unshift({ value: form.area, label: form.area });
  const categoryOptions = [...new Set(categories.map((c) => c.name).filter(Boolean))].map((name) => {
    const category = categories.find((c) => c.name === name);
    return { value: name, label: localized(category) };
  });
  if (form.category && !categoryOptions.some((c) => c.value.toLowerCase() === form.category.toLowerCase())) categoryOptions.unshift({ value: form.category, label: form.category });

  return (
    <div className="flex justify-center px-4 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        {/* Avatar */}
        <div className="flex justify-center">
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={t.changePhoto} className="relative">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-green-900/10">
              {avatarUrl ? (
                <img src={resolveImage(avatarUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={48} className="fill-green-800 text-green-800" />
              )}
            </div>
            <span className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-green-800 text-white">
              <Pencil size={16} />
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} className="hidden" />
        </div>

        <SwalMessage message={error} />
        <SwalMessage message={message} type="success" />

        <div className="mt-8 space-y-5">
          <OutlinedField icon={UserRound} label={t.fullName} value={form.fullName} onChange={update('fullName')} required autoComplete="name" />
          <OutlinedField icon={Mail} label={t.email} value={email} disabled readOnly />
          <OutlinedField icon={Phone} label={t.phone} type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
          <OutlinedSelect icon={MapIcon} label={t.district} value={form.district} onChange={handleDistrict} options={districtOptions} />
          <OutlinedSelect
            icon={Building2}
            label={t.area}
            value={form.area}
            onChange={(value) => setForm((current) => ({ ...current, area: value }))}
            options={areaOptions}
            disabled={!form.district}
          />
          <OutlinedField icon={MapPin} label={t.address} value={form.address} onChange={update('address')} autoComplete="street-address" />

          {isTechnician && (
            <>
              <OutlinedField icon={Building} label={t.businessName} value={form.businessName} onChange={update('businessName')} />
              <OutlinedSelect
                icon={Cog}
                label={t.category}
                value={form.category}
                onChange={(value) => setForm((current) => ({ ...current, category: value }))}
                options={categoryOptions}
              />
              <OutlinedField icon={Award} label={t.experience} value={form.experience} onChange={update('experience')} />
              <OutlinedField icon={MapIcon} label={t.serviceArea} value={form.serviceArea} onChange={update('serviceArea')} />
            </>
          )}
        </div>

        {isTechnician && (
          <>
            <div className="mt-8">
              <h2 className="font-bold text-slate-900">{t.services}</h2>
              <p className="mt-1 text-sm text-slate-500">{t.servicesHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((service) => {
                  const id = String(service.id || service._id);
                  const selected = form.serviceIds.includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggleService(id)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${selected ? 'border-green-800 bg-green-800 text-white' : 'border-slate-300 text-slate-700 hover:border-green-700'}`}
                    >
                      {selected && <Check size={14} />}
                      {(bn && service.title?.BN) || service.title?.EN || service.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="flex items-center gap-2 font-bold text-slate-900"><IdCard size={18} /> {t.nid}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[['nidFrontImage', t.nidFront], ['nidBackImage', t.nidBack]].map(([key, label]) => (
                  <label key={key} className="cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-green-700">
                    <span className="font-semibold text-slate-800">{label}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{files[key]?.name || (bn ? 'ছবি নির্বাচন করুন' : 'Choose image')}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] || null }))}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-8 w-full rounded-full bg-green-800 py-4 text-base font-bold text-white transition hover:bg-green-900 disabled:opacity-70"
        >
          {saving ? t.saving : t.save}
        </button>

        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/60 p-4 sm:p-5">
          <h2 className="font-bold text-red-700">{tr.auth.deleteAccount}</h2>
          <p className="mt-1 text-sm text-red-700/80">{tr.auth.deleteAccountHint}</p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-60 sm:w-auto"
          >
            <Trash2 size={16} />
            {tr.auth.deleteAccount}
          </button>
        </div>
      </form>
    </div>
  );
}
