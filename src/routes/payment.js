import express from "express";
import axios from "axios";
const router = express.Router();

router.post("/paystack/initialize", async (req, res) => {
  const { email, amount } = req.body;
  
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount: amount * 100 }, // convert to kobo
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    res.json({ authorization_url: response.data.data.authorization_url });
  } catch (error) {
    console.log(error.response.data);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

export default router;
