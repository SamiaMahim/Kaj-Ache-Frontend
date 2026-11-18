export default function BrandLogo({ className = '' }) {
  const hasSize = /\b[hw]-/.test(className);

  return (
    <img
      src="/logo.png"
      alt="Kaj Ache"
      className={`${hasSize ? '' : 'h-10 w-auto'} select-none object-contain ${className}`}
    />
  );
}
