const express = require('express');
const { viewUpcomingEvents, applyToEvent, getParticipants } = require('../controllers/vendorController.js');

const router = express.Router();

router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth
router.post('/apply', applyToEvent); // Requires eventType (bazaar/booth) in body
router.get('/participants', getParticipants); // ?type=bazaar|booth&id=EVENT_ID

module.exports = router;