const express = require('express');
const router = express.Router();
const { createBazaar, editBazaar, getAllBazaars, registerForBazaar } = require('../controllers/bazaarController');
const { protect, permit } = require('../middleware/authMiddleware');

// Get all bazaars (for users to browse)
router.get('/', protect, getAllBazaars);

// Register for a bazaar
router.post('/:id/register', protect, registerForBazaar);

// Bazaar management routes - Event Office / Admin
router.post('/', protect, permit('event_office', 'admin'), createBazaar);
router.put('/:id', protect, permit('event_office', 'admin'), editBazaar);

module.exports = router;
