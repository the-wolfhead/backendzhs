import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   📍 Get all doctors (optionally search)
================================== */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const doctors = await prisma.doctor.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { specialty: { contains: q, mode: 'insensitive' } },
              { hospital: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
    });

    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

/* ================================
   📍 Get a single doctor by ID
================================== */
router.get('/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: Number(req.params.id) },
      include: { appointments: true },
    });

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching doctor' });
  }
});

/* ================================
   ➕ Create new doctor
================================== */
router.post('/', async (req, res) => {
  try {
    const { name, specialty, hospital, phone, email, bio, rating, availableHours } = req.body;

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialty,
        hospital,
        phone,
        email,
        bio,
        rating: rating || 0.0,
        availableHours: availableHours ? JSON.parse(availableHours) : null,
      },
    });

    res.json(doctor);
  } catch (err) {
    console.error('Error creating doctor:', err);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
});

export default router;