const express = require('express');
const { viewUpcomingEvents, applyToEvent, getParticipants } = require('../controllers/vendorController.js');
const { protect, permit } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Publicly list upcoming events for vendors to browse
router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth

// Applying to an event requires authenticated Vendor
router.post('/apply', protect, permit('Vendor'), applyToEvent); // Requires eventType (bazaar/booth) in body

// Participants list (protected)
router.get('/participants', protect, getParticipants); // ?type=bazaar|booth&id=EVENT_ID

module.exports = router;