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
// Students only can book courts
router.post('/book', protect, permit('Student'), bookCourt);
router.get('/my-bookings', protect, getMyBookings);
router.put('/bookings/:bookingId/cancel', protect, cancelBooking);

module.exports = router;
