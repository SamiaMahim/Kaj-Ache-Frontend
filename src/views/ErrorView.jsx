import { useRouteError, Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export default function ErrorView() {
  const error = useRouteError();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.errors.title}</h1>
      <p className="text-gray-600 mb-6">
        {error?.statusText || error?.message || t.errors.notFound}
      </p>
      <Link 
        to="/" 
        className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition"
      >
        {t.errors.home}
      </Link>
    </div>
  );
}