// src/appointments/create.js
import prisma from '../prismaClient.js';
import { buildVideoCallUrl } from '../utils/videoCall.js';

export const createAppointment = async (req, res) => {
  try {
    const {
      userId,
      doctorId,
      hospitalId,
      labId,
      type: bodyType,
      service,
      patientName,
      date,
      time,
      fee,
      paymentReference,
      source = "DIRECT",
      metadata = {}
    } = req.body;

    // Infer type if not provided
    let type = (bodyType || "DOCTOR").toUpperCase();
    if (!bodyType) {
      if (hospitalId) type = "HOSPITAL";
      else if (labId) type = "LAB";
      else type = "DOCTOR";
    }

    if (!userId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'userId, date and time are required',
      });
    }

    if (type === "DOCTOR" && !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId is required for doctor appointments',
      });
    }
    if (type === "HOSPITAL" && !hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'hospitalId is required for hospital appointments',
      });
    }
    if (type === "LAB" && !labId) {
      return res.status(400).json({
        success: false,
        message: 'labId is required for lab appointments',
      });
    }

    // Special handling for payments coming from payment gateway
    const isFromPayment = source === "PAYMENT_GATEWAY";

    const data = {
      userId,
      type,
      service: service || null,
      patientName: patientName || "Self",
      date: new Date(date),
      time,
      amount: fee != null ? parseFloat(fee) : null,
      paymentReference: paymentReference || undefined,
      paymentStatus: isFromPayment ? "PAID" : "PENDING",
      status: isFromPayment ? "confirmed" : "pending",
      source,
      metadata,
      videoCallUrl: type === "DOCTOR" ? "pending" : null,
    };

    if (type === "DOCTOR") data.doctorId = Number(doctorId);
    if (type === "HOSPITAL") data.hospitalId = Number(hospitalId);
    if (type === "LAB") data.labId = Number(labId);

    const appointment = await prisma.appointment.create({ data });

    let appointmentWithRelations;
    if (type === "DOCTOR") {
      // Generate video-call room only for doctor appointments
      appointmentWithRelations = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { videoCallUrl: buildVideoCallUrl(appointment.id) },
        include: {
          doctor: true,
          user: true,
          hospital: true,
          lab: true,
        },
      });
    } else {
      appointmentWithRelations = await prisma.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          doctor: true,
          user: true,
          hospital: true,
          lab: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: isFromPayment ? "Appointment booked and confirmed" : "Appointment created",
      appointment: appointmentWithRelations,
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
      message: "Failed to create appointment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
