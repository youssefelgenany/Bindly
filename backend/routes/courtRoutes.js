const express = require('express');
const router = express.Router();
const {
  getCourtsForStudents,
  getCourtById,
  getCourtsByType
} = require('../controllers/courtController');

const { protect, permit } = require('../middleware/authMiddleware');

// ================== COURT ROUTES ==================

// Get all courts for students
router.get('/student', protect, permit('Student'), getCourtsForStudents);

// Get court by ID
router.get('/:courtId', protect, permit('Student'), getCourtById);

// Get courts by type
router.get('/type/:type', protect, permit('Student'), getCourtsByType);

module.exports = router;
