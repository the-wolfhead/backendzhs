// src/routes/admin.dashboard.routes.js
//
// Routes for the admin dashboard (separate concern from the existing
// src/routes/admin.routes.js, which only handled Paystack-wallet
// reconciliation logs).
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole, ANY_STAFF } from '../middleware/roleMiddleware.js';
import {
  getStats,
  listUsers,
  getUserDetail,
  updateUserRole,
  listAppointments,
  updateAppointment,
  deleteAppointment,
  regenerateVideoCallLink,
  listDoctorsAdmin,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Every route here requires SOME staff role, on top of the more specific
// checks per-route below.
router.use(authenticateToken, requireRole(...ANY_STAFF));

router.get('/stats', getStats);

router.get('/users', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listUsers);
router.get('/users/:id', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), getUserDetail);
router.patch('/users/:id/role', requireRole('SUPER_ADMIN'), updateUserRole);

router.get('/appointments', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listAppointments);
router.patch('/appointments/:id', requireRole('SUPER_ADMIN', 'CUSTOMER_CARE'), updateAppointment);
router.delete('/appointments/:id', requireRole('SUPER_ADMIN'), deleteAppointment);
router.post('/appointments/:id/regenerate-video-call', requireRole('SUPER_ADMIN', 'TECH_SUPPORT'), regenerateVideoCallLink);

router.get('/doctors', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listDoctorsAdmin);
router.post('/doctors', requireRole('SUPER_ADMIN'), createDoctor);
router.patch('/doctors/:id', requireRole('SUPER_ADMIN'), updateDoctor);
router.delete('/doctors/:id', requireRole('SUPER_ADMIN'), deleteDoctor);

export default router;
