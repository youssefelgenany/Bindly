const express = require('express');
const router = express.Router();
const {
  registerStudentForEvent,
  getEventRegistrations,
  getAllStudentRegistrations,
  getStudentRegistrationsByEmail
} = require('../controllers/studentRegistrationController');

const { protect, permit } = require('../middleware/authMiddleware');

// ================== STUDENT REGISTRATION ROUTES ==================

// Register a student for a workshop or trip (public - no auth required)
router.post('/:eventId/register', registerStudentForEvent);

// Get student registrations by userId (protected - requires authentication)
router.get('/my-registrations', protect, getStudentRegistrationsByEmail);

// Get registrations for a specific event (protected - for event organizers)
router.get('/:eventId/registrations', protect, getEventRegistrations);

// Get all student registrations (admin only)
router.get('/admin/all', protect, permit('admin'), getAllStudentRegistrations);

module.exports = router;
