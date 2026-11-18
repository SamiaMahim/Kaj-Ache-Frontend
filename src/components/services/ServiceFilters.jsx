import { Search } from 'lucide-react';
export default function ServiceFilters({
  categories,
  categoryNameMap = {},
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  t,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
      <div className="relative w-full md:w-96">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.servicesPage.searchPlaceholder}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        {categories.map((cat) => {
          const label = cat === 'all'
            ? t.servicesPage.allCategories
            : categoryNameMap[cat] || t.servicesPage.categories?.[cat] || cat;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
