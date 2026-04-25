import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /user/me
 * @desc    Get logged-in user profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        bloodGroup: true,
        genotype: true,
        medicalHistory: true,
        allergies: true,
        smoker: true,
        alcoholUse: true,
        drugUse: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * @route   PUT /user/update
 * @desc    Update user profile (name, photo, etc.)
 * @access  Private
 */
router.put('/update', authenticateToken, async (req, res) => {
  const { name, photoUrl } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, photoUrl },
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route   GET /user/medical
 * @desc    Get user’s medical data
 * @access  Private
 */
router.get('/medical', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        bloodGroup: true,
        genotype: true,
        medicalHistory: true,
        allergies: true,
        smoker: true,
        alcoholUse: true,
        drugUse: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ medicalData: user });
  } catch (error) {
    console.error('Fetch medical data error:', error);
    res.status(500).json({ error: 'Failed to fetch medical data' });
  }
});

/**
 * @route   PUT /user/medical
 * @desc    Update user’s medical data
 * @access  Private
 */
router.put('/medical', authenticateToken, async (req, res) => {
  try {
    const {
      bloodGroup,
      genotype,
      medicalHistory,
      allergies,
      smoker,
      alcoholUse,
      drugUse,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        bloodGroup,
        genotype,
        medicalHistory,
        allergies,
        smoker,
        alcoholUse,
        drugUse,
      },
    });

    res.json({ message: 'Medical data updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update medical data error:', error);
    res.status(500).json({ error: 'Failed to update medical data' });
  }
});

/**
 * @route   GET /user/home-data
 * @desc    Fetch all home data for dashboard
 * @access  Public
 */
router.get('/home-data', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany();
    const hospitals = await prisma.hospital.findMany();
    const labs = await prisma.laboratory.findMany();
    const pharmacies = await prisma.pharmacy.findMany();

    res.json({ doctors, hospitals, labs, pharmacies });
  } catch (error) {
    console.error('Home data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch home data' });
  }
});

// PUT /user/update-password/:id
router.put('/update-password/:id', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    if (!newPassword) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Server error while updating password' });
  }
});

export default router;
