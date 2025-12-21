const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  requestWorkshopEdits,
  getMyEditRequests,
  respondToEditRequest,
  getAllEditRequests,
  updateEditRequestStatus
} = require('../controllers/workshopEditRequestController');

// Events Office: Request edits for workshop
router.post('/request-edits', protect, permit('event_office', 'Event Office', 'Events Office', 'admin', 'Admin'), requestWorkshopEdits);

// Professor: Get edit requests for their workshops
router.get('/my-requests', protect, permit('Professor'), getMyEditRequests);

// Professor: Respond to edit request
router.patch('/:requestId/respond', protect, permit('Professor'), respondToEditRequest);

// Events Office/Admin: Get all edit requests
router.get('/admin/all-requests', protect, permit('event_office', 'Event Office', 'Events Office', 'admin', 'Admin'), getAllEditRequests);

// Events Office/Admin: Update edit request status
router.patch('/admin/:requestId/status', protect, permit('event_office', 'Event Office', 'Events Office', 'admin', 'Admin'), updateEditRequestStatus);

module.exports = router;
