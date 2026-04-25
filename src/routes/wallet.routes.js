// routes/wallet.routes.js


// amount to refund = orig.amount
const refundAmount = orig.amount;


// create refund transaction
const refundTx = await prisma.transaction.create({ data: {
userId: orig.userId,
type: 'REFUND',
channel: 'WALLET',
amount: refundAmount,
currency: orig.currency,
status: 'SUCCESS',
reference: `wallet_refund_${orig.id}_${Date.now()}_${uuidv4().slice(0,8)}`,
meta: { reason, originalTransaction: orig.id },
}});


// credit wallet
let wallet = await prisma.wallet.findUnique({ where: { userId: orig.userId } });
if (!wallet) wallet = await prisma.wallet.create({ data: { userId: orig.userId, balance: refundAmount } });
else await prisma.wallet.update({ where: { userId: orig.userId }, data: { balance: { increment: refundAmount } } });


// mark original as REFUNDED
await prisma.transaction.update({ where: { id: orig.id }, data: { status: 'REFUNDED' } });


return res.json({ ok: true, refundTx });
} catch (err) {
console.error(err);
return res.status(500).json({ error: 'Server error' });
}
});


// Paystack webhook endpoint (to be configured in Paystack dashboard)
// Use this to securely confirm payments server-side. Be sure to validate signature in production.
router.post('/webhook', express.json(), async (req, res) => {
/*
Paystack will POST webhook events here. Verify signature using PAYSTACK_SECRET.
For simplicity we'll just process transaction.success events and credit wallets.
*/
try {
const event = req.body;
// Basic guard: ensure event.event exists
if (!event.event) return res.status(400).send('no event');


if (event.event === 'charge.success' || event.event === 'transaction.success') {
const data = event.data;
const reference = data.reference;
const amount = BigInt(data.amount);
// Find local transaction by reference
const tx = await prisma.transaction.findUnique({ where: { reference } });
if (tx && tx.status !== 'SUCCESS') {
await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'SUCCESS', paystackResponse: data } });
// credit wallet
let wallet = await prisma.wallet.findUnique({ where: { userId: tx.userId } });
if (!wallet) await prisma.wallet.create({ data: { userId: tx.userId, balance: amount } });
else await prisma.wallet.update({ where: { userId: tx.userId }, data: { balance: { increment: amount } } });
}
}


return res.status(200).send('ok');
} catch (err) {
console.error('webhook error', err);
return res.status(500).send('error');
}
});


module.exports = router;