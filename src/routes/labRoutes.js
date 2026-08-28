import express from 'express';
import prisma from '../prismaClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/* ================================
   📍 Get all labs
================================== */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;

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

    res.json({
      success: true,
      data: labs,
    });
  })
);

/* ================================
   📍 Get lab by ID
================================== */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lab ID',
      });
    }

    const lab = await prisma.lab.findUnique({
      where: { id },
    });

    if (!lab) {
      return res.status(404).json({
        success: false,
        message: 'Lab not found',
      });
    }

    res.json({
      success: true,
      data: lab,
    });
  })
);

/* ================================
   ➕ Create lab
================================== */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, services, address, phone, email, fee, availableHours, workDays } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name and address are required',
      });
    }

    const lab = await prisma.lab.create({
      data: {
        name,
        services: services || '',
        address,
        phone: phone || null,
        email: email || null,
        fee: fee != null ? Number(fee) : 8000,
        availableHours: availableHours || undefined,
        workDays: workDays || [],
      },
    });

    res.status(201).json({
      success: true,
      data: lab,
    });
  })
);

/* ================================
   ✏️ Update lab
================================== */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lab ID',
      });
    }

    const { name, services, address, phone, email, fee, availableHours, workDays } = req.body;

    const existing = await prisma.lab.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lab not found',
      });
    }

    const updated = await prisma.lab.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        services: services ?? existing.services,
        address: address ?? existing.address,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        fee: fee != null ? Number(fee) : existing.fee,
        availableHours: availableHours !== undefined ? availableHours : existing.availableHours,
        workDays: workDays ?? existing.workDays,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/* ================================
   ❌ Delete lab
================================== */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lab ID',
      });
    }

    const existing = await prisma.lab.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lab not found',
      });
    }

    await prisma.lab.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Lab deleted successfully',
    });
  })
);

export default router;
