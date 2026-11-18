import DynamicIcon from '../ui/DynamicIcon';

/**
 * Service card used on the Services page and category pages: 16:10 photo,
 * title, 2-line description and starting price. The whole card is the
 * button; without onClick (offline fallback services) it is inert.
 */
export default function ServiceCard({ title, description, image, icon, price, startingFromLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={title}
      className="group bg-white border border-gray-100 rounded-2xl shadow-sm transition duration-300 flex flex-col justify-between overflow-hidden text-left w-full cursor-pointer hover:shadow-xl hover:border-green-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/30 disabled:cursor-default disabled:hover:shadow-sm disabled:hover:translate-y-0 disabled:hover:border-gray-100"
    >
      <div className="w-full">
        {image ? (
          <div className="aspect-[16/10] overflow-hidden bg-green-50">
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center bg-green-50">
            <DynamicIcon name={icon || 'Wrench'} className="w-10 h-10 text-green-600" />
          </div>
        )}

        <div className="px-6 pt-5">
          <h3 className="text-xl font-bold text-gray-800 mb-2 transition-colors group-hover:text-green-700">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{description}</p>
        </div>
      </div>

      {price > 0 && (
        <div className="px-6 pb-6 text-xs text-gray-400">
          {startingFromLabel}{' '}
          <span className="text-lg font-bold text-green-600">৳{price}</span>
        </div>
      )}
    </button>
  );
}
