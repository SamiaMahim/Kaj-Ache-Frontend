import { useLanguage } from '../../hooks/useLanguage';

// "Load more" under a paginated list; renders nothing once everything is loaded
export default function LoadMoreButton({ list }) {
  const { t } = useLanguage();
  if (!list.hasMore) return null;
  return (
    <div className="mt-5 text-center">
      <button type="button" onClick={list.loadMore} disabled={list.loadingMore} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-green-500 hover:text-green-700 disabled:opacity-60">
        {list.loadingMore ? t.jobs.loading : t.jobs.loadMore}
      </button>
    </div>
  );
}
