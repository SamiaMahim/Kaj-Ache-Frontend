import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

// Shown instead of the open-jobs list when the API answers 403 (technician not approved yet)
export default function NotApprovedNotice({ message }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
      <ShieldAlert className="mx-auto text-amber-500" size={34} />
      <h2 className="mt-4 text-lg font-black text-amber-900">{t.jobs.notApprovedTitle}</h2>
      <p className="mt-2 text-sm text-amber-800">{t.jobs.notApprovedText}</p>
      {message && <p className="mt-2 text-xs text-amber-700">{message}</p>}
    </div>
  );
}
