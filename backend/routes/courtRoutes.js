const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  getAllCourts,
  getCourtAvailability,
  bookCourt,
  getMyBookings,
  cancelBooking
} = require('../controllers/courtController');

// Public routes
router.get('/', getAllCourts);
router.get('/:courtId/availability/:date', getCourtAvailability);

// Protected routes - require authentication
router.post('/book', protect, bookCourt);
router.get('/my-bookings', protect, getMyBookings);
router.put('/bookings/:bookingId/cancel', protect, cancelBooking);

module.exports = router;
