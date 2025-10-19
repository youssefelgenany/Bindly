const express = require('express');
const router = express.Router();
const {
  createGymSession,
  getAllGymSessions,
  getGymSessionById,
  updateGymSession,
  deleteGymSession
} = require('../controllers/gymSessionController');
const { protect, permit } = require('../middleware/authMiddleware');

// Create a new gym session (Event Office, Admin)
router.post('/', protect, permit('event_office', 'admin'), createGymSession);

// Get all gym sessions (all authenticated users)
router.get('/', protect, getAllGymSessions);

// Get gym session by ID (all authenticated users)
router.get('/:id', protect, getGymSessionById);

// Update gym session (Event Office, Admin, or creator)
router.put('/:id', protect, updateGymSession);

// Delete gym session (Event Office, Admin, or creator)
router.delete('/:id', protect, deleteGymSession);

module.exports = router;
