const express = require('express');
const router = express.Router();
const { createTrip, editTrip } = require('../controllers/tripController');
const { protect, permit } = require('../middleware/authMiddleware');

// Trip management routes - Event Office / Admin
router.post('/', protect, permit('event_office', 'admin'), createTrip);
router.put('/:id', protect, permit('event_office', 'admin'), editTrip);

module.exports = router;
