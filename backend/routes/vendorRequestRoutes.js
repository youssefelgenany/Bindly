const express = require('express');
const router = express.Router();
const {
  getPendingVendorRequestNotifications,
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus,
  voteForVendorRequest,
  removeVote,
  getVendorRequestVotes,
  cancelVendorRequest,
  createBoothPoll,
  getBoothPolls,
  voteInBoothPoll,
  closeBoothPoll,
  getBoothPollResults
} = require('../controllers/vendorRequestController');
const { protect, permit } = require('../middleware/authMiddleware');

// Route to create a new vendor request - Vendor
router.post('/', protect, permit('vendor'), createVendorRequest);

// Route to get all vendor requests - Events Office / Admin
router.get(
  '/',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  getAllVendorRequests
);

// Route to get pending vendor requests notifications - Events Office / Admin
router.get(
  '/pending/notifications',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  getPendingVendorRequestNotifications
);

// Route to get a single vendor request by ID - Events Office / Admin
router.get(
  '/:id',
  protect,
  permit('event_office', 'admin', 'Event Office', 'Events Office'),
  getVendorRequestById
);

// Route to update vendor request status (accept/reject) - Events Office / Admin
router.patch('/:id/status', protect, permit('event_office', 'admin'), updateVendorRequestStatus);

// Route to vote for a vendor request - Student, Staff, TA, Professor
router.post('/:id/vote', protect, permit('Student', 'Staff', 'TA', 'Professor'), voteForVendorRequest);

// Route to remove vote from a vendor request - Student, Staff, TA, Professor
router.delete('/:id/vote', protect, permit('Student', 'Staff', 'TA', 'Professor'), removeVote);

// Route to get vote count and user's vote status - All authenticated users
router.get('/:id/votes', protect, getVendorRequestVotes);

// Route to cancel vendor request - Vendor (only if not paid yet)
router.delete('/:requestId/cancel', protect, permit('vendor'), cancelVendorRequest);

// Booth Poll Routes
// Create booth poll - Events Office / Admin
router.post('/polls', protect, permit('event_office', 'admin'), createBoothPoll);

// Get all booth polls - Events Office / Admin
router.get('/polls', protect, permit('event_office', 'admin'), getBoothPolls);

// Vote in booth poll - Vendors
router.post('/polls/:pollId/vote', protect, permit('vendor'), voteInBoothPoll);

// Close booth poll - Events Office / Admin
router.patch('/polls/:pollId/close', protect, permit('event_office', 'admin'), closeBoothPoll);

// Get booth poll results - Events Office / Admin
router.get('/polls/:pollId/results', protect, permit('event_office', 'admin'), getBoothPollResults);

module.exports = router;

