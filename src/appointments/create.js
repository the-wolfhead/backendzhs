import paystack from "paystack-api";
import crypto from "crypto";
const paystackClient = paystack(process.env.PAYSTACK_SECRET_KEY);

function generateCallRoom() {
  return `https://meet.jit.si/${crypto.randomBytes(8).toString("hex")}`;
}

router.post("/appointments/create", authenticateToken, async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    // Create Paystack payment session
    const payment = await paystackClient.transaction.initialize({
      email: req.user.email,
      amount: doctor.fee * 100, // Paystack uses kobo
      metadata: { doctorId, date, time },
      callback_url: `https://YOUR_APP_URL/paystack-success`
    });

    res.json({ payment_url: payment.data.authorization_url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not create appointment" });
  }
});
