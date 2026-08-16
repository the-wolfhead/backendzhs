// src/routes/doctorPortal.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { requireDoctorProfile } from '../middleware/requireDoctorProfile.js';
import {
  getMyProfile,
  updateMyProfile,
  setOnlineStatus,
  getMyAppointments,
  updateMyAppointmentStatus,
} from '../controllers/doctorPortal.controller.js';

const router = express.Router();

router.use(authenticateToken, requireRole('DOCTOR'), requireDoctorProfile);

router.get('/profile', getMyProfile);
router.patch('/profile', updateMyProfile);
router.patch('/online', setOnlineStatus);
router.get('/appointments', getMyAppointments);
router.patch('/appointments/:id', updateMyAppointmentStatus);

export default router;
