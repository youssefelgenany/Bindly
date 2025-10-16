const Announcement = require("../models/announcementModel");
const Event = require("../models/eventModel");

// 📢 Get all announcements for a professor's events
exports.getMyAnnouncements = async (req, res) => {
  try {
    console.log('📢 Professor requesting announcements, user ID:', req.user._id);
    
    // Get all events created by the professor
    const professorEvents = await Event.find({ createdBy: req.user._id }).select('_id');
    const eventIds = professorEvents.map(event => event._id);
    
    // Get all announcements for these events
    const announcements = await Announcement.find({ 
      eventId: { $in: eventIds },
      isActive: true 
    })
    .populate('eventId', 'title')
    .populate('createdBy', 'firstName lastName userType')
    .sort({ createdAt: -1 });

    console.log('📊 Found announcements:', announcements.length);

    res.status(200).json({
      success: true,
      message: 'Announcements fetched successfully',
      announcements
    });
  } catch (err) {
    console.error("❌ Error fetching announcements:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 📢 Create a new announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, eventId } = req.body;

    if (!title || !message || !eventId) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: title, message, eventId" 
      });
    }

    // Verify the event exists and belongs to the professor
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: "Event not found" 
      });
    }

    // Check if professor is trying to create announcement for someone else's event
    if (req.user.userType === "Professor" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only create announcements for your own events" 
      });
    }

    const announcement = new Announcement({
      title,
      message,
      eventId,
      createdBy: req.user._id,
      source: req.user.userType
    });

    await announcement.save();

    // Populate the response
    await announcement.populate('eventId', 'title');
    await announcement.populate('createdBy', 'firstName lastName userType');

    console.log('✅ Announcement created successfully:', announcement._id);

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement
    });
  } catch (err) {
    console.error("❌ Error creating announcement:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 📢 Update an announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: "Announcement not found" 
      });
    }

    // Check if professor is trying to update someone else's announcement
    if (req.user.userType === "Professor" && announcement.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only update your own announcements" 
      });
    }

    Object.assign(announcement, updates);
    await announcement.save();

    // Populate the response
    await announcement.populate('eventId', 'title');
    await announcement.populate('createdBy', 'firstName lastName userType');

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement
    });
  } catch (err) {
    console.error("❌ Error updating announcement:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 📢 Delete an announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: "Announcement not found" 
      });
    }

    // Check if professor is trying to delete someone else's announcement
    if (req.user.userType === "Professor" && announcement.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only delete your own announcements" 
      });
    }

    await announcement.deleteOne();
    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting announcement:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

