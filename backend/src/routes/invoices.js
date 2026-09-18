import { Router } from 'express';
import { createInvoice, getInvoice, listInvoices, computeInvoice } from '../lib/invoices.js';

const router = Router();

/** Live totals while the bill is being built, without saving anything. */
router.post('/preview', (req, res) => {
  res.json(computeInvoice(req.body || {}));
});

router.post('/', async (req, res, next) => {
  try {
    const invoice = await createInvoice({ ...req.body, createdBy: req.user?.name || '' });
    res.status(201).json(invoice);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ invoices: await listInvoices(Number(req.query.limit) || 50) });
  } catch (err) {
    next(err);
  }
});

router.get('/:number', async (req, res, next) => {
  try {
    const invoice = await getInvoice(req.params.number);
    if (!invoice) return res.status(404).json({ error: 'No such bill.' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

export default router;
