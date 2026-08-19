import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  try {
    const [doctors, hospitals, labs, pharmacies] = await Promise.all([
      prisma.doctor.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { specialty: { has: q } },
          ],
        } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hospital.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lab.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { services: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pharmacy.findMany({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: { doctors, hospitals, labs, pharmacies },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
