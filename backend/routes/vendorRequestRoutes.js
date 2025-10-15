const express = require('express');
const router = express.Router();
const {
  getAllVendorRequests,
  getVendorRequestById,
  updateVendorRequestStatus
} = require('../controllers/vendorRequestController');
const { protect, permit } = require('../middleware/authMiddleware');

// Route to get all vendor requests - Events Office / Admin
router.get('/', protect, permit('Event Office', 'Admin'), getAllVendorRequests);

// Route to get a single vendor request by ID - Events Office / Admin
router.get('/:id', protect, permit('Event Office', 'Admin'), getVendorRequestById);

// Route to update vendor request status (accept/reject) - Events Office / Admin
router.patch('/:id/status', protect, permit('Event Office', 'Admin'), updateVendorRequestStatus);

module.exports = router;

