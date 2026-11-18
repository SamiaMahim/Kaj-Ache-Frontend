import { Download } from 'lucide-react';
import { appLinks } from '../../config/appLinks';

export default function AppDownloadButton({ label }) {
  return (
    <a
      href={appLinks.mobileApp}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-5 py-3 text-sm font-semibold text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:shadow-md"
    >
      <Download aria-hidden="true" size={18} strokeWidth={2} />
      <span>{label}</span>
    </a>
  );
}
