const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  getCourtsForStudents,
  getCourtById,
  getCourtsByType
} = require('../controllers/courtController');

// Public routes
router.get('/', getCourtsForStudents);
router.get('/:courtId', getCourtById);
router.get('/type/:type', getCourtsByType);

module.exports = router;
