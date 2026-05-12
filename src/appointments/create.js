// src/appointments/create.js
import prisma from '../prismaClient.js';   // or your prisma config

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

    // Special handling for payments coming from payment gateway
    const isFromPayment = source === "PAYMENT_GATEWAY";

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        doctorId,
        patientName: patientName || "Self",
        date: new Date(date),
        time,
        amount: fee ? parseFloat(fee) : null,
        paymentReference,
        paymentStatus: isFromPayment ? "PAID" : "PENDING",
        status: isFromPayment ? "CONFIRMED" : "PENDING",   // Auto-confirm if paid
        source,
        metadata,
      },
      include: {
        doctor: true,
        user: true,
      }
    });

    return res.status(201).json({
      success: true,
      message: isFromPayment ? "Appointment booked and confirmed" : "Appointment created",
      appointment
    });

  } catch (error) {
    console.error("Appointment creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create appointment"
    });
  }
};
