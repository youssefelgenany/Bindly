const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const Event = require('../models/eventModel');
const Trip = require('../models/tripModel');
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
    const { sendAll } = req.query; // Check if user wants to send all upcoming reminders
    
    await createEventReminders(sendAll === 'true');
    
    res.json({ 
      success: true, 
      message: sendAll === 'true' 
        ? 'Reminders sent for all upcoming events' 
        : 'Reminder job triggered' 
    });
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

exports.sendDummyTripTest2Reminder = async (req, res) => {
  try {
    console.log('📢 Sending dummy 1-hour reminder for trip test 2 to all staff and professors...');
    
    // Find all staff and professor users
    const staffAndProfessors = await User.find({
      userType: { $in: ['Staff', 'Professor'] }
    });
    
    console.log(`👥 Found ${staffAndProfessors.length} staff and professor users`);
    
    // Find trip test 2 event (check both Event and Trip models)
    let tripTest2 = await Event.findOne({
      type: 'trip',
      title: { $regex: /trip test 2/i }
    });
    
    // If not found in Event, check Trip model
    if (!tripTest2) {
      tripTest2 = await Trip.findOne({
        name: { $regex: /trip test 2/i }
      });
    }
    
    if (!tripTest2) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip test 2 event not found' 
      });
    }
    
    console.log(`✅ Found trip test 2: ${tripTest2.title || tripTest2.name} (ID: ${tripTest2._id})`);
    
    const tripName = tripTest2.title || tripTest2.name;
    const tripLocation = tripTest2.location || 'Location TBD';
    const tripId = tripTest2._id;
    
    let successCount = 0;
    let errorCount = 0;
    
    // Send reminder to all staff and professors
    for (const user of staffAndProfessors) {
      try {
        await Notification.create({
          recipient: user._id,
          type: 'trip_reminder',
          title: `Reminder: ${tripName} starts in 1 hour`,
          message: `The trip "${tripName}" will start in 1 hour at ${tripLocation}`,
          relatedEvent: tripId,
          priority: 'high',
          metadata: {
            tripName: tripName,
            tripDate: tripTest2.startDate || new Date(),
            location: tripLocation,
            timeframe: '1 hour',
            tripId: tripId.toString()
          }
        });
        successCount++;
        console.log(`  ✅ Sent reminder to ${user.userType}: ${user.email}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⏭️  Duplicate notification skipped for ${user.email}`);
        } else {
          errorCount++;
          console.error(`  ❌ Error sending reminder to ${user.email}:`, error.message);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Dummy 1-hour reminder sent for trip test 2`,
      stats: {
        totalUsers: staffAndProfessors.length,
        successCount,
        errorCount
      }
    });
  } catch (error) {
    console.error('Error sending dummy trip test 2 reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send dummy reminder',
      error: error.message 
    });
  }
};
