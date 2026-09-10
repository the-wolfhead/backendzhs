// src/middleware/roleMiddleware.js
//
// Use after authenticateToken (which attaches the full, freshly-fetched
// user row — including the current role — to req.user). Checking against
// req.user here rather than a JWT claim means a role change/revocation
// takes effect immediately, not just once existing tokens expire.

import {
  PERMISSIONS,
  roleHasPermission,
  rolesForPermission,
  STAFF_ROLES,
  FACILITY_OPERATOR_ROLES,
  ROLES,
} from '../config/permissions.js';

export { ROLES, STAFF_ROLES, FACILITY_OPERATOR_ROLES, PERMISSIONS, roleHasPermission };

/** @deprecated prefer STAFF_ROLES — kept for older imports */
export const ADMIN_ROLES = {
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
  TECH_SUPPORT: ROLES.TECH_SUPPORT,
  CUSTOMER_CARE: ROLES.CUSTOMER_CARE,
  FINANCE: ROLES.FINANCE,
  AUDITOR: ROLES.AUDITOR,
};

export const ANY_STAFF = STAFF_ROLES;
export const FACILITY_ROLES = FACILITY_OPERATOR_ROLES;
export const ALL_APP_ROLES = Object.values(ROLES);

/**
 * Require the user to have one of the listed roles.
 * @example router.get('/x', authenticateToken, requireRole('SUPER_ADMIN', 'FINANCE'), handler)
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Insufficient permissions for this action',
      requiredRoles: allowedRoles,
      yourRole: req.user?.role || null,
    });
  }
  next();
};

/**
 * Require a named permission from the central matrix.
 * @example router.get('/users', authenticateToken, requirePermission('admin.users.read'), handler)
 */
export const requirePermission = (...permissionKeys) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const ok = permissionKeys.some((key) => roleHasPermission(req.user.role, key));
  if (!ok) {
    const requiredRoles = [
      ...new Set(permissionKeys.flatMap((k) => rolesForPermission(k))),
    ];
    return res.status(403).json({
      error: 'Insufficient permissions for this action',
      requiredPermissions: permissionKeys,
      requiredRoles,
      yourRole: req.user.role,
    });
  }
  next();
};

/** True if role is any admin-console staff role */
export const isStaffRole = (role) => STAFF_ROLES.includes(role);

/** True if role can use clinician / facility queues */
export const isFacilityOperator = (role) => FACILITY_OPERATOR_ROLES.includes(role);
