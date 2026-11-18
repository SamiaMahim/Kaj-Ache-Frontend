import { sanitizeHtml } from '../../utils/html';

// Renders rich text HTML saved from the admin dashboard editor (tiptap)
export default function HtmlContent({ html = '', className = '' }) {
  if (!html) return null;
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
