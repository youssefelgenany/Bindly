const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/by-type/:type', notificationController.getNotificationsByType);
router.put('/:notificationId/read', notificationController.markNotificationAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);
router.post('/trigger-reminders', notificationController.triggerReminderJob);

module.exports = router;
