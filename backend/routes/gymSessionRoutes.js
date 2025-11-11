const express = require('express');
const router = express.Router();
const {
  createGymSession,
  getAllGymSessions,
  getGymSessionById,
  updateGymSession,
  deleteGymSession,
  registerForGymSession,
  getMyGymRegistrations,
  cancelGymRegistration,
  getGymSessionRegistrations
} = require('../controllers/gymSessionController');
const { protect, permit } = require('../middleware/authMiddleware');

// Create a new gym session (Event Office, Admin)
router.post('/', protect, permit('event_office', 'admin'), createGymSession);

// Get all gym sessions (all authenticated users)
router.get('/', protect, getAllGymSessions);

// Get user's gym session registrations (must be before /:id route)
router.get('/my/registrations', protect, getMyGymRegistrations);

// Get gym session by ID (all authenticated users)
router.get('/:id', protect, getGymSessionById);

// Update gym session (Event Office, Admin, or creator)
router.put('/:id', protect, updateGymSession);

// Delete gym session (Event Office, Admin, or creator)
router.delete('/:id', protect, deleteGymSession);

// Register for a gym session (Students, Staff, TA, Professors)
router.post('/:id/register', protect, registerForGymSession);

// Cancel gym session registration
router.delete('/:id/register', protect, cancelGymRegistration);

// Get all registrations for a gym session (Admin, Event Office)
router.get('/:id/registrations', protect, getGymSessionRegistrations);

module.exports = router;
