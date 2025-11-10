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

router.put('/:id', updateWorkshop);
router.delete('/:id', deleteWorkshop);

// Events Office routes (no professor-id needed)
router.get('/', getAllWorkshops);
router.put('/:id/approve', approveWorkshop);
router.put('/:id/reject', rejectWorkshop);
router.put('/:id/request-edits', requestEdits);

module.exports = router;