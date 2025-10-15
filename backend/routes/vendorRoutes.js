const express = require('express');
const { viewUpcomingEvents, applyToEvent } = require('../controllers/vendorController.js');

const router = express.Router();

router.get('/events/upcoming', viewUpcomingEvents); // ?type=bazaar or booth
router.post('/apply', applyToEvent); // Requires eventType (bazaar/booth) in body

module.exports = router;