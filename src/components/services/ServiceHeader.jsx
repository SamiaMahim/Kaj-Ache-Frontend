export default function ServiceHeader({ title, subtitle }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-12">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
        {title}
      </h1>
      <p className="text-gray-600 text-lg">{subtitle}</p>
    </div>
  );
}
