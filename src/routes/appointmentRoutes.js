import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

import { createAppointment } from '../appointments/create.js';
import { internalAuthMiddleware } from '../middleware/internalAuth.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { buildVideoCallUrl } from '../utils/videoCall.js';

// Protected Internal Route (used by paymentgatewaybackend)
router.post('/create',
  internalAuthMiddleware,           // ← Secure it
  createAppointment
);

/* ================================
   📍 Get my appointments
================================== */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user.id },
      include: { doctor: true },
      orderBy: { date: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

/* ================================
   📍 Get appointments for a doctor
================================== */
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: Number(req.params.doctorId) },
      orderBy: { date: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctor appointments' });
  }
});

/* ================================
   📍 Get a single appointment
   (used by the app before/while joining a video call)
================================== */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

/* ================================
   🎥 Get video-call join info for an appointment
================================== */
router.get('/:id/video-call', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to join this call' });
    }

    if (['cancelled', 'completed'].includes(appointment.status)) {
      return res.status(400).json({
        error: `Cannot join a call for a ${appointment.status} appointment`,
      });
    }

    res.json({
      appointmentId: appointment.id,
      videoCallUrl: appointment.videoCallUrl,
      doctorName: appointment.doctor?.name,
      patientName: appointment.patientName,
      status: appointment.status,
      date: appointment.date,
      time: appointment.time,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch video call info' });
  }
});

/* ================================
   🎥 Mark a video call as started / ended
   (lets this "records" backend track when consultations actually happened)
================================== */
router.patch('/:id/call-start', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { callStartedAt: new Date(), status: 'in-progress' },
    });

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark call as started' });
  }
});

router.patch('/:id/call-end', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { callEndedAt: new Date(), status: 'completed' },
    });

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark call as ended' });
  }
});

/* ================================
   ➕ Book an appointment directly (no payment gateway)
================================== */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctorId, patientName, date, time } = req.body;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'doctorId and date are required' });
    }

    // Fixed: this previously never set `userId` (a required, non-nullable
    // foreign key) or `videoCallUrl` (required, no default) — every call to
    // this route would have thrown a Prisma validation error.
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: Number(doctorId),
        userId: req.user.id,
        patientName: patientName || 'Self',
        date: new Date(date),
        time: time || '',
        videoCallUrl: 'pending',
      },
    });

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { videoCallUrl: buildVideoCallUrl(appointment.id) },
    });

    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/* ================================
   ✏️ Update appointment status
================================== */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

/* ================================
   🗑 Delete appointment
================================== */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
