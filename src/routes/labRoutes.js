import express from 'express';
import prisma from '../prismaClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /labs?q=...  |  GET /api/labs?q=...
router.get('/', asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const labs = await prisma.lab.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { services: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: labs });
}));

// GET /labs/:id  |  GET /api/labs/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid lab ID' });
  }

  const lab = await prisma.lab.findUnique({ where: { id } });

  if (!lab) {
    return res.status(404).json({ success: false, message: 'Lab not found' });
  }

  res.json({ success: true, data: lab });
}));

// POST /labs  |  POST /api/labs
router.post('/', asyncHandler(async (req, res) => {
  const { name, services, address, phone, email } = req.body;

  if (!name || !services || !address) {
    return res.status(400).json({
      success: false,
      message: 'Name, services and address are required',
    });
  }

  const lab = await prisma.lab.create({
    data: {
      name: String(name).trim(),
      services: String(services).trim(),
      address: String(address).trim(),
      phone: phone ? String(phone).trim() : null,
      email: email ? String(email).trim() : null,
    },
  });

  res.status(201).json({ success: true, data: lab });
}));

// PUT /labs/:id  |  PUT /api/labs/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid lab ID' });
  }

  const existing = await prisma.lab.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Lab not found' });
  }

  const { name, services, address, phone, email } = req.body;

  const lab = await prisma.lab.update({
    where: { id },
    data: {
      name: name === undefined ? existing.name : String(name).trim(),
      services: services === undefined ? existing.services : String(services).trim(),
      address: address === undefined ? existing.address : String(address).trim(),
      phone: phone === undefined ? existing.phone : (phone ? String(phone).trim() : null),
      email: email === undefined ? existing.email : (email ? String(email).trim() : null),
    },
  });

  res.json({ success: true, data: lab });
}));

// DELETE /labs/:id  |  DELETE /api/labs/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid lab ID' });
  }

  const existing = await prisma.lab.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Lab not found' });
  }

  await prisma.lab.delete({ where: { id } });
  res.json({ success: true, message: 'Lab deleted successfully' });
}));

export default router;
