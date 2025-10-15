const express = require('express');
const router = express.Router();
const { createTrip, editTrip } = require('../controllers/tripController');
const { protect, permit } = require('../middleware/authMiddleware');

// Trip management routes - Event Office / Admin
router.post('/', protect, permit('Event Office', 'Admin'), createTrip);
router.put('/:id', protect, permit('Event Office', 'Admin'), editTrip);

module.exports = router;
