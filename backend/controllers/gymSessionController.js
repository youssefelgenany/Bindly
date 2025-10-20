const GymSession = require('../models/gymSessionModel');

// Create a new gym session
exports.createGymSession = async (req, res) => {
  try {
    const { date, time, duration, type, maxParticipants, instructor, location, description } = req.body;

    // Validate required fields
    if (!date || !time || !duration || !type || !maxParticipants) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: date, time, duration, type, and maxParticipants are required' 
      });
    }

    // Validate duration (should be positive)
    if (duration <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Duration must be greater than 0' 
      });
    }

    // Validate max participants
    if (maxParticipants <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Max participants must be greater than 0' 
      });
    }

    // Create new gym session
    const newGymSession = new GymSession({
      date,
      time,
      duration,
      type,
      maxParticipants,
      instructor: instructor || '',
      location: location || 'Gym',
      description: description || '',
      createdBy: req.user._id,
      status: 'active'
    });

    await newGymSession.save();

    res.status(201).json({
      success: true,
      message: 'Gym session created successfully',
      gymSession: newGymSession
    });

  } catch (error) {
    console.error('Error creating gym session:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating gym session',
      error: error.message
    });
  }
};

// Get all gym sessions
exports.getAllGymSessions = async (req, res) => {
  try {
    const gymSessions = await GymSession.find()
      .populate('createdBy', 'name email')
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: gymSessions
    });
  } catch (error) {
    console.error('Error fetching gym sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gym sessions',
      error: error.message
    });
  }
};

// Get gym session by ID
exports.getGymSessionById = async (req, res) => {
  try {
    const gymSession = await GymSession.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!gymSession) {
      return res.status(404).json({
        success: false,
        message: 'Gym session not found'
      });
    }

    res.json({
      success: true,
      data: gymSession
    });
  } catch (error) {
    console.error('Error fetching gym session:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gym session',
      error: error.message
    });
  }
};

// Update gym session
exports.updateGymSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const gymSession = await GymSession.findById(id);
    if (!gymSession) {
      return res.status(404).json({
        success: false,
        message: 'Gym session not found'
      });
    }

    // Check if user can update (created by them or admin/event office)
    if (gymSession.createdBy.toString() !== req.user._id.toString() && 
        !['admin', 'event_office'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update gym sessions you created'
      });
    }

    Object.assign(gymSession, updates);
    await gymSession.save();

    res.json({
      success: true,
      message: 'Gym session updated successfully',
      gymSession
    });
  } catch (error) {
    console.error('Error updating gym session:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating gym session',
      error: error.message
    });
  }
};

// Delete gym session
exports.deleteGymSession = async (req, res) => {
  try {
    const { id } = req.params;

    const gymSession = await GymSession.findById(id);
    if (!gymSession) {
      return res.status(404).json({
        success: false,
        message: 'Gym session not found'
      });
    }

    // Check if user can delete (created by them or admin/event office)
    if (gymSession.createdBy.toString() !== req.user._id.toString() && 
        !['admin', 'event_office'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete gym sessions you created'
      });
    }

    await GymSession.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Gym session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gym session:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting gym session',
      error: error.message
    });
  }
};
