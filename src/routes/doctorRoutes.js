import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler.js'


const router = express.Router();
const prisma = new PrismaClient();

/* ================================
   📍 Get all doctors (search)
================================== */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query

    const doctors = await prisma.doctor.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              // ⚠️ specialty is String[] → use has/hasSome
              { specialty: { has: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      data: doctors,
    })
  })
)

/* ================================
   📍 Get doctor by ID
================================== */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      })
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        appointments: true, // ✅ match your schema exactly
      },
    })

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      })
    }

    res.json({
      success: true,
      data: doctor,
    })
  })
)

/* ================================
   ➕ Create doctor
================================== */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      name,
      specialty,
      bio,
      rating,
      availableHours,
    } = req.body

    // ✅ Basic validation
    if (!name || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'Name and specialty are required',
      })
    }

    // ✅ Ensure specialty is array
    const parsedSpecialty =
      Array.isArray(specialty) ? specialty : [specialty]

    // ✅ Safe JSON parsing
    let parsedHours = null
    if (availableHours) {
      try {
        parsedHours =
          typeof availableHours === 'string'
            ? JSON.parse(availableHours)
            : availableHours
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid availableHours JSON',
        })
      }
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialty: parsedSpecialty,
        bio: bio || null,
        rating: rating ?? 0,
        availableHours: parsedHours,
      },
    })

    res.status(201).json({
      success: true,
      data: doctor,
    })
  })
)

export default router
