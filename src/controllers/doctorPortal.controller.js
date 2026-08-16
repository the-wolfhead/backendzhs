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
    const { bio, fee, specialty, availableHours, workDays } = req.body;

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

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, picture: true } } },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({ appointments, total, page: Number(page), pageSize: take });
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
