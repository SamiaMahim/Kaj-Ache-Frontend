import DOMPurify from 'dompurify';

// Links in CMS rich text open in a new tab without access to this window
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitizeHtml = (html = '') => DOMPurify.sanitize(html);

export const stripHtml = (html = '') => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};
