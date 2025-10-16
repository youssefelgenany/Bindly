const express = require('express');
const { viewUpcomingEvents, applyToEvent, getParticipants } = require('../controllers/vendorController.js');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/events/upcoming', protect, viewUpcomingEvents); // ?type=bazaar or booth
router.post('/apply', protect, applyToEvent); // Requires eventType (bazaar/booth) in body
router.get('/participants', protect, getParticipants); // ?type=bazaar|booth&id=EVENT_ID

module.exports = router;