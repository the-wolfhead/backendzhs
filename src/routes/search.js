import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// 🔍 Search or list all
router.get('/', async (req, res) => {
  const { q } = req.query;

  try {
    const filter = q
      ? { where: { name: { contains: q, mode: 'insensitive' } } }
      : {};

    const [doctors, hospitals, labs, pharmacies] = await Promise.all([
      prisma.doctor.findMany(filter),
      prisma.hospital.findMany(filter),
      prisma.lab.findMany(filter),
      prisma.pharmacy.findMany(filter),
    ]);

    res.json({ doctors, hospitals, labs, pharmacies });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
