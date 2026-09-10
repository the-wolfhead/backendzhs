/**
 * Central RBAC matrix for the ZHS platform.
 * Frontend admin `permissions.js` should mirror these keys.
 *
 * Roles:
 *   USER          – patient (mobile app)
 *   DOCTOR        – clinician portal / doctor app
 *   HOSPITAL      – hospital facility queue
 *   LAB           – lab facility queue
 *   SUPER_ADMIN   – full admin console
 *   TECH_SUPPORT  – technical ops
 *   CUSTOMER_CARE – patient support
 *   FINANCE       – payments & ledger
 *   AUDITOR       – read-only oversight
 */

export const ROLES = {
  USER: 'USER',
  DOCTOR: 'DOCTOR',
  HOSPITAL: 'HOSPITAL',
  LAB: 'LAB',
  PHARMACY: 'PHARMACY',
  SUPER_ADMIN: 'SUPER_ADMIN',
  TECH_SUPPORT: 'TECH_SUPPORT',
  CUSTOMER_CARE: 'CUSTOMER_CARE',
  FINANCE: 'FINANCE',
  AUDITOR: 'AUDITOR',
};

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.TECH_SUPPORT,
  ROLES.CUSTOMER_CARE,
  ROLES.FINANCE,
  ROLES.AUDITOR,
];

export const FACILITY_OPERATOR_ROLES = [ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB];

/** permission key → roles that may perform it */
export const PERMISSIONS = {
  // Admin console — overview
  'admin.stats.read': STAFF_ROLES,

  // Users
  'admin.users.read': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.CUSTOMER_CARE, ROLES.AUDITOR],
  'admin.users.role.write': [ROLES.SUPER_ADMIN],
  'admin.facility_staff.create': [ROLES.SUPER_ADMIN],

  // Appointments
  'admin.appointments.read': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.CUSTOMER_CARE, ROLES.AUDITOR],
  'admin.appointments.write': [ROLES.SUPER_ADMIN, ROLES.CUSTOMER_CARE],
  'admin.appointments.delete': [ROLES.SUPER_ADMIN],
  'admin.appointments.video_regen': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT],

  // Doctors
  'admin.doctors.read': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.CUSTOMER_CARE, ROLES.AUDITOR],
  'admin.doctors.write': [ROLES.SUPER_ADMIN],
  'admin.doctors.credentials': [ROLES.SUPER_ADMIN],

  // Facilities (hospitals, labs, pharmacies)
  'admin.facilities.read': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.CUSTOMER_CARE, ROLES.AUDITOR],
  'admin.facilities.write': [ROLES.SUPER_ADMIN],

  // Finance
  'admin.transactions.read': STAFF_ROLES,
  'admin.transactions.retry': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.FINANCE],
  'admin.accounts.read': [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.AUDITOR],
  'admin.reconciliation.read': [ROLES.SUPER_ADMIN, ROLES.TECH_SUPPORT, ROLES.FINANCE, ROLES.AUDITOR],

  // Clinician / facility operators
  'doctor.profile': [ROLES.DOCTOR],
  'doctor.consults': [ROLES.DOCTOR],
  'facility.hospital.queue': [ROLES.DOCTOR, ROLES.HOSPITAL],
  'facility.lab.queue': [ROLES.DOCTOR, ROLES.LAB],
};

export function roleHasPermission(role, permission) {
  if (!role || !permission) return false;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function rolesForPermission(permission) {
  return PERMISSIONS[permission] || [];
}
