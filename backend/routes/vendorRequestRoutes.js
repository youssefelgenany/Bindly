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
  getPublicBoothPolls,
  voteInBoothPoll,
  closeBoothPoll,
  getBoothPollResults,
  getVendorRequestPayment,
  payVendorRequestFee,
  handleStripePaymentSuccess,
  uploadIndividualIds
} = require('../controllers/vendorRequestController');
const { protect, permit } = require('../middleware/authMiddleware');

// Route to create a new vendor request - Vendor
const { uploadIndividualIdsArray } = require('../middleware/uploadMiddleware');
router.post('/', protect, permit('vendor'), uploadIndividualIdsArray, createVendorRequest);

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

// Stripe payment success callback (no auth required - called by Stripe redirect)
// MUST be before /:id routes to prevent matching as :id parameter
router.get('/payment-success', handleStripePaymentSuccess);

// Route to upload individual IDs for an existing vendor request - Vendor
router.put('/:requestId/upload-ids', protect, permit('vendor'), uploadIndividualIdsArray, uploadIndividualIds);

// Booth Poll Routes - MUST be before /:id routes to prevent route conflicts
// Create booth poll - Events Office / Admin
router.post('/polls', protect, permit('event_office', 'admin'), createBoothPoll);

// Get all booth polls - Events Office / Admin (full details)
router.get('/polls', protect, permit('event_office', 'admin'), getBoothPolls);

// Get public booth polls - Students, Staff, TA, Professor (for voting)
router.get('/polls/public', protect, permit('Student', 'Staff', 'TA', 'Professor'), getPublicBoothPolls);

// Vote in booth poll - Students, Staff, TA, Professor
router.post('/polls/:pollId/vote', protect, permit('Student', 'Staff', 'TA', 'Professor'), voteInBoothPoll);

// Close booth poll - Events Office / Admin
router.patch('/polls/:pollId/close', protect, permit('event_office', 'admin'), closeBoothPoll);

// Get booth poll results - Events Office / Admin
router.get('/polls/:pollId/results', protect, permit('event_office', 'admin'), getBoothPollResults);

// Route to get a single vendor request by ID - Events Office / Admin
// MUST be after /polls routes to prevent /polls from matching as /:id
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

// Payment endpoints for vendor requests - Vendor owners
// Get payment details
router.get('/:requestId/payment', protect, permit('vendor'), getVendorRequestPayment);
// Submit payment (wallet or card)
router.post('/:requestId/payment', protect, permit('vendor'), payVendorRequestFee);

module.exports = router;

