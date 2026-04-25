// lib/paystack.js
const axios = require('axios');
require('dotenv').config();
const PAYSTACK_BASE = 'https://api.paystack.co';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;


if (!PAYSTACK_SECRET) {
console.warn('Paystack secret not set in env. Set PAYSTACK_SECRET');
}


const paystack = axios.create({
baseURL: PAYSTACK_BASE,
headers: {
Authorization: `Bearer ${PAYSTACK_SECRET}`,
'Content-Type': 'application/json',
},
timeout: 15000,
});


async function initializeTransaction({ amountKobo, email, reference, channels }) {
// amount in kobo
const body = {
amount: Number(amountKobo),
email,
reference,
};
if (channels && Array.isArray(channels)) body.channels = channels; // e.g. ["card", "ussd", "bank"]


const res = await paystack.post('/transaction/initialize', body);
return res.data;
}


async function verifyTransaction(reference) {
const res = await paystack.get(`/transaction/verify/${encodeURIComponent(reference)}`);
return res.data;
}


async function createRefund({ transaction }) {
// Note: per requirement, refunds should be credited to user's wallet instead of Paystack refunding.
// This helper is available if you also want to initiate external refunds.
const res = await paystack.post('/refund', { transaction });
return res.data;
}


module.exports = { initializeTransaction, verifyTransaction, createRefund };