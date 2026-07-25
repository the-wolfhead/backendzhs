// src/appointments/create.js
import prisma from '../prismaClient.js';
import { buildVideoCallUrl } from '../utils/videoCall.js';

export const createAppointment = async (req, res) => {
  try {
    const {
      userId,
      doctorId,
      patientName,
      date,
      time,
      fee,
      paymentReference,
      source = "DIRECT",
      metadata = {}
    } = req.body;

    if (!userId || !doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'userId, doctorId, date and time are required',
      });
    }

    // Special handling for payments coming from payment gateway
    const isFromPayment = source === "PAYMENT_GATEWAY";

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        doctorId: Number(doctorId),
        patientName: patientName || "Self",
        date: new Date(date),
        time,
        amount: fee ? parseFloat(fee) : null,
        paymentReference: paymentReference || undefined,
        paymentStatus: isFromPayment ? "PAID" : "PENDING",
        status: isFromPayment ? "confirmed" : "pending",   // Auto-confirm if paid
        source,
        metadata,
        // Placeholder — replaced immediately below once we have the real id.
        // Appointment.videoCallUrl is NOT NULL, so it must be set here first.
        videoCallUrl: "pending",
      },
    });

    // Now that we have the DB id, generate the real, permanent video-call
    // room for this appointment (same scheme the mobile app already derives
    // client-side — see src/utils/videoCall.js).
    const appointmentWithCall = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { videoCallUrl: buildVideoCallUrl(appointment.id) },
      include: {
        doctor: true,
        user: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: isFromPayment ? "Appointment booked and confirmed" : "Appointment created",
      appointment: appointmentWithCall,
    });

  } catch (error) {
    console.error("Appointment creation error:", error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'An appointment with this payment reference already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create appointment"
    });
  }
};
