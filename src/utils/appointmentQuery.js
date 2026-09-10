/**
 * Resilient appointment queries.
 * Production may lag schema (missing type/hospitalId/labId columns or relation names).
 * Always try richer queries first, then fall back to bare rows so the UI never goes blank.
 */

function normalizeAppointment(a) {
  if (!a) return a;
  const doctor = a.Doctor || a.doctor || null;
  const hospital = a.Hospital || a.hospital || null;
  const lab = a.Lab || a.lab || null;
  const user = a.User || a.user || null;
  const {
    Doctor,
    Hospital,
    Lab,
    User,
    doctor: _d,
    hospital: _h,
    lab: _l,
    user: _u,
    ...rest
  } = a;

  let type = rest.type;
  if (!type) {
    if (hospital || rest.hospitalId) type = 'HOSPITAL';
    else if (lab || rest.labId) type = 'LAB';
    else type = 'DOCTOR';
  }

  return {
    ...rest,
    type,
    doctor,
    hospital,
    lab,
    user,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ where?: object, skip?: number, take?: number, orderBy?: object }} opts
 */
export async function findAppointmentsResilient(prisma, opts = {}) {
  const {
    where = {},
    skip,
    take,
    orderBy = { date: 'desc' },
  } = opts;

  // Strip filters that need columns which may not exist yet
  const softWhere = { ...where };
  const advancedKeys = ['type', 'hospitalId', 'labId'];
  const hasAdvanced = advancedKeys.some((k) => softWhere[k] !== undefined);

  const includeAttempts = [
    {
      Doctor: { select: { id: true, name: true, specialty: true } },
      Hospital: { select: { id: true, name: true, address: true } },
      Lab: { select: { id: true, name: true, services: true } },
      User: { select: { id: true, name: true, email: true, picture: true } },
    },
    {
      Doctor: { select: { id: true, name: true, specialty: true } },
      User: { select: { id: true, name: true, email: true, picture: true } },
    },
    {
      doctor: { select: { id: true, name: true, specialty: true } },
      user: { select: { id: true, name: true, email: true, picture: true } },
    },
    {
      doctor: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    undefined, // bare rows
  ];

  const whereAttempts = hasAdvanced
    ? [softWhere, stripAdvanced(softWhere)]
    : [softWhere];

  let lastErr;
  for (const w of whereAttempts) {
    for (const include of includeAttempts) {
      try {
        const findArgs = { where: w, orderBy };
        if (skip != null) findArgs.skip = skip;
        if (take != null) findArgs.take = take;
        if (include) findArgs.include = include;

        const [rows, total] = await Promise.all([
          prisma.appointment.findMany(findArgs),
          prisma.appointment.count({ where: w }),
        ]);
        return {
          appointments: rows.map(normalizeAppointment),
          total,
        };
      } catch (e) {
        lastErr = e;
        console.warn('[appointmentQuery] attempt failed:', e.message);
      }
    }
  }

  // Absolute last resort: no where, no include
  try {
    const findArgs = { orderBy };
    if (skip != null) findArgs.skip = skip;
    if (take != null) findArgs.take = take;
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany(findArgs),
      prisma.appointment.count(),
    ]);
    // Client-side filter best-effort
    let filtered = rows;
    if (where.doctorId != null) {
      filtered = filtered.filter((a) => a.doctorId === where.doctorId);
    }
    if (where.status) {
      filtered = filtered.filter((a) => a.status === where.status);
    }
    return {
      appointments: filtered.map(normalizeAppointment),
      total: filtered.length,
    };
  } catch (e) {
    console.error('[appointmentQuery] total failure:', e);
    throw lastErr || e;
  }
}

function stripAdvanced(where) {
  const w = { ...where };
  delete w.type;
  delete w.hospitalId;
  delete w.labId;
  // Remove OR branches that nest Doctor/Hospital/Lab
  if (Array.isArray(w.OR)) {
    w.OR = w.OR.filter(
      (clause) =>
        !clause.Doctor &&
        !clause.Hospital &&
        !clause.Lab &&
        !clause.doctor &&
        !clause.hospital &&
        !clause.lab
    );
    if (w.OR.length === 0) delete w.OR;
  }
  return w;
}

export { normalizeAppointment };
