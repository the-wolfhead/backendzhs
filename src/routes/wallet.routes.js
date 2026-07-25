// src/routes/wallet.routes.js
//
// This file was corrupted — it was a dangling code fragment (a refund block
// not wrapped in any route handler, no imports for prisma/express, and
// `module.exports = router` used inside an ESM project ("type": "module" in
// package.json), which throws `ReferenceError: module is not defined`.
// Rewritten as valid, schema-correct routes.
import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/* ================================
   📍 Get wallet balance
================================== */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    res.json({ balance: wallet ? Number(wallet.balance) : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

/* ================================
   📍 Get transaction history
================================== */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/* ================================
   💸 Refund a transaction
================================== */
router.post('/refund/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const orig = await prisma.transaction.findUnique({
      where: { id: req.params.transactionId },
    });

    if (!orig) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (orig.status === 'REFUNDED') {
      return res.status(400).json({ error: 'Transaction already refunded' });
    }

    const refundAmount = orig.amount;

    const refundTx = await prisma.transaction.create({
      data: {
        userId: orig.userId,
        type: 'REFUND',
        channel: 'WALLET',
        amount: refundAmount,
        currency: orig.currency,
        status: 'SUCCESS',
        reference: `wallet_refund_${orig.id}_${Date.now()}`,
        meta: { reason, originalTransaction: orig.id },
      },
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: orig.userId } });
    if (!wallet) {
      await prisma.wallet.create({ data: { userId: orig.userId, balance: refundAmount } });
    } else {
      await prisma.wallet.update({
        where: { userId: orig.userId },
        data: { balance: { increment: refundAmount } },
      });
    }

    await prisma.transaction.update({
      where: { id: orig.id },
      data: { status: 'REFUNDED' },
    });

    return res.json({ ok: true, refundTx });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ================================
   🔔 Paystack webhook
   NOTE: verify the Paystack signature (x-paystack-signature header) before
   trusting this payload in production — that check is not implemented here.
================================== */
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    if (!event.event) return res.status(400).send('no event');

    if (event.event === 'charge.success' || event.event === 'transaction.success') {
      const data = event.data;
      const reference = data.reference;
      const amount = BigInt(data.amount);

      const tx = await prisma.transaction.findUnique({ where: { reference } });

      if (tx && tx.status !== 'SUCCESS') {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'SUCCESS', paystackResponse: data },
        });

        const wallet = await prisma.wallet.findUnique({ where: { userId: tx.userId } });
        if (!wallet) {
          await prisma.wallet.create({ data: { userId: tx.userId, balance: amount } });
        } else {
          await prisma.wallet.update({
            where: { userId: tx.userId },
            data: { balance: { increment: amount } },
          });
        }
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error', err);
    return res.status(500).send('error');
  }
});

export default router;
