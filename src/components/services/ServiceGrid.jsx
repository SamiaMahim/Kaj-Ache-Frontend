import { stripHtml } from '../../utils/html';
import ServiceCard from './ServiceCard';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function ServiceGrid({ services, lang, onSelectService, t }) {
  const fallbackTitle = t.servicesPage.defaultTitle;
  const fallbackDescription = t.servicesPage.defaultDescription;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          title={service.title?.[lang] || service.title?.EN || service.title?.BN || fallbackTitle}
          // Description is rich text (HTML) from the admin editor; the card only needs a plain preview
          description={stripHtml(service.description?.[lang] || service.description?.EN || service.description?.BN || '') || fallbackDescription}
          image={resolveImage(service.image)}
          icon={service.icon}
          price={service.basePrice}
          startingFromLabel={t.servicesPage.startingFrom}
          // Offline fallback services have no slug, so there is no details page
          onClick={service.slug ? () => onSelectService(service) : undefined}
        />
      ))}
    </div>
  );
}
