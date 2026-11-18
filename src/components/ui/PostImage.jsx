const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (/^(https?:|blob:)/i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

// Post image, or the given lucide icon on a neutral tile when no image was uploaded
export default function PostImage({ image, icon: Icon, iconSize = 20, className = '' }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-slate-100 text-slate-400 ${className}`}>
      {image ? <img src={resolveImage(image)} alt="" className="h-full w-full object-cover" /> : <Icon size={iconSize} aria-hidden="true" />}
    </div>
  );
}
