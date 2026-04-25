import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Fetch Doctor by ID
router.get('/doctor/:id', async (req, res) => {
  const { id } = req.params;
  const doctor = await prisma.doctor.findUnique({ where: { id: parseInt(id) } });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  res.json(doctor);
});

// Fetch Hospital by ID
router.get('/hospital/:id', async (req, res) => {
  const { id } = req.params;
  const hospital = await prisma.hospital.findUnique({ where: { id: parseInt(id) } });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  res.json(hospital);
});

// Fetch Laboratory by ID
router.get('/lab/:id', async (req, res) => {
  const { id } = req.params;
  const lab = await prisma.laboratory.findUnique({ where: { id: parseInt(id) } });
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  res.json(lab);
});

// Fetch Pharmacy by ID
router.get('/pharmacy/:id', async (req, res) => {
  const { id } = req.params;
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: parseInt(id) } });
  if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });
  res.json(pharmacy);
});

export default router;
