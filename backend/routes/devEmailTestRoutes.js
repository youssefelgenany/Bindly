const express = require('express');
const router = express.Router();
const { sendVerificationEmail } = require('../utils/mailer');
const { sendReceiptEmail } = require('../utils/sendReceiptEmail');
const { sendVendorRequestStatusEmail } = require('../utils/sendVendorRequestStatusEmail');

// Dev-only test route to send different types of emails and return result
router.get('/send-test-email', async (req, res) => {
  const to = req.query.to || process.env.SMTP_USER || 'dev@example.com';
  const type = (req.query.type || 'verification').toLowerCase();

  try {
    if (type === 'verification') {
      const token = req.query.token || 'dev-verification-token';
      const name = req.query.name || 'Dev User';
      const result = await sendVerificationEmail(to, token, name);
      return res.json({ ok: true, type: 'verification', result });
    }

    if (type === 'receipt') {
      const name = req.query.name || 'Dev User';
      const eventTitle = req.query.eventTitle || 'Dev Event';
      const amount = Number(req.query.amount || 10);
      const paymentMethod = req.query.paymentMethod || 'card';
      const date = req.query.date || new Date().toISOString();
      const receiptDetails = {};
      const result = await sendReceiptEmail(to, name, eventTitle, amount, paymentMethod, date, receiptDetails);
      return res.json({ ok: true, type: 'receipt', result });
    }

    if (type === 'vendor') {
      const vendor = {
        email: to,
        firstName: req.query.name || 'Dev Vendor',
        companyName: req.query.companyName || 'DevCo'
      };
      const request = {
        eventType: 'bazaar',
        bazaar: { title: req.query.eventTitle || 'Dev Bazaar' },
        participationFee: Number(req.query.amount || 100),
        paymentDeadline: new Date().toISOString()
      };
      const status = req.query.status || 'accepted';
      const result = await sendVendorRequestStatusEmail(vendor, request, status);
      return res.json({ ok: true, type: 'vendor', result });
    }

    return res.status(400).json({ ok: false, error: 'unknown type; use ?type=verification|receipt|vendor' });
  } catch (error) {
    console.error('❌ Dev send-test-email error:', error);
    return res.status(500).json({ ok: false, error: error.message, stack: error.stack });
  }
});

module.exports = router;
