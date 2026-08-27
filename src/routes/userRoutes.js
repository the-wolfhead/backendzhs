import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const safeUser = (user) => {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
};

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
        picture: true,
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
  const { name, picture } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, picture },
    });

    res.json({ message: 'Profile updated successfully', user: safeUser(updatedUser) });
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

    res.json({ message: 'Medical data updated successfully', user: safeUser(updatedUser) });
  } catch (error) {
    console.error('Update medical data error:', error);
    res.status(500).json({ error: 'Failed to update medical data' });
  }
});

/**
 * @route   GET /user/lookup?email=
 * @desc    Look up another user by email — used to confirm a wallet
 *          transfer recipient exists before sending money. Deliberately
 *          returns only { id, name }, never email/medical/other fields.
 * @access  Private
 */
router.get('/lookup', authenticateToken, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'email query param is required' });
  }

  if (email.toLowerCase() === req.user.email.toLowerCase()) {
    return res.status(400).json({ error: "That's your own account" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    res.json({ user });
  } catch (error) {
    console.error('User lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
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
    const labs = await prisma.lab.findMany();
    const pharmacies = await prisma.pharmacy.findMany();

    res.json({ doctors, hospitals, labs, pharmacies });
  } catch (error) {
    console.error('Home data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch home data' });
  }
});

// PUT /user/update-password
router.put('/update-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.password) {
      return res.status(400).json({ error: 'This account has no password set (e.g. Google sign-in) — nothing to change' });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    const { password: _pw, ...safeUser } = updatedUser;
    res.json({ message: 'Password updated successfully', user: safeUser });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Server error while updating password' });
  }
});

export default router;
