import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, FileText, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { createPortfolio, deletePortfolio, fetchPortfolios } from '../services/api';
import { confirmDialog, successToast } from '../utils/alerts';
import SwalMessage from '../components/ui/SwalMessage';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

function AddWorkModal({ open, onClose, onAdded, copy, technicianId, technicianName }) {
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const reset = () => {
    setImage(null);
    setPreview('');
    setDetails('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!image) return setError(copy.needImage);
    if (details.trim().length < 5) return setError(copy.needDetails);
    setSaving(true);
    try {
      const created = await createPortfolio({ technicianId, technicianName, serviceDetails: details.trim(), image });
      onAdded(created);
      reset();
      onClose();
      successToast(copy.added);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-work-title"
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl motion-safe:animate-[hiw-rise_.3s_ease-out] sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 id="add-work-title" className="text-2xl font-bold text-slate-900">{copy.addTitle}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label={copy.close} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={22} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-6 flex aspect-[2/1] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-300 text-slate-700 transition hover:border-green-700"
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus size={44} className="text-green-800" />
              <span className="text-sm">{copy.pickImage}</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} className="hidden" />

        <label className="mt-5 flex gap-3 rounded-xl border border-slate-300 px-4 py-3 focus-within:border-2 focus-within:border-green-800">
          <FileText size={20} className="mt-8 shrink-0 text-slate-500" />
          <textarea
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={2000}
            placeholder={copy.details}
            className="w-full resize-none bg-transparent pt-1 text-base text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>

        <SwalMessage message={error} />

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-green-800 py-4 text-base font-bold text-white transition hover:bg-green-900 disabled:opacity-70"
        >
          <ImagePlus size={20} />
          {saving ? copy.adding : copy.addWork}
        </button>
      </form>
    </div>
  );
}

export default function TechnicianPortfolioView() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const bn = lang === 'BN';
  const technicianId = user?._id || user?.id || user?.profileDetail?.userId;
  const technicianName = user?.profileDetail?.fullName || user?.name || user?.username || 'Technician';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const copy = {
    title: bn ? 'আমার পোর্টফোলিও' : 'My Portfolio',
    subtitle: bn ? 'আপনার আগের কাজ দেখিয়ে গ্রাহকের আস্থা অর্জন করুন' : 'Show your past work to build customer trust',
    add: bn ? 'কাজ যোগ করুন' : 'Add work',
    empty: bn ? 'এখনো কোনো পোর্টফোলিও কাজ নেই' : 'No portfolio work yet',
    emptyHint: bn ? 'আপনার করা কাজের ছবি ও বিবরণ যোগ করুন' : 'Add photos and details of work you have done',
    addTitle: bn ? 'পোর্টফোলিও কাজ যোগ করুন' : 'Add portfolio work',
    pickImage: bn ? 'একটি ছবি নির্বাচন করতে ট্যাপ করুন' : 'Tap to select an image',
    details: bn ? 'সার্ভিসের বিবরণ' : 'Service details',
    addWork: bn ? 'কাজ যোগ করুন' : 'Add work',
    adding: bn ? 'যোগ হচ্ছে...' : 'Adding...',
    added: bn ? 'কাজ যোগ হয়েছে' : 'Work added to portfolio',
    deleted: bn ? 'কাজ মুছে ফেলা হয়েছে' : 'Work removed',
    close: bn ? 'বন্ধ করুন' : 'Close',
    needImage: bn ? 'একটি ছবি নির্বাচন করুন' : 'Please select an image',
    needDetails: bn ? 'বিবরণ কমপক্ষে ৫ অক্ষরের হতে হবে' : 'Service details must be at least 5 characters',
    confirmDelete: bn ? 'এই কাজটি মুছে ফেলবেন?' : 'Remove this work?',
    confirmDeleteText: bn ? 'এটি আর পোর্টফোলিওতে দেখা যাবে না।' : 'It will no longer appear in your portfolio.',
    yesDelete: bn ? 'হ্যাঁ, মুছুন' : 'Yes, remove',
    cancel: bn ? 'বাতিল' : 'Cancel',
    remove: bn ? 'মুছুন' : 'Remove',
  };

  useEffect(() => {
    if (!technicianId) return undefined;
    let active = true;
    fetchPortfolios(technicianId)
      .then((data) => { if (active) setItems(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [technicianId]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleDelete = async (item) => {
    const confirmed = await confirmDialog({
      title: copy.confirmDelete,
      text: copy.confirmDeleteText,
      confirmText: copy.yesDelete,
      cancelText: copy.cancel,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deletePortfolio(item._id);
      setItems((current) => current.filter((entry) => entry._id !== item._id));
      successToast(copy.deleted);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        {items.length > 0 && (
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-800 px-5 py-3 text-sm font-bold text-white hover:bg-green-900">
            <Plus size={18} /> {copy.add}
          </button>
        )}
      </div>

      <SwalMessage message={error} />

      {loading && technicianId ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((n) => <div key={n} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <BriefcaseBusiness size={64} className="text-green-800" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">{copy.empty}</h2>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyHint}</p>
          <button type="button" onClick={() => setModalOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-800 px-6 py-3.5 text-sm font-bold text-white hover:bg-green-900">
            <ImagePlus size={18} /> {copy.addWork}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={resolveImage(item.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  aria-label={copy.remove}
                  title={copy.remove}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-md transition hover:bg-rose-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="p-4">
                <p className="line-clamp-3 text-sm leading-6 text-slate-700">{item.servicedetails}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddWorkModal
        open={modalOpen}
        onClose={closeModal}
        onAdded={(created) => setItems((current) => [created, ...current])}
        copy={copy}
        technicianId={technicianId}
        technicianName={technicianName}
      />
    </div>
  );
}
