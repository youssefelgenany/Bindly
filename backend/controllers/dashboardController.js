const Event = require('../models/eventModel');
const Announcement = require('../models/announcementModel');

// Get professor dashboard statistics
exports.getProfessorDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📊 Fetching professor dashboard stats for user:', userId);

    // Get total events created by this professor
    const totalEventsCreated = await Event.countDocuments({ createdBy: userId });

    // Get upcoming events (events with startDate in the future)
    const upcomingEvents = await Event.countDocuments({
      createdBy: userId,
      startDate: { $gte: new Date() }
    });

    // Get events participating in (for now, we'll use total events as a placeholder)
    // In a real system, this would be based on event registrations/participation
    const eventsParticipatingIn = await Event.countDocuments({
      createdBy: userId,
      status: 'approved'
    });

    // Get pending approvals (events with status 'pending')
    const pendingApprovals = await Event.countDocuments({
      createdBy: userId,
      status: 'pending'
    });

    const stats = {
      totalEventsCreated,
      upcomingEvents,
      eventsParticipatingIn,
      pendingApprovals
    };

    console.log('✅ Professor dashboard stats:', stats);

    res.status(200).json({
      success: true,
      message: 'Professor dashboard stats fetched successfully',
      stats
    });
  } catch (err) {
    console.error('❌ Error fetching professor dashboard stats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get professor notifications
exports.getProfessorNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('🔔 Fetching professor notifications for user:', userId);

    // Get announcements for events created by this professor
    const professorEvents = await Event.find({ createdBy: userId }).select('_id');
    const eventIds = professorEvents.map(event => event._id);

    // Get recent announcements for professor's events
    const announcements = await Announcement.find({ eventId: { $in: eventIds } })
      .populate('eventId', 'title')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    // Transform announcements into notification format
    const notifications = announcements.map(announcement => ({
      id: announcement._id,
      type: 'announcement',
      title: announcement.title,
      message: announcement.message,
      timestamp: announcement.createdAt,
      isRead: false, // For now, all are unread
      priority: 'info',
      eventTitle: announcement.eventId?.title || 'Unknown Event'
    }));

    // Add some system notifications based on event status
    const pendingEvents = await Event.find({
      createdBy: userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(3);

    pendingEvents.forEach(event => {
      notifications.push({
        id: `pending-${event._id}`,
        type: 'pending',
        title: 'Event Under Review',
        message: `"${event.title}" is under review by Event Office.`,
        timestamp: event.createdAt,
        isRead: false,
        priority: 'pending',
        eventTitle: event.title
      });
    });

    // Sort notifications by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('✅ Professor notifications:', notifications.length);

    res.status(200).json({
      success: true,
      message: 'Professor notifications fetched successfully',
      notifications: notifications.slice(0, 10) // Limit to 10 most recent
    });
  } catch (err) {
    console.error('❌ Error fetching professor notifications:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get admin dashboard statistics
exports.getAdminDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching admin dashboard stats');

    const User = require('../models/userModel');
    
    // Get total users
    const totalUsers = await User.countDocuments();

    // Get total vendors
    const totalVendors = await User.countDocuments({ userType: 'Vendor' });

    // Get total events
    const totalEvents = await Event.countDocuments();

    // Get pending approvals (events with status 'pending')
    const pendingApprovals = await Event.countDocuments({ status: 'pending' });

    const stats = {
      totalUsers,
      totalVendors,
      totalEvents,
      pendingApprovals
    };

    console.log('✅ Admin dashboard stats:', stats);

    res.status(200).json({
      success: true,
      message: 'Admin dashboard stats fetched successfully',
      stats
    });
  } catch (err) {
    console.error('❌ Error fetching admin dashboard stats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get recent activity for admin dashboard
exports.getRecentActivity = async (req, res) => {
  try {
    console.log('📈 Fetching recent activity');

    const User = require('../models/userModel');
    
    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName userType createdAt');

    // Get recent events
    const recentEvents = await Event.find()
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdBy createdAt');

    // Transform into activity format
    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user._id}`,
        type: 'registration',
        user: `${user.firstName} ${user.lastName}`,
        action: `registered as ${user.userType}`,
        timestamp: user.createdAt,
        icon: '👤'
      });
    });

    // Add event creations
    recentEvents.forEach(event => {
      const creatorFirst = event.createdBy?.firstName || 'Unknown';
      const creatorLast = event.createdBy?.lastName || 'User';
      activities.push({
        id: `event-${event._id}`,
        type: 'event',
        user: `${creatorFirst} ${creatorLast}`,
        action: `created new event: "${event.title}"`,
        timestamp: event.createdAt,
        icon: '📅'
      });
    });

    // Sort by timestamp and limit to 10
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('✅ Recent activity:', activities.length);

    res.status(200).json({
      success: true,
      message: 'Recent activity fetched successfully',
      activities: activities.slice(0, 10)
    });
  } catch (err) {
    console.error('❌ Error fetching recent activity:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

