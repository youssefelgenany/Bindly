const express = require('express');
const router = express.Router();
const {
  getAllVendorRequests,
  getVendorRequestById,
  updateVendorRequestStatus
} = require('../controllers/vendorRequestController');

// Route to get all vendor requests
router.get('/', getAllVendorRequests);

// Route to get a single vendor request by ID
router.get('/:id', getVendorRequestById);

// Route to update vendor request status (accept/reject)
router.patch('/:id/status', updateVendorRequestStatus);

module.exports = router;

