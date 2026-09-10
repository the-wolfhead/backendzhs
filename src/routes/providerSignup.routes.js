/**
 * Self-service signup for providers:
 *   POST /auth/signup/doctor
 *   POST /auth/signup/hospital
 *   POST /auth/signup/lab
 *   POST /auth/signup/pharmacy
 *
 * Each creates a User with the correct role + linked facility/profile row.
 * Returns { user, token, profile } (password never returned).
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { hashPassword } from '../utils/hash.js';

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role || 'USER' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const v = body[f];
    return v === undefined || v === null || String(v).trim() === '';
  });
  return missing;
}

function parseSpecialty(value) {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

/* ---------------------------------------------
   🩺 DOCTOR SIGNUP
   Body: { name, email, password, specialty?, bio?, fee?, phone? }
--------------------------------------------- */
router.post('/doctor', async (req, res) => {
  try {
    const missing = requireFields(req.body, ['name', 'email', 'password']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name).trim();
    const password = String(req.body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await hashPassword(password);
    const specialty = parseSpecialty(req.body.specialty);
    const fee = req.body.fee != null && req.body.fee !== '' ? Number(req.body.fee) : 3000;

    const result = await prisma.$transaction(async (db) => {
      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: 'DOCTOR',
        },
      });

      const doctor = await db.doctor.create({
        data: {
          name,
          userId: user.id,
          specialty,
          bio: req.body.bio ? String(req.body.bio).trim() : null,
          fee: Number.isFinite(fee) ? fee : 3000,
          workDays: Array.isArray(req.body.workDays) ? req.body.workDays : [],
          picture: req.body.picture || null,
        },
      });

      return { user, doctor };
    });

    const token = generateToken(result.user);
    res.status(201).json({
      user: safeUser(result.user),
      token,
      profile: result.doctor,
      message: 'Doctor account created. You can sign in on the doctor app or portal.',
    });
  } catch (err) {
    console.error('Doctor signup error:', err);
    res.status(500).json({ error: 'Doctor signup failed', detail: err.message });
  }
});

/* ---------------------------------------------
   🏥 HOSPITAL SIGNUP
   Body: { name, email, password, address, phone?, specialty?, fee? }
   name = hospital name (also used for staff display name unless staffName given)
--------------------------------------------- */
router.post('/hospital', async (req, res) => {
  try {
    const missing = requireFields(req.body, ['name', 'email', 'password', 'address']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const email = normalizeEmail(req.body.email);
    const hospitalName = String(req.body.name).trim();
    const staffName = String(req.body.staffName || hospitalName).trim();
    const password = String(req.body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await hashPassword(password);
    const specialty = parseSpecialty(req.body.specialty);
    const fee = req.body.fee != null && req.body.fee !== '' ? Number(req.body.fee) : 5000;

    const result = await prisma.$transaction(async (db) => {
      const user = await db.user.create({
        data: {
          name: staffName,
          email,
          password: hashed,
          role: 'HOSPITAL',
        },
      });

      let hospital;
      try {
        hospital = await db.hospital.create({
          data: {
            name: hospitalName,
            address: String(req.body.address).trim(),
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
            specialty,
            fee: Number.isFinite(fee) ? fee : 5000,
            staffUserId: user.id,
          },
        });
      } catch (e) {
        // Schema without fee / staffUserId
        hospital = await db.hospital.create({
          data: {
            name: hospitalName,
            address: String(req.body.address).trim(),
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
            specialty,
          },
        });
        try {
          hospital = await db.hospital.update({
            where: { id: hospital.id },
            data: { staffUserId: user.id },
          });
        } catch (_) {}
      }

      return { user, hospital };
    });

    const token = generateToken(result.user);
    res.status(201).json({
      user: safeUser(result.user),
      token,
      profile: result.hospital,
      message: 'Hospital account created. Sign in on the desktop Hospital Portal.',
    });
  } catch (err) {
    console.error('Hospital signup error:', err);
    res.status(500).json({ error: 'Hospital signup failed', detail: err.message });
  }
});

/* ---------------------------------------------
   🧪 LAB SIGNUP
   Body: { name, email, password, address, services?, phone?, fee? }
--------------------------------------------- */
router.post('/lab', async (req, res) => {
  try {
    const missing = requireFields(req.body, ['name', 'email', 'password', 'address']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const email = normalizeEmail(req.body.email);
    const labName = String(req.body.name).trim();
    const staffName = String(req.body.staffName || labName).trim();
    const password = String(req.body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await hashPassword(password);
    const services = req.body.services
      ? String(req.body.services).trim()
      : 'General laboratory services';
    const fee = req.body.fee != null && req.body.fee !== '' ? Number(req.body.fee) : 8000;

    const result = await prisma.$transaction(async (db) => {
      const user = await db.user.create({
        data: {
          name: staffName,
          email,
          password: hashed,
          role: 'LAB',
        },
      });

      let lab;
      try {
        lab = await db.lab.create({
          data: {
            name: labName,
            address: String(req.body.address).trim(),
            services,
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
            fee: Number.isFinite(fee) ? fee : 8000,
            staffUserId: user.id,
          },
        });
      } catch (e) {
        lab = await db.lab.create({
          data: {
            name: labName,
            address: String(req.body.address).trim(),
            services,
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
          },
        });
        try {
          lab = await db.lab.update({
            where: { id: lab.id },
            data: { staffUserId: user.id },
          });
        } catch (_) {}
      }

      return { user, lab };
    });

    const token = generateToken(result.user);
    res.status(201).json({
      user: safeUser(result.user),
      token,
      profile: result.lab,
      message: 'Lab account created. Sign in on the desktop Lab Portal.',
    });
  } catch (err) {
    console.error('Lab signup error:', err);
    res.status(500).json({ error: 'Lab signup failed', detail: err.message });
  }
});

/* ---------------------------------------------
   💊 PHARMACY SIGNUP
   Body: { name, email, password, address, phone? }
--------------------------------------------- */
router.post('/pharmacy', async (req, res) => {
  try {
    const missing = requireFields(req.body, ['name', 'email', 'password', 'address']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const email = normalizeEmail(req.body.email);
    const pharmacyName = String(req.body.name).trim();
    const staffName = String(req.body.staffName || pharmacyName).trim();
    const password = String(req.body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await hashPassword(password);

    const result = await prisma.$transaction(async (db) => {
      const user = await db.user.create({
        data: {
          name: staffName,
          email,
          password: hashed,
          role: 'PHARMACY',
        },
      });

      let pharmacy;
      try {
        pharmacy = await db.pharmacy.create({
          data: {
            name: pharmacyName,
            address: String(req.body.address).trim(),
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
            staffUserId: user.id,
          },
        });
      } catch (e) {
        pharmacy = await db.pharmacy.create({
          data: {
            name: pharmacyName,
            address: String(req.body.address).trim(),
            phone: req.body.phone ? String(req.body.phone).trim() : null,
            email,
          },
        });
        try {
          pharmacy = await db.pharmacy.update({
            where: { id: pharmacy.id },
            data: { staffUserId: user.id },
          });
        } catch (_) {}
      }

      return { user, pharmacy };
    });

    const token = generateToken(result.user);
    res.status(201).json({
      user: safeUser(result.user),
      token,
      profile: result.pharmacy,
      message: 'Pharmacy account created.',
    });
  } catch (err) {
    console.error('Pharmacy signup error:', err);
    res.status(500).json({ error: 'Pharmacy signup failed', detail: err.message });
  }
});

export default router;
