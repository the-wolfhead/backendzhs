// src/controllers/admin.controller.js
import crypto from 'crypto';
import prisma from '../prismaClient.js';
import { findAppointmentsResilient } from '../utils/appointmentQuery.js';
import { buildVideoCallUrl } from '../utils/videoCall.js';
import { hashPassword } from '../utils/hash.js';

/* ================================
   📊 Dashboard stats
================================== */
export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalDoctors, totalAppointments, pending, confirmed, completed, cancelled] =
      await Promise.all([
        prisma.user.count(),
        prisma.doctor.count(),
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: 'pending' } }),
        prisma.appointment.count({ where: { status: 'confirmed' } }),
        prisma.appointment.count({ where: { status: 'completed' } }),
        prisma.appointment.count({ where: { status: 'cancelled' } }),
      ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const appointmentsToday = await prisma.appointment.count({
      where: { date: { gte: startOfToday } },
    });

    res.json({
      totalUsers,
      totalDoctors,
      totalAppointments,
      appointmentsToday,
      byStatus: { pending, confirmed, completed, cancelled },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

/* ================================
   👤 Users
================================== */
export const listUsers = async (req, res) => {
  try {
    const { search = '', page = 1, pageSize = 20, role, group } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    // group: patients | doctors | staff | all
    // role: exact role filter (USER, DOCTOR, SUPER_ADMIN, ...)
    const STAFF_ROLES = ['SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'];
    const FACILITY_ROLES = ['HOSPITAL', 'LAB'];
    let roleFilter = {};
    if (role) {
      roleFilter = { role: String(role).toUpperCase() };
    } else if (group === 'patients') {
      roleFilter = { role: 'USER' };
    } else if (group === 'doctors') {
      roleFilter = { role: 'DOCTOR' };
    } else if (group === 'facility') {
      roleFilter = { role: { in: FACILITY_ROLES } };
    } else if (group === 'staff') {
      roleFilter = { role: { in: STAFF_ROLES } };
    }

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const where = {
      ...roleFilter,
      ...searchFilter,
    };

    const [users, total, counts] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, picture: true,
          createdAt: true, googleId: true,
          Doctor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      prisma.user.count({ where }),
      Promise.all([
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.user.count({ where: { role: 'DOCTOR' } }),
        prisma.user.count({ where: { role: { in: STAFF_ROLES } } }),
        prisma.user.count({ where: { role: { in: FACILITY_ROLES } } }),
      ]).catch(() => [0, 0, 0, 0]),
    ]);

    // Normalize Doctor relation
    const normalized = users.map((u) => {
      const doctorProfile = u.Doctor || u.doctor || null;
      const { Doctor, doctor, ...rest } = u;
      return {
        ...rest,
        doctorProfile,
        accountType:
          rest.role === 'DOCTOR'
            ? 'Doctor'
            : rest.role === 'HOSPITAL'
              ? 'Hospital'
              : rest.role === 'LAB'
                ? 'Lab'
                : STAFF_ROLES.includes(rest.role)
                  ? 'Staff'
                  : 'Patient',
      };
    });

    res.json({
      users: normalized,
      total,
      page: Number(page),
      pageSize: take,
      counts: {
        patients: counts[0] || 0,
        doctors: counts[1] || 0,
        staff: counts[2] || 0,
        facility: counts[3] || 0,
      },
    });
  } catch (err) {
    console.error(err);
    // Fallback without Doctor include if relation name differs
    try {
      const { search = '', page = 1, pageSize = 20, role, group } = req.query;
      const take = Math.min(Number(pageSize) || 20, 100);
      const skip = (Number(page) - 1) * take;
      const STAFF_ROLES = ['SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'];
      let roleFilter = {};
      if (role) roleFilter = { role: String(role).toUpperCase() };
      else if (group === 'patients') roleFilter = { role: 'USER' };
      else if (group === 'doctors') roleFilter = { role: 'DOCTOR' };
      else if (group === 'staff') roleFilter = { role: { in: STAFF_ROLES } };
      const where = {
        ...roleFilter,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, name: true, email: true, role: true, picture: true,
            createdAt: true, googleId: true,
          },
          orderBy: { createdAt: 'desc' },
          skip, take,
        }),
        prisma.user.count({ where }),
      ]);
      res.json({
        users: users.map((u) => ({
          ...u,
          accountType:
            u.role === 'DOCTOR'
              ? 'Doctor'
              : u.role === 'HOSPITAL'
                ? 'Hospital'
                : u.role === 'LAB'
                  ? 'Lab'
                  : STAFF_ROLES.includes(u.role)
                    ? 'Staff'
                    : 'Patient',
        })),
        total,
        page: Number(page),
        pageSize: take,
        counts: { patients: 0, doctors: 0, staff: 0 },
      });
    } catch (err2) {
      console.error(err2);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
};

/**
 * @route   GET /admin/dashboard/users/:id
 * @desc    Full read-only view of a user — profile, medical data,
 *          dependents, and recent appointments. Never returns the password
 *          hash. This is view-only: nothing here lets an admin edit medical
 *          data or dependents, only see them (role changes stay in
 *          updateUserRole below, and appointment edits stay in the
 *          appointments endpoints).
 */
export const getUserDetail = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        dependents: { orderBy: { createdAt: 'asc' } },
        appointments: {
          include: { doctor: { select: { id: true, name: true, specialty: true } } },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['USER', 'DOCTOR', 'HOSPITAL', 'LAB', 'PHARMACY', 'SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent a super admin from locking themselves out by accident
    if (req.params.id === req.user.id && role !== 'SUPER_ADMIN') {
      return res.status(400).json({ error: "You can't remove your own SUPER_ADMIN role" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

/* ================================
   📅 Appointments
================================== */
export const listAppointments = async (req, res) => {
  try {
    const { search = '', status, type, page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = {
      ...(status ? { status } : {}),
    };

    if (type && String(type).toUpperCase() !== 'ALL') {
      where.type = String(type).toUpperCase();
    }

    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: 'insensitive' } },
        { paymentReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const { appointments, total } = await findAppointmentsResilient(prisma, {
      where,
      skip,
      take,
    });

    // Optional client-side type filter if DB lacked type column
    let list = appointments;
    if (type && String(type).toUpperCase() !== 'ALL') {
      const t = String(type).toUpperCase();
      list = list.filter((a) => {
        const at = (a.type || 'DOCTOR').toUpperCase();
        if (t === 'DOCTOR') return at === 'DOCTOR' || (!a.hospitalId && !a.labId && !a.hospital && !a.lab);
        if (t === 'HOSPITAL') return at === 'HOSPITAL' || a.hospitalId != null || a.hospital;
        if (t === 'LAB') return at === 'LAB' || a.labId != null || a.lab;
        return true;
      });
    }

    res.json({
      appointments: list,
      total: type && String(type).toUpperCase() !== 'ALL' ? list.length : total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments', detail: err.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { status, date, time, patientName, resultUrl, resultNotes } = req.body;
    const id = Number(req.params.id);

    const data = {
      ...(status !== undefined ? { status } : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(time !== undefined ? { time } : {}),
      ...(patientName !== undefined ? { patientName } : {}),
    };

    if (resultUrl !== undefined) {
      data.resultUrl = resultUrl || null;
      data.resultUploadedAt = resultUrl ? new Date() : null;
    }
    if (resultNotes !== undefined) {
      data.resultNotes = resultNotes || null;
      if (resultNotes && !data.resultUploadedAt) {
        data.resultUploadedAt = new Date();
      }
    }

    let appointment;
    try {
      appointment = await prisma.appointment.update({
        where: { id },
        data,
        include: {
          Doctor: true,
          Hospital: true,
          Lab: true,
          User: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (e) {
      appointment = await prisma.appointment.update({
        where: { id },
        data,
        include: {
          doctor: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
};

export const regenerateVideoCallLink = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const videoCallUrl = buildVideoCallUrl(`${id}-r${Date.now()}`); // new room, in case the old one is stuck/compromised

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { videoCallUrl },
    });

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate video call link' });
  }
};

/* ================================
   🩺 Doctors
================================== */
export const listDoctorsAdmin = async (req, res) => {
  try {
    let doctors;
    try {
      doctors = await prisma.doctor.findMany({
        orderBy: { name: 'asc' },
        include: {
          User: { select: { id: true, email: true, role: true, createdAt: true } },
        },
      });
    } catch (includeErr) {
      // Fallback if relation field is named `user` (lowercase) in an older client
      doctors = await prisma.doctor.findMany({
        orderBy: { name: 'asc' },
        include: {
          user: { select: { id: true, email: true, role: true, createdAt: true } },
        },
      });
    }

    const normalized = doctors.map((d) => {
      const linked = d.User || d.user || null;
      const { User, user: _u, ...rest } = d;
      return {
        ...rest,
        userId: rest.userId || linked?.id || null,
        hasLogin: Boolean(linked || rest.userId),
        loginEmail: linked?.email || null,
      };
    });
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const { name, specialty, rating, bio, fee, availableHours, email } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    // If an email is given, provision real login credentials alongside the
    // directory entry (a Doctor row with no linked User can't log into
    // anything — it's directory-only). A random temp password is generated
    // and returned once so the admin can share it with the doctor; there's
    // no way to retrieve it again after this response.
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }

      const tempPassword = crypto.randomBytes(6).toString('base64url'); // e.g. "k3F9pQm2"
      const hashed = await hashPassword(tempPassword);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name, email, password: hashed, role: 'DOCTOR' },
        });

        const doctor = await tx.doctor.create({
          data: {
            name,
            specialty: Array.isArray(specialty) ? specialty : (specialty ? [specialty] : []),
            rating: rating ?? 0,
            bio,
            fee: fee ?? 3000,
            availableHours,
            userId: user.id,
          },
        });

        return { user, doctor };
      });

      return res.status(201).json({
        ...result.doctor,
        loginEmail: email,
        tempPassword, // shown once — not retrievable after this response
      });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialty: Array.isArray(specialty) ? specialty : (specialty ? [specialty] : []),
        rating: rating ?? 0,
        bio,
        fee: fee ?? 3000,
        availableHours,
      },
    });

    res.status(201).json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { name, specialty, rating, bio, fee, availableHours, picture } = req.body;

    const doctor = await prisma.doctor.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(specialty !== undefined ? { specialty: Array.isArray(specialty) ? specialty : [specialty] } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(fee !== undefined ? { fee } : {}),
        ...(availableHours !== undefined ? { availableHours } : {}),
        ...(picture !== undefined ? { picture } : {}),
      },
    });

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    await prisma.doctor.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete doctor — they may still have appointments on record' });
  }
};


/**
 * Provision (or reset) login credentials for an existing directory doctor.
 * Creates a User with role=DOCTOR if none is linked, or resets the password
 * on the linked user. Returns the plain-text temp password once.
 */
export const provisionDoctorCredentials = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid doctor id' });

    const { email } = req.body;

    let doctor;
    try {
      doctor = await prisma.doctor.findUnique({
        where: { id },
        include: { User: { select: { id: true, email: true } } },
      });
    } catch {
      doctor = await prisma.doctor.findUnique({
        where: { id },
        include: { user: { select: { id: true, email: true } } },
      });
    }

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const hashed = await hashPassword(tempPassword);

    // Already linked to a login account — reset password
    if (doctor.userId) {
      const user = await prisma.user.update({
        where: { id: doctor.userId },
        data: { password: hashed, role: 'DOCTOR' },
      });

      return res.json({
        doctorId: doctor.id,
        loginEmail: user.email,
        tempPassword,
        created: false,
        message: 'Password reset. Share this password with the doctor — it will not be shown again.',
      });
    }

    // Need an email to create a new login
    const loginEmail = (email || '').trim().toLowerCase();
    if (!loginEmail) {
      return res.status(400).json({
        error: 'email is required to create login credentials for a doctor with no linked account',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existing) {
      // If the existing user is already a doctor with no profile, link them
      if (existing.role === 'DOCTOR') {
        const other = await prisma.doctor.findFirst({ where: { userId: existing.id } });
        if (other && other.id !== doctor.id) {
          return res.status(409).json({ error: 'That email is already linked to another doctor profile' });
        }
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existing.id },
            data: { password: hashed, name: existing.name || doctor.name },
          }),
          prisma.doctor.update({
            where: { id: doctor.id },
            data: { userId: existing.id },
          }),
        ]);
        return res.json({
          doctorId: doctor.id,
          loginEmail,
          tempPassword,
          created: false,
          message: 'Linked existing account and set a new password.',
        });
      }
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: doctor.name,
          email: loginEmail,
          password: hashed,
          role: 'DOCTOR',
        },
      });
      const updated = await tx.doctor.update({
        where: { id: doctor.id },
        data: { userId: user.id },
      });
      return { user, doctor: updated };
    });

    return res.status(201).json({
      doctorId: result.doctor.id,
      loginEmail,
      tempPassword,
      created: true,
      message: 'Login created. Share email and password with the doctor — the password will not be shown again.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to provision doctor credentials' });
  }
};


/* ================================
   🏥 Hospitals / Labs / Pharmacies
================================== */
export const listHospitalsAdmin = async (req, res) => {
  try {
    let items;
    try {
      items = await prisma.hospital.findMany({
        orderBy: { name: 'asc' },
        include: {
          StaffUser: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } catch {
      items = await prisma.hospital.findMany({ orderBy: { name: 'asc' } });
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
};

export const createHospital = async (req, res) => {
  try {
    const { name, address, phone, email, specialty, fee } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    const data = {
      name,
      address,
      phone: phone || null,
      email: email || null,
      specialty: Array.isArray(specialty)
        ? specialty
        : String(specialty || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    };
    if (fee != null && fee !== '') data.fee = Number(fee);

    let hospital;
    try {
      hospital = await prisma.hospital.create({ data });
    } catch (e) {
      // Older schema without fee column
      delete data.fee;
      hospital = await prisma.hospital.create({ data });
    }
    res.status(201).json(hospital);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create hospital' });
  }
};

export const updateHospital = async (req, res) => {
  try {
    const { name, address, phone, email, specialty, fee } = req.body;
    const data = {
      ...(name !== undefined ? { name } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(specialty !== undefined
        ? {
            specialty: Array.isArray(specialty)
              ? specialty
              : String(specialty)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
          }
        : {}),
      ...(fee !== undefined && fee !== '' ? { fee: Number(fee) } : {}),
    };
    let hospital;
    try {
      hospital = await prisma.hospital.update({
        where: { id: Number(req.params.id) },
        data,
      });
    } catch (e) {
      delete data.fee;
      hospital = await prisma.hospital.update({
        where: { id: Number(req.params.id) },
        data,
      });
    }
    res.json(hospital);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
};

export const deleteHospital = async (req, res) => {
  try {
    await prisma.hospital.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Hospital deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
};

export const listLabsAdmin = async (req, res) => {
  try {
    let items;
    try {
      items = await prisma.lab.findMany({
        orderBy: { name: 'asc' },
        include: {
          StaffUser: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } catch {
      items = await prisma.lab.findMany({ orderBy: { name: 'asc' } });
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
};

export const createLab = async (req, res) => {
  try {
    const { name, services, address, phone, email, fee } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    const data = {
      name,
      services: services || '',
      address,
      phone: phone || null,
      email: email || null,
    };
    if (fee != null && fee !== '') data.fee = Number(fee);

    let lab;
    try {
      lab = await prisma.lab.create({ data });
    } catch (e) {
      delete data.fee;
      lab = await prisma.lab.create({ data });
    }
    res.status(201).json(lab);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lab' });
  }
};

export const updateLab = async (req, res) => {
  try {
    const { name, services, address, phone, email, fee } = req.body;
    const data = {
      ...(name !== undefined ? { name } : {}),
      ...(services !== undefined ? { services } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(fee !== undefined && fee !== '' ? { fee: Number(fee) } : {}),
    };
    let lab;
    try {
      lab = await prisma.lab.update({
        where: { id: Number(req.params.id) },
        data,
      });
    } catch (e) {
      delete data.fee;
      lab = await prisma.lab.update({
        where: { id: Number(req.params.id) },
        data,
      });
    }
    res.json(lab);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lab' });
  }
};

export const deleteLab = async (req, res) => {
  try {
    await prisma.lab.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Lab deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete lab' });
  }
};

export const listPharmaciesAdmin = async (req, res) => {
  try {
    const items = await prisma.pharmacy.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pharmacies' });
  }
};

export const createPharmacy = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    const pharmacy = await prisma.pharmacy.create({
      data: {
        name,
        address,
        phone: phone || null,
        email: email || null,
      },
    });
    res.status(201).json(pharmacy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create pharmacy' });
  }
};

export const updatePharmacy = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const pharmacy = await prisma.pharmacy.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
      },
    });
    res.json(pharmacy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update pharmacy' });
  }
};

export const deletePharmacy = async (req, res) => {
  try {
    await prisma.pharmacy.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Pharmacy deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete pharmacy' });
  }
};


/* ================================
   💳 Transactions (admin)
   Reads from the ZHS Transaction table so the dashboard works even when
   the separate payment-gateway service is down or JWT_SECRET differs.
================================== */
export const listTransactionsAdmin = async (req, res) => {
  try {
    const { search = '', status, page = 1, pageSize = 20, type, channel } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = {
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(type ? { type: String(type).toUpperCase() } : {}),
      ...(channel ? { channel: String(channel).toUpperCase() } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { id: { contains: search, mode: 'insensitive' } },
              { User: { email: { contains: search, mode: 'insensitive' } } },
              { User: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    let transactions;
    let total;
    try {
      [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            User: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.transaction.count({ where }),
      ]);
    } catch (relErr) {
      // camelCase user relation / no nested User search
      const whereCamel = {
        ...(status ? { status: String(status).toUpperCase() } : {}),
        ...(type ? { type: String(type).toUpperCase() } : {}),
        ...(channel ? { channel: String(channel).toUpperCase() } : {}),
        ...(search
          ? {
              OR: [
                { reference: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      try {
        [transactions, total] = await Promise.all([
          prisma.transaction.findMany({
            where: whereCamel,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          prisma.transaction.count({ where: whereCamel }),
        ]);
      } catch {
        [transactions, total] = await Promise.all([
          prisma.transaction.findMany({
            where: whereCamel,
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          prisma.transaction.count({ where: whereCamel }),
        ]);
      }
    }

    const normalized = transactions.map((tx) => {
      const user = tx.User || tx.user || null;
      const { User, user: _u, ...rest } = tx;
      return {
        ...rest,
        // Decimal / BigInt safe for JSON
        amount: rest.amount != null ? Number(rest.amount) : 0,
        user,
        userId: rest.userId,
        userName: user?.name || null,
        userEmail: user?.email || null,
      };
    });

    res.json({
      transactions: normalized,
      total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const getTransactionAdmin = async (req, res) => {
  try {
    const refOrId = req.params.reference;
    let tx = await prisma.transaction.findFirst({
      where: {
        OR: [{ reference: refOrId }, { id: refOrId }],
      },
      include: { User: { select: { id: true, name: true, email: true } } },
    }).catch(() => null);

    if (!tx) {
      tx = await prisma.transaction.findFirst({
        where: {
          OR: [{ reference: refOrId }, { id: refOrId }],
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const user = tx.User || tx.user || null;
    const { User, user: _u, ...rest } = tx;
    res.json({
      ...rest,
      amount: rest.amount != null ? Number(rest.amount) : 0,
      user,
      userName: user?.name,
      userEmail: user?.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

export const markTransactionFailed = async (req, res) => {
  try {
    const refOrId = req.params.reference;
    const existing = await prisma.transaction.findFirst({
      where: { OR: [{ reference: refOrId }, { id: refOrId }] },
    });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const tx = await prisma.transaction.update({
      where: { id: existing.id },
      data: { status: 'FAILED' },
    });
    res.json({
      ...tx,
      amount: tx.amount != null ? Number(tx.amount) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark transaction as failed' });
  }
};

/**
 * "Retry" on the records backend: if a TOPUP is still PENDING, mark it
 * SUCCESS and credit the user wallet (amounts stored in kobo/subunits on Wallet).
 * Full PalmPay re-query still belongs on the payment gateway when available.
 */
export const retryTransactionAdmin = async (req, res) => {
  try {
    const refOrId = req.params.reference;
    const existing = await prisma.transaction.findFirst({
      where: { OR: [{ reference: refOrId }, { id: refOrId }] },
    });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    if (existing.status === 'SUCCESS') {
      return res.json({
        ...existing,
        amount: existing.amount != null ? Number(existing.amount) : 0,
        message: 'Transaction already SUCCESS',
      });
    }

    if (existing.status === 'REFUNDED') {
      return res.status(400).json({ error: 'Cannot retry a refunded transaction' });
    }

    const amountNum = existing.amount != null ? Number(existing.amount) : 0;
    // Wallet balance is BigInt kobo; Transaction.amount is Decimal Naira in your schema.
    // Credit wallet in kobo (×100) when treating amount as Naira.
    const kobo = BigInt(Math.round(amountNum * 100));

    const result = await prisma.$transaction(async (db) => {
      const tx = await db.transaction.update({
        where: { id: existing.id },
        data: { status: 'SUCCESS' },
      });

      if (existing.type === 'TOPUP' && existing.userId && kobo > 0n) {
        const wallet = await db.wallet.findUnique({ where: { userId: existing.userId } });
        if (wallet) {
          await db.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance + kobo },
          });
        } else {
          await db.wallet.create({
            data: {
              id: crypto.randomUUID ? crypto.randomUUID() : existing.userId,
              userId: existing.userId,
              balance: kobo,
            },
          });
        }
      }

      return tx;
    });

    res.json({
      ...result,
      amount: result.amount != null ? Number(result.amount) : 0,
      message: 'Marked SUCCESS' + (existing.type === 'TOPUP' ? ' and wallet credited' : ''),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retry transaction' });
  }
};

export const listReconciliationAdmin = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;
    const where = status ? { status: String(status).toUpperCase() } : {};

    const [logs, total] = await Promise.all([
      prisma.reconciliationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.reconciliationLog.count({ where }),
    ]);

    res.json({
      logs: logs.map((l) => ({
        ...l,
        palmpayAmount: Number(l.palmpayAmount),
        ledgerAmount: Number(l.ledgerAmount),
        difference: Number(l.difference),
      })),
      total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reconciliation logs' });
  }
};

export const listAccountsAdmin = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '' } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = search
      ? {
          OR: [
            { accountNumber: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    let accounts;
    let total;
    try {
      [accounts, total] = await Promise.all([
        prisma.account.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            wallet: { select: { id: true, balance: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.account.count({ where }),
      ]);
    } catch {
      [accounts, total] = await Promise.all([
        prisma.account.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.account.count(),
      ]);
    }

    res.json({
      accounts: accounts.map((a) => ({
        ...a,
        walletBalance:
          a.wallet?.balance != null ? Number(a.wallet.balance) : null,
      })),
      total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};


/**
 * Create a HOSPITAL or LAB staff login (no Doctor profile required).
 * Optional hospitalId / labId links the account to that facility.
 * Returns one-time temp password.
 */
export const createFacilityStaff = async (req, res) => {
  try {
    const { name, email, role, hospitalId, labId } = req.body;
    const r = String(role || '').toUpperCase();
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!['HOSPITAL', 'LAB'].includes(r)) {
      return res.status(400).json({ error: 'role must be HOSPITAL or LAB' });
    }
    if (r === 'HOSPITAL' && labId) {
      return res.status(400).json({ error: 'labId is not valid for HOSPITAL role' });
    }
    if (r === 'LAB' && hospitalId) {
      return res.status(400).json({ error: 'hospitalId is not valid for LAB role' });
    }

    const loginEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    let facility = null;
    if (hospitalId) {
      facility = await prisma.hospital.findUnique({ where: { id: Number(hospitalId) } });
      if (!facility) return res.status(404).json({ error: 'Hospital not found' });
      if (facility.staffUserId) {
        return res.status(409).json({
          error: 'This hospital already has a staff login. Reset credentials instead.',
        });
      }
    }
    if (labId) {
      facility = await prisma.lab.findUnique({ where: { id: Number(labId) } });
      if (!facility) return res.status(404).json({ error: 'Lab not found' });
      if (facility.staffUserId) {
        return res.status(409).json({
          error: 'This lab already has a staff login. Reset credentials instead.',
        });
      }
    }

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const hashed = await hashPassword(tempPassword);

    const result = await prisma.$transaction(async (db) => {
      const user = await db.user.create({
        data: {
          name: name.trim(),
          email: loginEmail,
          password: hashed,
          role: r,
        },
      });

      if (hospitalId) {
        await db.hospital.update({
          where: { id: Number(hospitalId) },
          data: { staffUserId: user.id },
        });
      }
      if (labId) {
        await db.lab.update({
          where: { id: Number(labId) },
          data: { staffUserId: user.id },
        });
      }

      return user;
    });

    res.status(201).json({
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      loginEmail: result.email,
      tempPassword,
      hospitalId: hospitalId ? Number(hospitalId) : null,
      labId: labId ? Number(labId) : null,
      facilityName: facility?.name || null,
      message:
        'Facility staff account created. Share the password once — it cannot be retrieved later.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create facility staff account' });
  }
};

/**
 * Reset / create login for a specific hospital (by id).
 * Body: { name?, email } — email required if no staff linked yet.
 */
export const provisionHospitalLogin = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { StaffUser: { select: { id: true, email: true, name: true, role: true } } },
    }).catch(async () => {
      return prisma.hospital.findUnique({ where: { id } });
    });

    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const hashed = await hashPassword(tempPassword);

    // Existing linked user → reset password
    if (hospital.staffUserId) {
      const user = await prisma.user.update({
        where: { id: hospital.staffUserId },
        data: { password: hashed, role: 'HOSPITAL' },
      });
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'HOSPITAL',
        loginEmail: user.email,
        tempPassword,
        hospitalId: id,
        facilityName: hospital.name,
        message: 'Password reset. Share once — not retrievable later.',
      });
    }

    const { name, email } = req.body;
    const loginEmail = (email || hospital.email || '').trim().toLowerCase();
    if (!loginEmail) {
      return res.status(400).json({
        error: 'email is required (hospital has no email on file)',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existing) {
      // Link existing user if not already a different facility staff
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed, role: 'HOSPITAL', name: name?.trim() || existing.name },
      });
      await prisma.hospital.update({
        where: { id },
        data: { staffUserId: existing.id },
      });
      return res.json({
        id: existing.id,
        name: name?.trim() || existing.name,
        email: existing.email,
        role: 'HOSPITAL',
        loginEmail: existing.email,
        tempPassword,
        hospitalId: id,
        facilityName: hospital.name,
        message: 'Existing user linked and password set. Share once.',
      });
    }

    const user = await prisma.user.create({
      data: {
        name: (name || hospital.name).trim(),
        email: loginEmail,
        password: hashed,
        role: 'HOSPITAL',
      },
    });
    await prisma.hospital.update({
      where: { id },
      data: { staffUserId: user.id },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'HOSPITAL',
      loginEmail: user.email,
      tempPassword,
      hospitalId: id,
      facilityName: hospital.name,
      message: 'Hospital login created. Share the password once.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to provision hospital login' });
  }
};

export const provisionLabLogin = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const lab = await prisma.lab.findUnique({ where: { id } });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const hashed = await hashPassword(tempPassword);

    if (lab.staffUserId) {
      const user = await prisma.user.update({
        where: { id: lab.staffUserId },
        data: { password: hashed, role: 'LAB' },
      });
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'LAB',
        loginEmail: user.email,
        tempPassword,
        labId: id,
        facilityName: lab.name,
        message: 'Password reset. Share once — not retrievable later.',
      });
    }

    const { name, email } = req.body;
    const loginEmail = (email || lab.email || '').trim().toLowerCase();
    if (!loginEmail) {
      return res.status(400).json({
        error: 'email is required (lab has no email on file)',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed, role: 'LAB', name: name?.trim() || existing.name },
      });
      await prisma.lab.update({
        where: { id },
        data: { staffUserId: existing.id },
      });
      return res.json({
        id: existing.id,
        name: name?.trim() || existing.name,
        email: existing.email,
        role: 'LAB',
        loginEmail: existing.email,
        tempPassword,
        labId: id,
        facilityName: lab.name,
        message: 'Existing user linked and password set. Share once.',
      });
    }

    const user = await prisma.user.create({
      data: {
        name: (name || lab.name).trim(),
        email: loginEmail,
        password: hashed,
        role: 'LAB',
      },
    });
    await prisma.lab.update({
      where: { id },
      data: { staffUserId: user.id },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'LAB',
      loginEmail: user.email,
      tempPassword,
      labId: id,
      facilityName: lab.name,
      message: 'Lab login created. Share the password once.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to provision lab login' });
  }
};


export const getMyPermissions = async (req, res) => {
  try {
    const { PERMISSIONS, roleHasPermission } = await import('../config/permissions.js');
    const role = req.user.role;
    const granted = Object.keys(PERMISSIONS).filter((key) => roleHasPermission(role, key));
    res.json({
      role,
      permissions: granted,
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve permissions' });
  }
};


/* ================================
   📋 Doctor credential verification (admin)
================================== */
export const listDoctorCredentials = async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;
    const where = status && status !== 'all' ? { status: String(status).toUpperCase() } : {};

    const [items, total] = await Promise.all([
      prisma.doctorCredential.findMany({
        where,
        include: {
          Doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
              verificationStatus: true,
              User: { select: { id: true, email: true, name: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take,
      }),
      prisma.doctorCredential.count({ where }),
    ]);

    res.json({
      items: items.map((i) => {
        const doctor = i.Doctor || i.doctor;
        const { Doctor, doctor: _d, ...rest } = i;
        return { ...rest, doctor };
      }),
      total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list credential submissions', detail: err.message });
  }
};

export const reviewDoctorCredential = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, reviewNotes } = req.body;
    const s = String(status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(s)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
    }

    const existing = await prisma.doctorCredential.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const submission = await prisma.doctorCredential.update({
      where: { id },
      data: {
        status: s,
        reviewNotes: reviewNotes ? String(reviewNotes).trim() : null,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    try {
      await prisma.doctor.update({
        where: { id: existing.doctorId },
        data: {
          verificationStatus: s === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
        },
      });
    } catch (_) {}

    res.json({
      submission,
      message: s === 'APPROVED' ? 'Doctor verified' : 'Credentials rejected',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to review credentials', detail: err.message });
  }
};
