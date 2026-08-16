// src/middleware/requireDoctorProfile.js
//
// Use after authenticateToken + requireRole('DOCTOR'). Attaches the
// requesting doctor's own Doctor row as req.doctor, so route handlers never
// have to trust a doctorId from the request body/params — they always act
// on whichever Doctor row is actually linked to the logged-in account.
import prisma from '../prismaClient.js';

export const requireDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });

    if (!doctor) {
      return res.status(404).json({
        error: 'No doctor profile is linked to this account. Contact an admin to finish onboarding.',
      });
    }

    req.doctor = doctor;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve doctor profile' });
  }
};
