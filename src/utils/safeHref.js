// CMS-supplied links: allow only web, mail and phone links, or internal paths.
// Anything else (javascript:, data:, protocol-relative //host, ...) is dropped.
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export const safeHref = (value) => {
  if (typeof value !== 'string') return '';
  const href = value.trim();
  if (!href) return '';
  if (href.startsWith('/')) return href.startsWith('//') || href.startsWith('/\\') ? '' : href;
  try {
    const url = new URL(href);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? href : '';
  } catch {
    return '';
  }
};

export const isExternalHref = (href) => /^https?:/i.test(href);
