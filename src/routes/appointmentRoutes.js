import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

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
      include: { doctor: true, hospital: true, lab: true },
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
        hospital: true,
        lab: true,
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
    const {
      doctorId,
      hospitalId,
      labId,
      type: bodyType,
      service,
      patientName,
      date,
      time,
      fee,
    } = req.body;

    let type = (bodyType || 'DOCTOR').toUpperCase();
    if (!bodyType) {
      if (hospitalId) type = 'HOSPITAL';
      else if (labId) type = 'LAB';
      else type = 'DOCTOR';
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    if (type === 'DOCTOR' && !doctorId) {
      return res.status(400).json({ error: 'doctorId is required for doctor appointments' });
    }
    if (type === 'HOSPITAL' && !hospitalId) {
      return res.status(400).json({ error: 'hospitalId is required for hospital appointments' });
    }
    if (type === 'LAB' && !labId) {
      return res.status(400).json({ error: 'labId is required for lab appointments' });
    }

    const data = {
      userId: req.user.id,
      type,
      service: service || null,
      patientName: patientName || 'Self',
      date: new Date(date),
      time: time || '',
      amount: fee != null ? parseFloat(fee) : null,
      videoCallUrl: type === 'DOCTOR' ? 'pending' : null,
    };
    if (type === 'DOCTOR') data.doctorId = Number(doctorId);
    if (type === 'HOSPITAL') data.hospitalId = Number(hospitalId);
    if (type === 'LAB') data.labId = Number(labId);

    const appointment = await prisma.appointment.create({ data });

    let updated = appointment;
    if (type === 'DOCTOR') {
      updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { videoCallUrl: buildVideoCallUrl(appointment.id) },
        include: { doctor: true, hospital: true, lab: true },
      });
    } else {
      updated = await prisma.appointment.findUnique({
        where: { id: appointment.id },
        include: { doctor: true, hospital: true, lab: true },
      });
    }

    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/* ================================
   📍 Get appointments for a hospital
================================== */
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { hospitalId: Number(req.params.hospitalId) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hospital appointments' });
  }
});

/* ================================
   📍 Get appointments for a lab
================================== */
router.get('/lab/:labId', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { labId: Number(req.params.labId) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lab appointments' });
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
