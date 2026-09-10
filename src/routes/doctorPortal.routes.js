import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission, requireRole } from '../middleware/roleMiddleware.js';
import { requireDoctorProfile } from '../middleware/requireDoctorProfile.js';
import { requireFacilityAccess } from '../middleware/requireFacilityAccess.js';
import {
  getMyProfile,
  updateMyProfile,
  setOnlineStatus,
  getMyAppointments,
  updateMyAppointmentStatus,
  getFacilityAppointments,
  updateFacilityAppointment,
  uploadMyAppointmentResult,
} from '../controllers/doctorPortal.controller.js';

const router = express.Router();

const doctorOnly = [
  authenticateToken,
  requirePermission('doctor.profile'),
  requireDoctorProfile,
];

router.get('/profile', ...doctorOnly, getMyProfile);
router.patch('/profile', ...doctorOnly, updateMyProfile);
router.patch('/online', ...doctorOnly, setOnlineStatus);
router.get('/appointments', ...doctorOnly, getMyAppointments);
router.patch('/appointments/:id', ...doctorOnly, updateMyAppointmentStatus);
router.post('/appointments/:id/results', ...doctorOnly, uploadMyAppointmentResult);

const facilityAccess = [authenticateToken, requireFacilityAccess];

router.get('/facility-appointments', ...facilityAccess, getFacilityAppointments);
router.patch('/facility-appointments/:id', ...facilityAccess, updateFacilityAppointment);

export default router;
