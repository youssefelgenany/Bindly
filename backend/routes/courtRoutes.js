const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  getAllCourts,
  getCourtAvailability,
  bookCourt,
  getMyBookings,
  cancelBooking,
  getAllBookings,
  updateBookingStatus
} = require('../controllers/courtController');

// Public routes
router.get('/', getAllCourts);
router.get('/:courtId/availability/:date', getCourtAvailability);

// Protected routes for students, staff, TA
router.post('/book', protect, permit('Student', 'Staff', 'TA'), bookCourt);
router.get('/my-bookings', protect, permit('Student', 'Staff', 'TA'), getMyBookings);
router.patch('/bookings/:bookingId/cancel', protect, permit('Student', 'Staff', 'TA'), cancelBooking);

// Admin routes
router.get('/admin/all-bookings', protect, permit('admin', 'Admin', 'event_office', 'Event Office', 'Events Office'), getAllBookings);
router.patch('/admin/bookings/:bookingId/status', protect, permit('admin', 'Admin', 'event_office', 'Event Office', 'Events Office'), updateBookingStatus);

module.exports = router;
