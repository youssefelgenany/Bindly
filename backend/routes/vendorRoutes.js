const express = require('express');
const {
  viewUpcomingEvents,
  applyToEvent,
  getParticipants,
  getMyAcceptedUpcoming,
  getMyRequests,
  getLoyaltyProgramVendors,
  getAllVendors
} = require('../controllers/vendorController.js');
const {
  downloadVendorDocument,
  listVendorDocuments
} = require('../controllers/vendorDocumentController.js');
const { protect, permit } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Publicly list upcoming events for vendors to browse
router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth

// Loyalty program vendors list (requires authenticated campus community roles)
router.get(
  '/loyalty-program/vendors',
  protect,
  permit(
    'Student',
    'admin',
    'Professor',
    'Staff',
    'TA',
    'event_office',
    'Event Office',
    'Events Office'
  ),
  getLoyaltyProgramVendors
);

// List all available documents for a vendor (Events Office / Admin only)
router.get(
  '/:vendorId/documents',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  listVendorDocuments
);

// Download vendor document (tax card, logo, or individual IDs) - Events Office / Admin only
router.get(
  '/:vendorId/documents/:documentType',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  downloadVendorDocument
);

// Applying to an event requires authenticated Vendor
router.post('/apply', protect, permit('Vendor'), applyToEvent); // Requires eventType (bazaar/booth) in body

// Participants list (protected)
router.get('/participants', protect, getParticipants); // ?type=bazaar|booth&id=EVENT_ID

// Vendor's accepted upcoming events (bazaar/booth)
router.get('/my/upcoming', protect, permit('Vendor'), getMyAcceptedUpcoming); // optional ?type=bazaar|booth

// Vendor's pending/rejected upcoming requests
router.get('/my/requests', protect, permit('Vendor'), getMyRequests); // ?status=pending|rejected & optional ?type=bazaar|booth

// Get all vendors (for admin/events office to get vendor IDs) - must be last to avoid route conflicts
router.get(
  '/',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  getAllVendors
);

module.exports = router;