import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler.js'


const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   📍 Get all hospitals
================================== */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query

    const hospitals = await prisma.hospital.findMany({
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

    res.json({
      success: true,
      data: hospitals,
    })
  })
);

/* ================================
   📍 Get hospital by ID
================================== */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital ID',
      })
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id },
    })

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      })
    }

    res.json({
      success: true,
      data: hospital,
    })
  })
)

/* ================================
   ➕ Create hospital
================================== */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, address, phone, email } = req.body

    // ✅ Validation
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name and address are required',
      })
    }

    const hospital = await prisma.hospital.create({
      data: {
        name,
        address,
        phone: phone || null,
        email: email || null,
      },
    })

    res.status(201).json({
      success: true,
      data: hospital,
    })
  })
)

/* ================================
   ✏️ Update hospital
================================== */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital ID',
      })
    }

    const { name, address, phone, email } = req.body

    const existing = await prisma.hospital.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      })
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        address: address ?? existing.address,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
      },
    })

    res.json({
      success: true,
      data: updated,
    })
  })
)

/* ================================
   ❌ Delete hospital
================================== */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital ID',
      })
    }

    const existing = await prisma.hospital.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      })
    }

    await prisma.hospital.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'Hospital deleted successfully',
    })
  })
)

export default router
