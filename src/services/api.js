import { DEFAULT_SERVICES } from './servicesData';

// Backend origin. Empty in dev, where Vite proxies /api; set it at build time so the deployed app calls the API directly.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Offline fallback list: ids are placeholders (1, 2, ...) and there are no slugs, so
// callers must not link to or submit these. `isFallback` lets them check.
const FALLBACK_SERVICES = DEFAULT_SERVICES.map((service) => ({ ...service, slug: '', isFallback: true }));

/** Fired when the backend rejects the stored token; AuthContext logs out. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// A 401 on an authenticated call means the session is gone: clear it so
// AuthContext and ProtectedRoute send the user back to login.
const handleUnauthorized = (response) => {
  if (response.status !== 401 || !localStorage.getItem('token')) return;
  localStorage.removeItem('token');
  localStorage.removeItem('kajacheAuth');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

const readJsonResponse = async (response) => {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The server returned an invalid response. Please try again.');
  }
};

const toText = (value, fallback = '') => {
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.length) return toText(value[0], fallback);
  if (value && typeof value === 'object') {
    return (
      value.EN ??
      value.en ??
      value.BN ??
      value.bn ??
      value.title ??
      value.name ??
      Object.values(value)[0] ??
      fallback
    );
  }
  return fallback;
};

const normalizeLocalizedText = (value, fallback = '') => {
  const fallbackText = toText(fallback, 'Service');

  return {
    EN: toText(value?.EN ?? value?.en ?? value, fallbackText),
    BN: toText(value?.BN ?? value?.bn ?? value, fallbackText),
  };
};

const normalizeLocalizedList = (value, fallback = []) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return [
      ...(Array.isArray(value.EN) ? value.EN : value.en ? value.en : []),
      ...(Array.isArray(value.BN) ? value.BN : value.bn ? value.bn : []),
    ].filter(Boolean);
  }

  return Array.isArray(fallback) ? fallback : [];
};

const normalizeIconName = (icon) => {
  if (!icon || typeof icon !== 'string') return 'Wrench';

  const iconMap = {
    '🔧': 'Wrench',
    '⚡': 'Zap',
    '❄️': 'Snowflake',
    '🎨': 'Paintbrush',
    wrench: 'Wrench',
    zap: 'Zap',
    snowflake: 'Snowflake',
    paintbrush: 'Paintbrush',
    paint: 'Paintbrush',
    ac: 'Snowflake',
    electrical: 'Zap',
    plumbing: 'Wrench',
  };

  return iconMap[icon.toLowerCase()] || icon;
};

const normalizeService = (service, index) => {
  const title = normalizeLocalizedText(service?.title ?? service?.name ?? `Service ${index + 1}`, 'Service');
  const description = normalizeLocalizedText(
    service?.description ?? service?.summary ?? service?.shortDescription ?? title,
    'Professional service support.'
  );
  // API stores Bangla in separate fields
  if (service?.titleBn) title.BN = service.titleBn;
  if (service?.descriptionBn) description.BN = service.descriptionBn;
  const features = {
    EN: normalizeLocalizedList(service?.features?.EN ?? service?.features?.en ?? service?.features ?? service?.featureList, []),
    BN: normalizeLocalizedList(service?.features?.BN ?? service?.features?.bn ?? service?.features ?? service?.featureList, []),
  };

  return {
    id: service?.id ?? service?._id ?? index + 1,
    // Only a real slug: the backend won't match a name or a made-up `service-N`
    slug: service?.slug || '',
    category: service?.category ?? 'repair',
    icon: normalizeIconName(service?.icon ?? service?.iconName),
    price: service?.price ?? service?.startingPrice ?? '৳ 999',
    image: service?.image ?? '',
    basePrice: service?.basePrice,
    bookingFee: service?.bookingFee,
    bidPlacementFee: service?.bidPlacementFee,
    title,
    description,
    features,
  };
};

export const fetchServices = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/service`);
    if (!response.ok) throw new Error('API fetch failed');

    const payload = await readJsonResponse(response);
    const rawServices = Array.isArray(payload) ? payload : payload?.data ?? payload?.services ?? [];

    return rawServices.length > 0 ? rawServices.map(normalizeService) : FALLBACK_SERVICES;
  } catch (error) {
    console.warn('Backend unavailable. Serving default fallback data.', error);
    return FALLBACK_SERVICES;
  }
};

export const fetchFaqs = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/faq`);
    if (!response.ok) throw new Error('FAQ fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch (error) {
    console.warn('FAQ content unavailable. Serving translated defaults.', error);
    return null;
  }
};

export const fetchLandingContent = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/landing-content/public`);
    if (!response.ok) throw new Error('Landing content fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? null;
  } catch (error) {
    console.warn('CMS content unavailable. Serving translated defaults.', error);
    return null;
  }
};

export const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/category`);
    if (!response.ok) throw new Error('Category fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch (error) {
    console.warn('Category list unavailable.', error);
    return [];
  }
};

export const fetchSocialMedia = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/socialMedia`);
    if (!response.ok) throw new Error('Social media fetch failed');
    const payload = await readJsonResponse(response);
    const items = payload?.data ?? [];
    return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.warn('Social media links unavailable.', error);
    return [];
  }
};

export const fetchBanners = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/banner`);
    if (!response.ok) throw new Error('Banner fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch {
    return [];
  }
};

export const registerAccount = async ({ role, name, email, phone, password, ...profileData }) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      username: `${email.split('@')[0]}-${Date.now()}`,
      password,
      roleTitle: role,
      profileData: { ...profileData, fullName: name, phoneNumber: phone },
    }),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Registration failed');
  return payload;
};

export const loginAccount = async (email, password, rememberMe = false) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe }),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Login failed');
  return payload;
};

const postAuth = async (path, body, fallbackMessage) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || fallbackMessage);
  return payload;
};

// Emails a 6-digit reset code (the API answers the same for unknown emails)
export const requestPasswordReset = (email) =>
  postAuth('forgot-password', { email }, 'Could not send the reset code');

export const resetPassword = (email, code, newPassword) =>
  postAuth('reset-password', { email, code, newPassword }, 'Could not reset the password');

// Schedules deletion in 60 days; the API signs the account out everywhere
export const deleteMyAccount = async () => {
  const response = await fetch(`${API_BASE}/api/v1/profile/delete`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Could not delete the account');
  return payload;
};

export const getCurrentAccount = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const response = await fetch(`${API_BASE}/api/v1/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Account refresh failed');
  return payload?.data ?? null;
};

export const createGig = async ({ title, description, service, photos, schedule, address, district, coordinates, isDraft, paymentMethod, transactionId }) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('details', description);
  formData.append('service', service);
  formData.append('schedule', JSON.stringify(schedule));
  // city is filled in by the backend (defaults to Dhaka)
  formData.append('location', JSON.stringify({
    address,
    ...(district ? { district } : {}),
    ...(coordinates ? { coordinates } : {}),
  }));
  if (isDraft !== undefined) formData.append('isDraft', String(isDraft));
  if (paymentMethod) formData.append('paymentMethod', paymentMethod);
  if (transactionId) formData.append('transactionId', transactionId);
  photos.forEach((photo) => formData.append('photos', photo));

  const response = await fetch(`${API_BASE}/api/v1/booking`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Service request could not be posted');
  return payload?.data;
};

export const payGigSystemFee = (gigId, { paymentMethod, transactionId } = {}) =>
  authenticatedRequest(`/booking/${gigId}/pay-system-fee`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod, transactionId }),
  });

export const updateTechnicianProfile = async (fields) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value instanceof File) formData.append(key, value);
    else if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
    else if (value !== undefined && value !== null) formData.append(key, String(value));
  });

  const response = await fetch(`${API_BASE}/api/v1/profile/update`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Profile could not be updated');
  return payload?.data;
};

const authenticatedRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw Object.assign(new Error(payload?.message || 'Request failed'), { status: response.status });
  return payload?.data ?? payload;
};

// Paginated job lists (?page=&limit=): resolves { items, total } so callers can offer "Load more"
const PAGE_SIZE = 50;
const authenticatedList = async (path, page = 1) => {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${API_BASE}/api/v1${path}${separator}page=${page}&limit=${PAGE_SIZE}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw Object.assign(new Error(payload?.message || 'Request failed'), { status: response.status });
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return { items, total: Number(payload?.total ?? items.length) };
};

export const fetchMatchingGigs = () => authenticatedRequest('/booking/available');

export const fetchTechnicianBids = () => authenticatedRequest('/booking/provider/bids');

export const fetchTechnicianDashboard = () => authenticatedRequest('/booking/provider/dashboard');

export const fetchCustomerGigs = () => authenticatedRequest('/booking/me');

export const fetchGigDetails = (gigId) => authenticatedRequest(`/booking/${gigId}`);

export const cancelCustomerGig = (gigId, reason = '') => authenticatedRequest(`/booking/${gigId}/cancel`, {
  method: 'POST',
  body: JSON.stringify({ reason }),
});

export const selectGigBid = (gigId, bidId) => authenticatedRequest(`/booking/${gigId}/select-bid`, {
  method: 'POST',
  body: JSON.stringify({ bidId }),
});

export const completeCustomerGig = (gigId) => authenticatedRequest(`/booking/${gigId}/complete`, {
  method: 'POST',
});

export const fetchBidMessages = (bidId) => authenticatedRequest(`/booking/bid/${bidId}/messages`);

export const sendBidMessage = (bidId, content) => authenticatedRequest(`/booking/bid/${bidId}/message`, {
  method: 'POST',
  body: JSON.stringify({ content }),
});

export const placeGigBid = (gigId, { price, message, estimatedArrival }) => authenticatedRequest(`/booking/${gigId}/bid`, {
  method: 'POST',
  body: JSON.stringify({ price: Number(price), message, estimatedArrival }),
});

export const updateGigBid = (gigId, bidId, { price, message, estimatedArrival }) => authenticatedRequest(`/booking/${gigId}/bid/${bidId}`, {
  method: 'PUT',
  body: JSON.stringify({ price: Number(price), message, estimatedArrival }),
});

// Booking fee + selected bid price, due once a technician is selected
export const confirmGigPayment = (gigId, { paymentMethod, transactionId }) => authenticatedRequest(`/booking/${gigId}/confirm-payment`, {
  method: 'POST',
  body: JSON.stringify({ paymentMethod, transactionId }),
});

// Cancelling after a technician is selected is not refunded
export const cancelSelectedGig = (gigId, reason = '') => authenticatedRequest(`/booking/${gigId}/customer-cancel-bid`, {
  method: 'POST',
  body: JSON.stringify({ reason }),
});

export const startGigJob = (gigId) => authenticatedRequest(`/booking/${gigId}/accept`, { method: 'POST' });

export const markGigCashReceived = (gigId) => authenticatedRequest(`/booking/${gigId}/mark-cash-received`, { method: 'POST' });

export const technicianCancelGig = (gigId, reason = '') => authenticatedRequest(`/booking/${gigId}/technician-cancel-bid`, {
  method: 'POST',
  body: JSON.stringify({ reason }),
});

export const respondToReassignment = (gigId, accept) => authenticatedRequest(`/booking/${gigId}/respond-reassignment`, {
  method: 'POST',
  body: JSON.stringify({ accept }),
});

export const fetchTechnicianLocation = (gigId) => authenticatedRequest(`/booking/${gigId}/technician-location`);

export const updateTechnicianLocation = (gigId, { lat, lng }) => authenticatedRequest(`/booking/${gigId}/technician-location`, {
  method: 'PUT',
  body: JSON.stringify({ lat, lng }),
});

// Support chat with the Kaj Ache team (same thread the app and admin dashboard use)
export const fetchSupportThread = () => authenticatedRequest('/supportChat/me');

export const sendSupportMessage = (message) => authenticatedRequest('/supportChat/message', {
  method: 'POST',
  body: JSON.stringify({ message }),
});

export const markSupportThreadRead = () => authenticatedRequest('/supportChat/me/read', { method: 'POST' });

// Optional instantService / recruitmentRequest id ties the complaint to a job the caller took part in
export const submitComplaint = ({ complainAgainst, instantService, recruitmentRequest, title, reason }) => authenticatedRequest('/complain', {
  method: 'POST',
  body: JSON.stringify({ complainAgainst, instantService, recruitmentRequest, title, reason }),
});

// Admin-managed payment options (name, logo, receiving account); only active ones are offered
export const fetchPaymentMethods = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/paymentMethod`);
    if (!response.ok) throw new Error('Payment method fetch failed');
    const payload = await readJsonResponse(response);
    return (payload?.data ?? []).filter((method) => (method.status ?? 'active') === 'active');
  } catch (error) {
    console.warn('Payment methods unavailable.', error);
    return [];
  }
};

// Coupons currently usable (the backend already drops expired, future and used-up ones)
export const fetchCoupons = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/coupon`);
    if (!response.ok) throw new Error('Coupon fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch (error) {
    console.warn('Coupons unavailable.', error);
    return [];
  }
};

export const createInstantService = async ({ title, details, category, priceMin, priceMax, location, schedule, image }) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('details', details);
  if (category) formData.append('category', category);
  formData.append('priceMin', String(Number(priceMin)));
  formData.append('priceMax', String(Number(priceMax)));
  formData.append('location', JSON.stringify(location));
  if (schedule?.date || schedule?.time) formData.append('schedule', JSON.stringify(schedule));
  if (image) formData.append('image', image);

  const response = await fetch(`${API_BASE}/api/v1/instantService`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Instant service request could not be posted');
  return payload?.data;
};

export const fetchMyInstantServices = (page = 1) => authenticatedList('/instantService/me', page);

// Approved technicians only (403 otherwise); items carry hasBid / myBid
export const fetchAvailableInstantServices = (page = 1) => authenticatedList('/instantService/available', page);

export const fetchInstantProviderBids = (page = 1) => authenticatedList('/instantService/provider/bids', page);

export const fetchInstantService = (id) => authenticatedRequest(`/instantService/${id}`);

export const placeInstantBid = (id, { price, message, estimatedArrival }) => authenticatedRequest(`/instantService/${id}/bid`, {
  method: 'POST',
  body: JSON.stringify({ price: Number(price), message, estimatedArrival }),
});

export const updateInstantBid = (id, bidId, { price, message, estimatedArrival }) => authenticatedRequest(`/instantService/${id}/bid/${bidId}`, {
  method: 'PUT',
  body: JSON.stringify({ price: Number(price), message, estimatedArrival }),
});

export const selectInstantBid = (id, bidId) => authenticatedRequest(`/instantService/${id}/select-bid`, {
  method: 'POST',
  body: JSON.stringify({ bidId }),
});

export const confirmInstantPayment = (id, { paymentMethod, transactionId }) => authenticatedRequest(`/instantService/${id}/confirm-payment`, {
  method: 'POST',
  body: JSON.stringify({ paymentMethod, transactionId }),
});

export const cancelInstantService = (id, reason = '') => authenticatedRequest(`/instantService/${id}/cancel`, {
  method: 'POST',
  body: JSON.stringify({ reason }),
});

export const completeInstantService = (id) => authenticatedRequest(`/instantService/${id}/complete`, { method: 'POST' });

export const startInstantJob = (id) => authenticatedRequest(`/instantService/${id}/accept`, { method: 'POST' });
export const fetchCategoryDetails = async (id) => {
  const response = await fetch(`${API_BASE}/api/v1/category/${id}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Category not found');
  return payload?.data ?? null;
};

// Public homepage teasers: open jobs with no client details. Fail quietly so
// the homepage just hides the section when the API is unavailable.
const fetchPublicList = async (path) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`);
    if (!response.ok) throw new Error('Public list fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch (error) {
    console.warn(`${path} unavailable.`, error);
    return [];
  }
};

export const fetchPublicInstantServices = () => fetchPublicList('/instantService/public');

export const fetchPublicRecruitmentRequests = () => fetchPublicList('/recruitmentRequest/public');

// Customer job posts (recruitment requests). Created as pending_payment; the posting fee opens hiring.
export const createRecruitmentRequest = async ({ title, details, duration, salary, image }) => {
  const formData = new FormData();
  formData.append('title', title);
  if (details) formData.append('details', details);
  formData.append('duration', duration);
  formData.append('salary', String(Number(salary)));
  if (image) formData.append('image', image);

  const response = await fetch(`${API_BASE}/api/v1/recruitmentRequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Job post could not be created');
  return payload?.data;
};

export const fetchMyRecruitmentRequests = (page = 1) => authenticatedList('/recruitmentRequest/me', page);
export const fetchRecruitmentRequest = (id) => authenticatedRequest(`/recruitmentRequest/${id}`);
export const confirmRecruitmentPayment = (id, { paymentMethod, transactionId }) => authenticatedRequest(`/recruitmentRequest/${id}/confirm-payment`, { method: 'POST', body: JSON.stringify({ paymentMethod, transactionId }) });
export const selectRecruitmentBid = (id, bidId) => authenticatedRequest(`/recruitmentRequest/${id}/select-bid`, { method: 'POST', body: JSON.stringify({ bidId }) });
export const cancelRecruitmentRequest = (id, reason = '') => authenticatedRequest(`/recruitmentRequest/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
export const endRecruitmentRequest = (id) => authenticatedRequest(`/recruitmentRequest/${id}/end`, { method: 'POST' });

// Technician side of recruitment: open posts (approved technicians only, 403 otherwise; items carry hasBid / myBid)
export const fetchAvailableRecruitmentRequests = (page = 1) => authenticatedList('/recruitmentRequest/available', page);
// The technician's applications with their posts (open, hired, ended, lost)
export const fetchMyRecruitmentApplications = (page = 1) => authenticatedList('/recruitmentRequest/provider/bids', page);
export const placeRecruitmentBid = (id, { proposedSalary, message }) => authenticatedRequest(`/recruitmentRequest/${id}/bid`, {
  method: 'POST',
  body: JSON.stringify({ proposedSalary: Number(proposedSalary), message }),
});
export const updateRecruitmentBid = (id, bidId, { proposedSalary, message }) => authenticatedRequest(`/recruitmentRequest/${id}/bid/${bidId}`, {
  method: 'PUT',
  body: JSON.stringify({ proposedSalary: Number(proposedSalary), message }),
});

// Reviews left on one instant service / recruitment request (only its client can leave one)
export const fetchJobReviews = async ({ instantServiceId, recruitmentRequestId }) => {
  const query = instantServiceId ? `instantServiceId=${instantServiceId}` : `recruitmentRequestId=${recruitmentRequestId}`;
  const response = await fetch(`${API_BASE}/api/v1/review?${query}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Review fetch failed');
  return payload?.data ?? [];
};

// Client's review of the technician on a completed instant service or ended recruitment (409 if already reviewed)
export const submitJobReview = ({ instantService, recruitmentRequest, rating, review, employerName }) => authenticatedRequest('/review', {
  method: 'POST',
  body: JSON.stringify({ instantService, recruitmentRequest, rating, review, employerName }),
});

export const fetchServicesByCategory = async (categorySlugOrId) => {
  const response = await fetch(`${API_BASE}/api/v1/service/category/${categorySlugOrId}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Services could not be loaded');
  return payload?.data ?? [];
};

// Up to `limit` other services for a details page sidebar: same category
// first, topped up with the newest others. Raw API shape (title/titleBn/slug/
// image/basePrice). Fails quietly: the sidebar just stays empty.
export const fetchRelatedServices = async (service, limit = 6) => {
  const categoryId = service?.category?._id || service?.category;
  const get = async (path) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1${path}`);
      if (!response.ok) return [];
      const payload = await readJsonResponse(response);
      return Array.isArray(payload?.data) ? payload.data : [];
    } catch {
      return [];
    }
  };
  const [sameCategory, newest] = await Promise.all([
    categoryId ? get(`/service/category/${categoryId}`) : [],
    get(`/service?limit=${limit + 6}`),
  ]);
  const seen = new Set([String(service?._id)]);
  const related = [];
  for (const item of [...sameCategory, ...newest]) {
    const id = String(item?._id);
    if (!item?.slug || seen.has(id) || (item.status && item.status !== 'active')) continue;
    seen.add(id);
    related.push(item);
    if (related.length >= limit) break;
  }
  return related;
};

export const fetchServiceBySlug = async (slug) => {
  const response = await fetch(`${API_BASE}/api/v1/service/${slug}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Service not found');
  return payload?.data ?? null;
};

export const fetchServiceReviews = async (serviceId) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/review?serviceId=${serviceId}`);
    if (!response.ok) throw new Error('Review fetch failed');
    const payload = await readJsonResponse(response);
    return (payload?.data ?? []).filter((item) => (item.status ?? 'approved') === 'approved');
  } catch {
    return [];
  }
};

export const fetchServiceComments = async (serviceId) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/comment?serviceId=${serviceId}`);
    if (!response.ok) throw new Error('Comment fetch failed');
    const payload = await readJsonResponse(response);
    return (payload?.data ?? []).filter((item) => (item.status ?? 'approved') === 'approved');
  } catch {
    return [];
  }
};

export const postServiceComment = ({ serviceId, comment, name }) => authenticatedRequest('/comment', {
  method: 'POST',
  body: JSON.stringify({ service: serviceId, comment, name }),
});

export const fetchDistricts = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/district`);
    if (!response.ok) throw new Error('District fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch {
    return [];
  }
};

export const fetchAreas = async (districtId) => {
  if (!districtId) return [];
  try {
    const response = await fetch(`${API_BASE}/api/v1/area?district=${districtId}`);
    if (!response.ok) throw new Error('Area fetch failed');
    const payload = await readJsonResponse(response);
    return payload?.data ?? [];
  } catch {
    return [];
  }
};

export const submitServiceReview = ({ bookingId, rating, review, employerName }) => authenticatedRequest('/review', {
  method: 'POST',
  body: JSON.stringify({ booking: bookingId, rating, review, employerName }),
});

export const submitTechnicianRating = ({ bookingId, rating, comment }) => authenticatedRequest('/employeeRating', {
  method: 'POST',
  body: JSON.stringify({ booking: bookingId, rating, ...(comment?.trim() ? { comment: comment.trim() } : {}) }),
});

export const fetchPortfolios = async (technicianId) => {
  const response = await fetch(`${API_BASE}/api/v1/portfolio?technitianId=${technicianId}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Portfolio could not be loaded');
  return payload?.data ?? [];
};

// Public portfolio of one technician (their USER id); alias kept for profile views
export const fetchTechnicianPortfolio = (technicianUserId) => fetchPortfolios(technicianUserId);

// Public profile of any user (by USER id): { username, role, roleModelName, profileDetail } without private fields
export const fetchPublicProfile = (userId) => authenticatedRequest(`/profile/${userId}`);

// Approved reviews written about one technician (by USER id), newest first
export const fetchTechnicianReviews = async (technicianUserId) => {
  const response = await fetch(`${API_BASE}/api/v1/review?technicianId=${technicianUserId}`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Reviews could not be loaded');
  return (payload?.data ?? []).filter((item) => (item.status ?? 'approved') === 'approved');
};

export const createPortfolio = async ({ technicianId, technicianName, serviceDetails, image }) => {
  const formData = new FormData();
  formData.append('technitianId', technicianId);
  formData.append('technitianName', technicianName);
  formData.append('servicedetails', serviceDetails);
  formData.append('image', image);

  const response = await fetch(`${API_BASE}/api/v1/portfolio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  handleUnauthorized(response);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload?.message || 'Portfolio work could not be added');
  return payload?.data;
};

export const deletePortfolio = (id) => authenticatedRequest(`/portfolio/${id}`, { method: 'DELETE' });

// ── Analytics ────────────────────────────────────────────────────────────
// Anonymous visitors are tracked by a random id kept in this browser; the
// server attributes signed-in visitors to their account instead.
const VISITOR_ID_KEY = 'kajacheVisitorId';

const getVisitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return `web:${id}`;
  } catch {
    return null;
  }
};

/** Record a website page view in CC Events. Fire-and-forget: never throws. */
export const trackPageView = (path) => {
  const anonymousId = getVisitorId();
  const token = localStorage.getItem('token');
  if (!anonymousId && !token) return;

  fetch(`${API_BASE}/api/v1/events`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      event: 'page_viewed',
      source: 'web',
      anonymousId,
      properties: {
        path,
        title: document.title,
        referrer: document.referrer || null,
      },
    }),
  }).catch(() => {});
};
