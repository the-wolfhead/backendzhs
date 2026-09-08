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
router.post('/doctors/:id/credentials', requireRole('SUPER_ADMIN'), provisionDoctorCredentials);

router.get('/hospitals', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listHospitalsAdmin);
router.post('/hospitals', requireRole('SUPER_ADMIN'), createHospital);
router.patch('/hospitals/:id', requireRole('SUPER_ADMIN'), updateHospital);
router.delete('/hospitals/:id', requireRole('SUPER_ADMIN'), deleteHospital);

router.get('/labs', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listLabsAdmin);
router.post('/labs', requireRole('SUPER_ADMIN'), createLab);
router.patch('/labs/:id', requireRole('SUPER_ADMIN'), updateLab);
router.delete('/labs/:id', requireRole('SUPER_ADMIN'), deleteLab);

router.get('/pharmacies', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'AUDITOR'), listPharmaciesAdmin);
router.post('/pharmacies', requireRole('SUPER_ADMIN'), createPharmacy);
router.patch('/pharmacies/:id', requireRole('SUPER_ADMIN'), updatePharmacy);
router.delete('/pharmacies/:id', requireRole('SUPER_ADMIN'), deletePharmacy);

router.get('/transactions', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'), listTransactionsAdmin);
router.get('/transactions/:reference', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'CUSTOMER_CARE', 'FINANCE', 'AUDITOR'), getTransactionAdmin);
router.post('/transactions/:reference/mark-failed', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'FINANCE'), markTransactionFailed);
router.post('/transactions/:reference/retry', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'FINANCE'), retryTransactionAdmin);

router.get('/reconciliation', requireRole('SUPER_ADMIN', 'TECH_SUPPORT', 'FINANCE', 'AUDITOR'), listReconciliationAdmin);
router.get('/accounts', requireRole('SUPER_ADMIN', 'FINANCE', 'AUDITOR'), listAccountsAdmin);

export default router;
