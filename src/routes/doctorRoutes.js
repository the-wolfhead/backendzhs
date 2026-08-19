import express from 'express';
import prisma from '../prismaClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

router.get('/', asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const doctors = await prisma.doctor.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { specialty: { has: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: doctors });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: { appointments: true },
  });

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  res.json({ success: true, data: doctor });
}));

router.post('/', authenticateToken, requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { name, specialty, bio, rating, availableHours, workDays, isOnline, fee, userId } = req.body;

  if (!name || !specialty) {
    return res.status(400).json({ success: false, message: 'Name and specialty are required' });
  }

  const parsedSpecialty = Array.isArray(specialty) ? specialty : [specialty];
  const parsedWorkDays = Array.isArray(workDays) ? workDays : [];

  let parsedHours = null;
  if (availableHours !== undefined && availableHours !== null && availableHours !== '') {
    try {
      parsedHours = typeof availableHours === 'string' ? JSON.parse(availableHours) : availableHours;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid availableHours JSON' });
    }
  }

  const doctor = await prisma.doctor.create({
    data: {
      name: String(name).trim(),
      specialty: parsedSpecialty.map(String),
      bio: bio || null,
      rating: rating === undefined || rating === null ? 0 : Number(rating),
      availableHours: parsedHours,
      workDays: parsedWorkDays.map(String),
      isOnline: Boolean(isOnline),
      fee: fee === undefined || fee === null ? 3000 : Number(fee),
      userId: userId || null,
    },
  });

  res.status(201).json({ success: true, data: doctor });
}));

export default router;
