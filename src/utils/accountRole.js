// The website only supports customer and technician accounts.
export const SUPPORTED_ROLES = ['customer', 'technician'];

/** Returns 'customer' | 'technician' for a backend account, or null for any other role (e.g. admin). */
export const resolveAccountRole = (account) => {
  if (!account) return null;
  if (account.roleModelName === 'CustomerProfile') return 'customer';
  if (account.roleModelName === 'TechnicianProfile') return 'technician';
  const title = String(account.role?.title || (typeof account.role === 'string' ? account.role : '')).toLowerCase();
  return SUPPORTED_ROLES.includes(title) ? title : null;
};
