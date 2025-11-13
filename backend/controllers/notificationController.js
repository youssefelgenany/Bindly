const Notification = require('../models/notificationModel');
const notificationService = require('../services/notificationService');

exports.getUserNotifications = async (req, res) => {
  try {
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;
    const userId = req.user._id;
    
    const result = await notificationService.getUserNotifications(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true'
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    await Notification.findByIdAndUpdate(notificationId, { 
      isRead: true,
      readAt: new Date()
    });
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    await Notification.findByIdAndDelete(notificationId);
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

exports.triggerReminderJob = async (req, res) => {
  try {
    const { createEventReminders } = require('../services/notificationService');
    await createEventReminders();
    
    res.json({ success: true, message: 'Reminder job triggered' });
  } catch (error) {
    console.error('Error triggering reminder job:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger reminder job' });
  }
};

exports.getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const userId = req.user._id;
    
    const notifications = await Notification.find({
      recipient: userId,
      type: type
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Notification.countDocuments({
      recipient: userId,
      type: type
    });
    
    res.json({ success: true, data: { notifications, total, type } });
  } catch (error) {
    console.error('Error fetching notifications by type:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};
