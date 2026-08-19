import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

const getId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const findById = (model, label) => async (req, res) => {
  const id = getId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: `Invalid ${label} ID` });

  const item = await prisma[model].findUnique({ where: { id } });
  if (!item) return res.status(404).json({ success: false, message: `${label} not found` });

  res.json({ success: true, data: item });
};

router.get('/doctor/:id', findById('doctor', 'Doctor'));
router.get('/hospital/:id', findById('hospital', 'Hospital'));
router.get('/lab/:id', findById('lab', 'Lab'));
router.get('/pharmacy/:id', findById('pharmacy', 'Pharmacy'));

export default router;
