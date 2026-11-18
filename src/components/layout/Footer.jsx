import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, MapPin, MessageSquareWarning, Phone, Share2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { fetchSocialMedia } from '../../services/api';
import BrandLogo from '../ui/BrandLogo';
import { safeHref } from '../../utils/safeHref';
import ComplaintModal from '../support/ComplaintModal';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

export default function Footer() {
  const { t } = useLanguage();
  const [socialLinks, setSocialLinks] = useState([]);
  const [complaintOpen, setComplaintOpen] = useState(false);

  useEffect(() => {
    // CMS links: keep only safe URLs (https/http/mailto/tel or internal paths)
    fetchSocialMedia().then((links) => setSocialLinks(
      (links || [])
        .map((link) => ({ ...link, url: safeHref(link?.url) }))
        .filter((link) => link.url),
    ));
  }, []);

  return (
    <footer className="bg-white border-t border-gray-100 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {/* Brand Info */}
        <div>
          <BrandLogo className="h-16 w-auto mb-2" />
          <p className="text-gray-500 text-sm leading-relaxed">
            {t.footer.description}
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4">{t.footer.quickLinks}</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/" className="hover:text-green-600">{t.nav.home}</Link></li>
            <li><Link to="/services" className="hover:text-green-600">{t.nav.services}</Link></li>
            <li><Link to="/join-technician" className="hover:text-green-600">{t.nav.technician}</Link></li>
            <li><Link to="/join-customer" className="hover:text-green-600">{t.nav.customer}</Link></li>
            <li><Link to="/about" className="hover:text-green-600">{t.nav.about}</Link></li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-4">{t.footer.contact}</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>
              <a href="tel:+8801309403219" className="flex items-center gap-2 hover:text-green-600">
                <Phone aria-hidden="true" size={16} className="shrink-0" /> {t.footer.phone}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0" /> {t.footer.location}
            </li>
            <li>
              <a href="https://www.kajache.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-600">
                <Globe aria-hidden="true" size={16} className="shrink-0" /> {t.footer.website}
              </a>
            </li>
            <li>
              <button type="button" onClick={() => setComplaintOpen(true)} className="flex items-center gap-2 hover:text-green-600">
                <MessageSquareWarning aria-hidden="true" size={16} className="shrink-0" /> {t.complaint.link}
              </button>
            </li>
          </ul>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">{t.footer.follow}</h4>
            <div className="flex flex-wrap gap-3 text-xl">
              {socialLinks.map((link) => (
                <a
                  key={link._id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  title={link.name}
                  className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center overflow-hidden hover:bg-green-600 hover:text-white transition"
                >
                  {link.image ? (
                    <img src={resolveImage(link.image)} alt={link.name} className="h-full w-full object-cover" />
                  ) : (
                    <Share2 aria-hidden="true" size={18} />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-6">
        © 2026 Kaj Ache. {t.footer.copyright}
      </div>

      {complaintOpen && <ComplaintModal onClose={() => setComplaintOpen(false)} />}
    </footer>
  );
}
