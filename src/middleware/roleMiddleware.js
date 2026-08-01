// src/middleware/roleMiddleware.js
//
// Use after authenticateToken (which attaches the full, freshly-fetched
// user row — including the current role — to req.user). Checking against
// req.user here rather than a JWT claim means a role change/revocation
// takes effect immediately, not just once existing tokens expire.
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions for this action' });
  }
  next();
};

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TECH_SUPPORT: 'TECH_SUPPORT',
  CUSTOMER_CARE: 'CUSTOMER_CARE',
  FINANCE: 'FINANCE',
  AUDITOR: 'AUDITOR',
  USER: 'USER',
};

// Any role except plain USER counts as "staff" — used for routes any admin
// dashboard user can hit (e.g. viewing stats) regardless of specific role.
export const ANY_STAFF = Object.values(ADMIN_ROLES).filter((r) => r !== 'USER');
