const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  getAllWorkshops,
  getMyWorkshops,
  getMyWorkshopsStatus,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  approveWorkshop,
  rejectWorkshop,
  requestEdits,
  getWorkshopParticipants,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/workshopController');

// Dev-only: force notify professor for a workshop (approve/reject/edits)
if (process.env.NODE_ENV !== 'production') {
  const { forceNotifyProfessorForWorkshop } = require('../controllers/workshopController');
  // No auth on this route by design — dev/testing only
  router.post('/:id/force-notify', express.json(), forceNotifyProfessorForWorkshop);
}


// Professor view participants
router.get('/:id/participants', protect, permit('Professor'), getWorkshopParticipants);

// Professor routes (require professor-id header)
router.get('/my-workshops', protect, permit('Professor'), getMyWorkshops);
// Professor: view status and requested edits for submitted workshops
router.get('/my-workshops/status', protect, permit('Professor'), getMyWorkshopsStatus);
// Professor: get notifications
router.get('/notifications', protect, permit('Professor'), getMyNotifications);
// Professor: mark notification as read
router.put('/notifications/:notificationId/read', protect, permit('Professor'), markNotificationAsRead);
// Professor: mark all notifications as read
router.put('/notifications/read-all', protect, permit('Professor'), markAllNotificationsAsRead);
// routes/workshopRoutes.js
router.post('/', protect, permit('Professor'), createWorkshop);

router.put('/:id', protect, permit('Professor'), updateWorkshop);
router.delete('/:id', protect, permit('Professor'), deleteWorkshop);

// Events Office routes (require authentication and Events Office role)
router.get('/', protect, permit('Event Office', 'Events Office', 'event_office', 'admin'), getAllWorkshops);
router.put('/:id/approve', protect, permit('Event Office', 'Events Office', 'event_office', 'admin'), approveWorkshop);
router.put('/:id/reject', protect, permit('Event Office', 'Events Office', 'event_office', 'admin'), rejectWorkshop);
router.put('/:id/request-edits', protect, permit('Event Office', 'Events Office', 'event_office', 'admin'), requestEdits);

module.exports = router;