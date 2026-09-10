/**
 * After authenticateToken. Ensures the user may work facility queues.
 * HOSPITAL role → hospital appointments only
 * LAB role → lab appointments only
 * DOCTOR → both (clinical staff)
 * SUPER_ADMIN and other staff should use admin dashboard instead
 */
export const requireFacilityAccess = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !['DOCTOR', 'HOSPITAL', 'LAB'].includes(role)) {
    return res.status(403).json({
      error: 'Facility access requires a DOCTOR, HOSPITAL, or LAB role',
    });
  }
  next();
};

/** Restrict request query/body type to what this role is allowed to touch */
export const assertFacilityTypeAllowed = (role, type) => {
  const t = String(type || '').toUpperCase();
  if (role === 'HOSPITAL' && t !== 'HOSPITAL') {
    return 'HOSPITAL role can only access hospital appointments';
  }
  if (role === 'LAB' && t !== 'LAB') {
    return 'LAB role can only access lab appointments';
  }
  if (!['HOSPITAL', 'LAB'].includes(t)) {
    return 'type must be HOSPITAL or LAB';
  }
  return null;
};
