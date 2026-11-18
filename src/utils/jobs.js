// Shared helpers for the instant-service and recruitment views

// ৳ with thousands separators (same grouping as the homepage cards)
export const formatTaka = (value) => `৳${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// Fills {name} placeholders in a translated string
export const fmt = (template = '', vars = {}) => String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));

// Translated enum label, falling back to the raw value
export const enumLabel = (labels, value) => labels?.[value] || String(value || '').replace(/_/g, ' ');

export const INSTANT_STATUS_STYLES = {
  bidding_open: 'bg-sky-50 text-sky-700',
  bid_selected: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-violet-50 text-violet-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

export const PAYMENT_STATUS_STYLES = {
  unpaid: 'bg-slate-100 text-slate-600',
  paid: 'bg-green-50 text-green-700',
  refund_pending: 'bg-amber-50 text-amber-700',
  refunded: 'bg-sky-50 text-sky-700',
  forfeited: 'bg-rose-50 text-rose-700',
};

export const BID_STATUS_STYLES = {
  active: 'bg-sky-50 text-sky-700',
  selected: 'bg-green-50 text-green-700',
  rejected: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-700',
};

// Exact address when the API shares it (owner / selected technician), otherwise the general area
export const placeText = (location) => location?.address || [location?.area, location?.city, location?.district].filter(Boolean).join(', ');

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Plain textarea text -> paragraphs and line breaks, so HtmlContent keeps the customer's layout
export const textToHtml = (text = '') => text
  .trim()
  .split(/\n{2,}/)
  .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
  .join('');
