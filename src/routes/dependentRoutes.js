// src/routes/dependentRoutes.js
import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const dependents = await prisma.dependent.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ dependents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dependents' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, relationship, dateOfBirth, bloodGroup, genotype, allergies } = req.body;

    if (!name || !relationship) {
      return res.status(400).json({ error: 'name and relationship are required' });
    }

    const dependent = await prisma.dependent.create({
      data: {
        userId: req.user.id,
        name,
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        bloodGroup,
        genotype,
        allergies,
      },
    });

    res.status(201).json({ dependent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add dependent' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.dependent.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Dependent not found' });
    }

    const { name, relationship, dateOfBirth, bloodGroup, genotype, allergies } = req.body;

    const dependent = await prisma.dependent.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(relationship !== undefined ? { relationship } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
        ...(bloodGroup !== undefined ? { bloodGroup } : {}),
        ...(genotype !== undefined ? { genotype } : {}),
        ...(allergies !== undefined ? { allergies } : {}),
      },
    });

    res.json({ dependent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update dependent' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.dependent.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Dependent not found' });
    }

    await prisma.dependent.delete({ where: { id: req.params.id } });
    res.json({ message: 'Dependent removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove dependent' });
  }
});

export default router;
