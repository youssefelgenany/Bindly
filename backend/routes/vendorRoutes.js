const express = require('express');
const { viewUpcomingEvents, applyToEvent, getParticipants, getMyAcceptedUpcoming, getMyRequests } = require('../controllers/vendorController.js');
const { protect, permit } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Publicly list upcoming events for vendors to browse
router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth

// Applying to an event requires authenticated Vendor
router.post('/apply', protect, permit('Vendor'), applyToEvent); // Requires eventType (bazaar/booth) in body

// Participants list is admin/events office only in many apps, but if intended for vendors viewing their own
// applications, keep it protected; adjust permit if needed elsewhere
router.get('/participants', protect, getParticipants); // ?type=bazaar|booth&id=EVENT_ID

// Vendor's accepted upcoming events (bazaar/booth)
router.get('/my/upcoming', protect, permit('Vendor'), getMyAcceptedUpcoming); // optional ?type=bazaar|booth

// Vendor's pending/rejected upcoming requests
router.get('/my/requests', protect, permit('Vendor'), getMyRequests); // ?status=pending|rejected & optional ?type=bazaar|booth

module.exports = router;