// src/controllers/doctorPortal.controller.js
import prisma from '../prismaClient.js';

/* ================================
   👤 My profile
================================== */
export const getMyProfile = async (req, res) => {
  res.json(req.doctor);
};

export const updateMyProfile = async (req, res) => {
  try {
    const { bio, fee, specialty, availableHours, workDays, picture } = req.body;

    const doctor = await prisma.doctor.update({
      where: { id: req.doctor.id },
      data: {
        ...(bio !== undefined ? { bio } : {}),
        ...(fee !== undefined ? { fee: Number(fee) } : {}),
        ...(specialty !== undefined
          ? { specialty: Array.isArray(specialty) ? specialty : [specialty] }
          : {}),
        ...(availableHours !== undefined ? { availableHours } : {}),
        ...(workDays !== undefined
          ? { workDays: Array.isArray(workDays) ? workDays : [workDays] }
          : {}),
        ...(picture !== undefined ? { picture } : {}),
      },
    });

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/* ================================
   🟢 Online status
================================== */
export const setOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline must be true or false' });
    }

    const doctor = await prisma.doctor.update({
      where: { id: req.doctor.id },
      data: { isOnline },
    });

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update online status' });
  }
};

/* ================================
   📅 My appointments
================================== */
export const getMyAppointments = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = {
      doctorId: req.doctor.id,
      ...(status ? { status } : {}),
    };

    let appointments;
    let total;
    try {
      [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: { User: { select: { id: true, name: true, email: true, picture: true } } },
          orderBy: { date: 'desc' },
          skip,
          take,
        }),
        prisma.appointment.count({ where }),
      ]);
    } catch {
      [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: { user: { select: { id: true, name: true, email: true, picture: true } } },
          orderBy: { date: 'desc' },
          skip,
          take,
        }),
        prisma.appointment.count({ where }),
      ]);
    }

    const normalized = appointments.map((a) => {
      const user = a.User || a.user || null;
      const { User, user: _u, ...rest } = a;
      return { ...rest, user };
    });

    res.json({ appointments: normalized, total, page: Number(page), pageSize: take });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

// A doctor can confirm, cancel, or mark their own appointment complete —
// but not silently reschedule the date/time without the patient (that stays
// a customer-care action in the admin dashboard).
const DOCTOR_ALLOWED_STATUSES = ['confirmed', 'cancelled', 'completed'];

export const updateMyAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    if (!DOCTOR_ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${DOCTOR_ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // Ownership check — a doctor can only touch their own appointments
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== req.doctor.id) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

/* ================================
   🏥 Facility appointments (hospital / lab)
   Doctors (and lab staff provisioned as DOCTOR accounts) can review
   hospital & lab bookings and upload results/reports.
================================== */
export const getFacilityAppointments = async (req, res) => {
  try {
    const { type = 'LAB', status, page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;
    const t = String(type).toUpperCase();
    if (!['HOSPITAL', 'LAB'].includes(t)) {
      return res.status(400).json({ error: 'type must be HOSPITAL or LAB' });
    }

    const where = {
      type: t,
      ...(status ? { status } : {}),
    };

    const includePascal = {
      Hospital: { select: { id: true, name: true, address: true } },
      Lab: { select: { id: true, name: true, services: true } },
      User: { select: { id: true, name: true, email: true, picture: true } },
    };
    const includeCamel = {
      hospital: { select: { id: true, name: true, address: true } },
      lab: { select: { id: true, name: true, services: true } },
      user: { select: { id: true, name: true, email: true, picture: true } },
    };

    let appointments;
    let total;
    try {
      [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: includePascal,
          orderBy: { date: 'desc' },
          skip,
          take,
        }),
        prisma.appointment.count({ where }),
      ]);
    } catch {
      [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: includeCamel,
          orderBy: { date: 'desc' },
          skip,
          take,
        }),
        prisma.appointment.count({ where }),
      ]);
    }

    const normalized = appointments.map((a) => {
      const hospital = a.Hospital || a.hospital || null;
      const lab = a.Lab || a.lab || null;
      const user = a.User || a.user || null;
      const { Hospital, Lab, User, hospital: h, lab: l, user: u, ...rest } = a;
      return { ...rest, hospital, lab, user };
    });

    res.json({ appointments: normalized, total, page: Number(page), pageSize: take });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch facility appointments' });
  }
};

export const updateFacilityAppointment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, resultUrl, resultNotes } = req.body;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const t = (existing.type || 'DOCTOR').toUpperCase();
    if (!['HOSPITAL', 'LAB'].includes(t)) {
      return res.status(400).json({ error: 'Not a hospital or lab appointment' });
    }

    const data = {};
    if (status) {
      if (!['confirmed', 'cancelled', 'completed', 'pending', 'in-progress'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      data.status = status;
    }
    if (resultUrl !== undefined) {
      data.resultUrl = resultUrl || null;
      data.resultUploadedAt = resultUrl ? new Date() : null;
    }
    if (resultNotes !== undefined) {
      data.resultNotes = resultNotes || null;
      if (resultNotes && !data.resultUploadedAt) data.resultUploadedAt = new Date();
    }

    const appointment = await prisma.appointment.update({ where: { id }, data });
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update facility appointment' });
  }
};

/** Upload/attach results on the doctor's own consult */
export const uploadMyAppointmentResult = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { resultUrl, resultNotes } = req.body;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== req.doctor.id) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const data = {};
    if (resultUrl !== undefined) {
      data.resultUrl = resultUrl || null;
      data.resultUploadedAt = resultUrl ? new Date() : null;
    }
    if (resultNotes !== undefined) {
      data.resultNotes = resultNotes || null;
      if (resultNotes && !data.resultUploadedAt) data.resultUploadedAt = new Date();
    }

    const appointment = await prisma.appointment.update({ where: { id }, data });
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload result' });
  }
};
