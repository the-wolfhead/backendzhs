// src/routes/admin.dashboard.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission, requireRole, ANY_STAFF } from '../middleware/roleMiddleware.js';
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
  provisionDoctorCredentials,
  listHospitalsAdmin,
  createHospital,
  updateHospital,
  deleteHospital,
  listLabsAdmin,
  createLab,
  updateLab,
  deleteLab,
  listPharmaciesAdmin,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  listTransactionsAdmin,
  getTransactionAdmin,
  markTransactionFailed,
  retryTransactionAdmin,
  listReconciliationAdmin,
  listAccountsAdmin,
  createFacilityStaff,
  provisionHospitalLogin,
  provisionLabLogin,
  getMyPermissions,
  listDoctorCredentials,
  reviewDoctorCredential,
} from '../controllers/admin.controller.js';

const router = express.Router();

// All dashboard routes require a staff role (not patient/doctor/facility).
router.use(authenticateToken, requireRole(...ANY_STAFF));

// ── Overview ───────────────────────────────────────────────────────────────
router.get('/stats', requirePermission('admin.stats.read'), getStats);
router.get('/me/permissions', getMyPermissions);

router.get('/doctor-credentials', requirePermission('admin.doctors.read'), listDoctorCredentials);
router.post(
  '/doctor-credentials/:id/review',
  requirePermission('admin.doctors.write'),
  reviewDoctorCredential
);

// ── Users ──────────────────────────────────────────────────────────────────
router.get('/users', requirePermission('admin.users.read'), listUsers);
router.get('/users/:id', requirePermission('admin.users.read'), getUserDetail);
router.patch('/users/:id/role', requirePermission('admin.users.role.write'), updateUserRole);
router.post('/facility-staff', requirePermission('admin.facility_staff.create'), createFacilityStaff);

// ── Appointments ───────────────────────────────────────────────────────────
router.get('/appointments', requirePermission('admin.appointments.read'), listAppointments);
router.patch('/appointments/:id', requirePermission('admin.appointments.write'), updateAppointment);
router.delete('/appointments/:id', requirePermission('admin.appointments.delete'), deleteAppointment);
router.post(
  '/appointments/:id/regenerate-video-call',
  requirePermission('admin.appointments.video_regen'),
  regenerateVideoCallLink
);

// ── Doctors ────────────────────────────────────────────────────────────────
router.get('/doctors', requirePermission('admin.doctors.read'), listDoctorsAdmin);
router.post('/doctors', requirePermission('admin.doctors.write'), createDoctor);
router.patch('/doctors/:id', requirePermission('admin.doctors.write'), updateDoctor);
router.delete('/doctors/:id', requirePermission('admin.doctors.write'), deleteDoctor);
router.post(
  '/doctors/:id/credentials',
  requirePermission('admin.doctors.credentials'),
  provisionDoctorCredentials
);

// ── Facilities ─────────────────────────────────────────────────────────────
router.get('/hospitals', requirePermission('admin.facilities.read'), listHospitalsAdmin);
router.post('/hospitals', requirePermission('admin.facilities.write'), createHospital);
router.patch('/hospitals/:id', requirePermission('admin.facilities.write'), updateHospital);
router.delete('/hospitals/:id', requirePermission('admin.facilities.write'), deleteHospital);
router.post(
  '/hospitals/:id/credentials',
  requirePermission('admin.facility_staff.create'),
  provisionHospitalLogin
);

router.get('/labs', requirePermission('admin.facilities.read'), listLabsAdmin);
router.post('/labs', requirePermission('admin.facilities.write'), createLab);
router.patch('/labs/:id', requirePermission('admin.facilities.write'), updateLab);
router.delete('/labs/:id', requirePermission('admin.facilities.write'), deleteLab);
router.post(
  '/labs/:id/credentials',
  requirePermission('admin.facility_staff.create'),
  provisionLabLogin
);

router.get('/pharmacies', requirePermission('admin.facilities.read'), listPharmaciesAdmin);
router.post('/pharmacies', requirePermission('admin.facilities.write'), createPharmacy);
router.patch('/pharmacies/:id', requirePermission('admin.facilities.write'), updatePharmacy);
router.delete('/pharmacies/:id', requirePermission('admin.facilities.write'), deletePharmacy);

// ── Finance ────────────────────────────────────────────────────────────────
router.get('/transactions', requirePermission('admin.transactions.read'), listTransactionsAdmin);
router.get(
  '/transactions/:reference',
  requirePermission('admin.transactions.read'),
  getTransactionAdmin
);
router.post(
  '/transactions/:reference/mark-failed',
  requirePermission('admin.transactions.retry'),
  markTransactionFailed
);
router.post(
  '/transactions/:reference/retry',
  requirePermission('admin.transactions.retry'),
  retryTransactionAdmin
);

router.get('/reconciliation', requirePermission('admin.reconciliation.read'), listReconciliationAdmin);
router.get('/accounts', requirePermission('admin.accounts.read'), listAccountsAdmin);

export default router;
