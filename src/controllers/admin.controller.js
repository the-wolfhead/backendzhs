// src/controllers/admin.controller.js
import crypto from 'crypto';
import prisma from '../prismaClient.js';
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
    const { search = '', page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

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

    res.json({ users, total, page: Number(page), pageSize: take });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['USER', 'DOCTOR', 'SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'];

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
    const { search = '', status, page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Number(page) - 1) * take;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { patientName: { contains: search, mode: 'insensitive' } },
              { paymentReference: { contains: search, mode: 'insensitive' } },
              { doctor: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          doctor: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { date: 'desc' },
        skip, take,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({ appointments, total, page: Number(page), pageSize: take });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { status, date, time, patientName } = req.body;
    const id = Number(req.params.id);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(time !== undefined ? { time } : {}),
        ...(patientName !== undefined ? { patientName } : {}),
      },
      include: { doctor: true, user: { select: { id: true, name: true, email: true } } },
    });

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
    const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
    res.json(doctors);
  } catch (err) {
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
