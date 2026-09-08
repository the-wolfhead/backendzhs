import express from 'express';
import prisma from '../prismaClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const pharmacies = await prisma.pharmacy.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: pharmacies });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' });
    }
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }
    res.json({ success: true, data: pharmacy });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, address, phone, email } = req.body;
    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and address are required' });
    }
    const pharmacy = await prisma.pharmacy.create({
      data: {
        name,
        address,
        phone: phone || null,
        email: email || null,
      },
    });
    res.status(201).json({ success: true, data: pharmacy });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' });
    }
    const { name, address, phone, email } = req.body;
    const existing = await prisma.pharmacy.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }
    const updated = await prisma.pharmacy.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        address: address ?? existing.address,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
      },
    });
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy ID' });
    }
    await prisma.pharmacy.delete({ where: { id } });
    res.json({ success: true, message: 'Pharmacy deleted successfully' });
  })
);

export default router;
