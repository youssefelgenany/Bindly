import express from 'express';
import { viewUpcomingEvents, applyToEvent, viewAllRequests } from '../controllers/vendorController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/events/upcoming', auth, viewUpcomingEvents); // ?type=bazaar or booth
router.post('/apply', auth, applyToEvent); // Requires eventType (bazaar/booth) in body
router.get('/requests', auth, viewAllRequests); // Single endpoint for homepage display

export default router;