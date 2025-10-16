const express = require('express');
const { viewUpcomingEvents, applyToEvent, getParticipants } = require('../controllers/vendorController.js');
<<<<<<< HEAD
const { protect, permit } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Publicly list upcoming events for vendors to browse
router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth

// Applying to an event requires authenticated Vendor
router.post('/apply', protect, permit('Vendor'), applyToEvent); // Requires eventType (bazaar/booth) in body

// Participants list is admin/events office only in many apps, but if intended for vendors viewing their own
// applications, keep it protected; adjust permit if needed elsewhere
=======
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/events/upcoming', protect, viewUpcomingEvents); // ?type=bazaar or booth
router.post('/apply', protect, applyToEvent); // Requires eventType (bazaar/booth) in body
>>>>>>> 37c1f91 (event office frontend)
router.get('/participants', protect, getParticipants); // ?type=bazaar|booth&id=EVENT_ID

module.exports = router;