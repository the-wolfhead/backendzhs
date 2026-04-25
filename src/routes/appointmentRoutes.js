import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   📍 Get all appointments
================================== */
router.get('/', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
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
   ➕ Book an appointment
================================== */
router.post('/', async (req, res) => {
  try {
    const { doctorId, patientName, date } = req.body;

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: Number(doctorId),
        patientName,
        date: new Date(date),
      },
    });

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/* ================================
   ✏️ Update appointment status
================================== */
router.patch('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
