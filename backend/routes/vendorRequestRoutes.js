const express = require('express');
const router = express.Router();
const {
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus
} = require('../controllers/vendorRequestController');
const { protect, permit } = require('../middleware/authMiddleware');

// Route to create a new vendor request - Vendor
router.post('/', protect, permit('vendor'), createVendorRequest);

// Route to get all vendor requests - Events Office / Admin
router.get('/', protect, permit('event_office', 'admin'), getAllVendorRequests);

// Route to get a single vendor request by ID - Events Office / Admin
router.get('/:id', protect, permit('event_office', 'admin'), getVendorRequestById);

// Route to update vendor request status (accept/reject) - Events Office / Admin
router.patch('/:id/status', protect, permit('event_office', 'admin'), updateVendorRequestStatus);

module.exports = router;

