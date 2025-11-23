const GymSession = require('../models/gymSessionModel');
const GymRegistration = require('../models/gymRegistrationModel');
const User = require('../models/userModel');
const { sendGymCancellationEmail } = require('../utils/sendGymCancellationEmail');
const { sendGymEditEmail } = require('../utils/sendGymEditEmail');

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

// Get all gym sessions with filtering options
exports.getAllGymSessions = async (req, res) => {
  try {
    const {
      status,
      type,
      startDate,
      endDate,
      instructor,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (instructor) filter.instructor = new RegExp(instructor, 'i');

    // Date range filtering
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const gymSessions = await GymSession.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GymSession.countDocuments(filter);

    res.json({
      success: true,
      data: gymSessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
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

    // Prevent updates to completed sessions (except status changes by admin/event office)
    if (gymSession.status === 'completed' && !['admin', 'event_office'].includes(req.user.userType)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed sessions'
      });
    }

    // Validate status transitions
    if (updates.status) {
      const allowedStatuses = ['active', 'cancelled', 'completed'];
      if (!allowedStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }

      // Prevent reactivating cancelled sessions
      if (gymSession.status === 'cancelled' && updates.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Cannot reactivate cancelled sessions'
        });
      }

      // Only allow completion if session date has passed
      if (updates.status === 'completed' && new Date(gymSession.date) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark future sessions as completed'
        });
      }
    }

    // Validate capacity changes
    if (updates.maxParticipants !== undefined) {
      if (updates.maxParticipants <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Max participants must be greater than 0'
        });
      }

      // Check current registrations
      const currentRegistrations = await GymRegistration.countDocuments({
        gymSession: id,
        status: 'registered'
      });

      if (updates.maxParticipants < currentRegistrations) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce capacity below current registrations (${currentRegistrations})`
        });
      }
    }

    // Check if status is being changed to 'cancelled'
    const wasActive = gymSession.status === 'active';
    const isBeingCancelled = updates.status === 'cancelled' && wasActive;

    // Check if session details are being edited (date, time, or location changed)
    const isBeingEdited = (updates.date && updates.date.toString() !== gymSession.date.toString()) ||
                          (updates.time && updates.time !== gymSession.time) ||
                          (updates.location && updates.location !== gymSession.location);

    // Store old values for email notification
    const oldDate = gymSession.date;
    const oldTime = gymSession.time;
    const oldLocation = gymSession.location;

    // Use findByIdAndUpdate to avoid full validation issues
    const updatedGymSession = await GymSession.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: false }
    );

    // If session was edited (not cancelled), notify all registered users
    if (isBeingEdited && !isBeingCancelled && wasActive) {
      try {
        const registrations = await GymRegistration.find({
          gymSession: id,
          status: 'registered'
        }).populate('user', 'email firstName lastName');

        console.log(`📧 Sending edit notification emails to ${registrations.length} registered users...`);

        for (const registration of registrations) {
          if (registration.user && registration.user.email) {
            const userName = registration.user.firstName
              ? `${registration.user.firstName} ${registration.user.lastName || ''}`.trim()
              : registration.user.email;

            try {
              const emailResult = await sendGymEditEmail(
                registration.user.email,
                userName,
                updatedGymSession.type,
                oldDate,
                oldTime,
                updatedGymSession.date,
                updatedGymSession.time,
                oldLocation,
                updatedGymSession.location
              );

              if (emailResult.sent) {
                console.log(`✅ Edit notification email sent to ${registration.user.email}`);
              } else {
                console.error(`❌ Failed to send edit notification email to ${registration.user.email}:`,
                  emailResult.reason || emailResult.error);
              }
            } catch (emailError) {
              console.error(`❌ Exception sending edit notification email to ${registration.user.email}:`,
                emailError.message);
              // Continue with other users even if one fails
            }
          }
        }

        console.log('✅ Finished sending edit notification emails');
      } catch (error) {
        console.error('❌ Error sending edit notification emails:', error);
        // Don't fail the update if email sending fails
      }
    }

    // If session was cancelled, notify all registered users
    if (isBeingCancelled) {
      try {
        const registrations = await GymRegistration.find({
          gymSession: id,
          status: 'registered'
        }).populate('user', 'email firstName lastName');

        console.log(`📧 Sending cancellation emails to ${registrations.length} registered users...`);

        for (const registration of registrations) {
          if (registration.user && registration.user.email) {
            const userName = registration.user.firstName
              ? `${registration.user.firstName} ${registration.user.lastName || ''}`.trim()
              : registration.user.email;

            try {
              const emailResult = await sendGymCancellationEmail(
                registration.user.email,
                userName,
                updatedGymSession.type,
                updatedGymSession.date,
                updatedGymSession.time,
                updatedGymSession.location
              );

              if (emailResult.sent) {
                console.log(`✅ Cancellation email sent to ${registration.user.email}`);
              } else {
                console.error(`❌ Failed to send cancellation email to ${registration.user.email}:`,
                  emailResult.reason || emailResult.error);
              }
            } catch (emailError) {
              console.error(`❌ Exception sending cancellation email to ${registration.user.email}:`,
                emailError.message);
              // Continue with other users even if one fails
            }
          }
        }

        console.log('✅ Finished sending cancellation emails');
      } catch (error) {
        console.error('❌ Error sending cancellation emails:', error);
        // Don't fail the update if email sending fails
      }
    }

    res.json({
      success: true,
      message: 'Gym session updated successfully',
      gymSession: updatedGymSession
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

    // If session is active and has registrations, notify users before deleting
    if (gymSession.status === 'active') {
      try {
        const registrations = await GymRegistration.find({
          gymSession: id,
          status: 'registered'
        }).populate('user', 'email firstName lastName');

        if (registrations.length > 0) {
          console.log(`📧 Sending cancellation emails to ${registrations.length} registered users before deletion...`);

          for (const registration of registrations) {
            if (registration.user && registration.user.email) {
              const userName = registration.user.firstName 
                ? `${registration.user.firstName} ${registration.user.lastName || ''}`.trim() 
                : registration.user.email;

              try {
                const emailResult = await sendGymCancellationEmail(
                  registration.user.email,
                  userName,
                  gymSession.type,
                  gymSession.date,
                  gymSession.time,
                  gymSession.location
                );

                if (emailResult.sent) {
                  console.log(`✅ Cancellation email sent to ${registration.user.email}`);
                } else {
                  console.error(`❌ Failed to send cancellation email to ${registration.user.email}:`, 
                    emailResult.reason || emailResult.error);
                }
              } catch (emailError) {
                console.error(`❌ Exception sending cancellation email to ${registration.user.email}:`, 
                  emailError.message);
                // Continue with other users even if one fails
              }
            }
          }

          console.log('✅ Finished sending cancellation emails');
        }
      } catch (error) {
        console.error('❌ Error sending cancellation emails:', error);
        // Don't fail the deletion if email sending fails
      }
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

// Bulk update gym sessions (Events Office/Admin only)
exports.bulkUpdateGymSessions = async (req, res) => {
  try {
    const { sessionIds, updates } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'sessionIds must be a non-empty array'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'updates object is required'
      });
    }

    // Validate status if being updated
    if (updates.status) {
      const allowedStatuses = ['active', 'cancelled', 'completed'];
      if (!allowedStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }
    }

    // Find sessions and check permissions
    const sessions = await GymSession.find({ _id: { $in: sessionIds } });

    if (sessions.length !== sessionIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some gym sessions not found'
      });
    }

    // Check permissions for each session
    for (const session of sessions) {
      if (session.createdBy.toString() !== req.user._id.toString() &&
          !['admin', 'event_office'].includes(req.user.userType)) {
        return res.status(403).json({
          success: false,
          message: `You can only update gym sessions you created. Session ${session._id} was created by someone else.`
        });
      }
    }

    // Perform bulk update
    const result = await GymSession.updateMany(
      { _id: { $in: sessionIds } },
      { $set: updates },
      { runValidators: false }
    );

    // If cancelling sessions, send notification emails
    if (updates.status === 'cancelled') {
      for (const session of sessions) {
        if (session.status === 'active') {
          try {
            const registrations = await GymRegistration.find({
              gymSession: session._id,
              status: 'registered'
            }).populate('user', 'email firstName lastName');

            if (registrations.length > 0) {
              console.log(`📧 Sending cancellation emails for session ${session._id} to ${registrations.length} users...`);

              for (const registration of registrations) {
                if (registration.user && registration.user.email) {
                  const userName = registration.user.firstName
                    ? `${registration.user.firstName} ${registration.user.lastName || ''}`.trim()
                    : registration.user.email;

                  try {
                    const emailResult = await sendGymCancellationEmail(
                      registration.user.email,
                      userName,
                      session.type,
                      session.date,
                      session.time,
                      session.location
                    );

                    if (emailResult.sent) {
                      console.log(`✅ Cancellation email sent to ${registration.user.email}`);
                    }
                  } catch (emailError) {
                    console.error(`❌ Exception sending cancellation email:`, emailError.message);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Error sending cancellation emails for session:', session._id, error);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} gym sessions`,
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error bulk updating gym sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating gym sessions',
      error: error.message
    });
  }
};

// Get gym session statistics (Events Office/Admin only)
exports.getGymSessionStats = async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'event_office'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view statistics'
      });
    }

    const stats = await GymSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCapacity: { $sum: '$maxParticipants' }
        }
      }
    ]);

    const totalSessions = await GymSession.countDocuments();
    const activeSessions = await GymSession.countDocuments({ status: 'active' });
    const cancelledSessions = await GymSession.countDocuments({ status: 'cancelled' });
    const completedSessions = await GymSession.countDocuments({ status: 'completed' });

    // Get upcoming sessions (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingSessions = await GymSession.countDocuments({
      date: { $gte: new Date(), $lte: thirtyDaysFromNow },
      status: 'active'
    });

    // Get total registrations
    const totalRegistrations = await GymRegistration.countDocuments({ status: 'registered' });

    res.json({
      success: true,
      data: {
        totalSessions,
        activeSessions,
        cancelledSessions,
        completedSessions,
        upcomingSessions,
        totalRegistrations,
        statusBreakdown: stats
      }
    });

  } catch (error) {
    console.error('Error fetching gym session statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Register for a gym session
exports.registerForGymSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, id: registrationId, email } = req.body; // Optional: name, id, email from form
    const userId = req.user._id;
    const userType = req.user.userType || req.user.role;

    // Validate user type (only students, staff, TA, professors can register)
    // User model uses capitalized values: 'Student', 'Staff', 'TA', 'Professor'
    const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'student', 'staff', 'professor'];
    const normalizedUserType = userType ? String(userType) : '';
    if (!allowedRoles.includes(normalizedUserType)) {
      return res.status(403).json({
        success: false,
        message: 'Only students, staff, TA, and professors can register for gym sessions',
        debug: { userType, normalizedUserType, allowedRoles }
      });
    }

    // Find the gym session
    const gymSession = await GymSession.findById(id);
    if (!gymSession) {
      return res.status(404).json({
        success: false,
        message: 'Gym session not found'
      });
    }

    // Check if session is active
    if (gymSession.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This gym session is not available for registration'
      });
    }

    // Check if session date has passed
    const sessionDateTime = new Date(`${gymSession.date.toISOString().split('T')[0]}T${gymSession.time}`);
    if (sessionDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This gym session has already passed'
      });
    }

    // Check capacity
    const activeRegistrations = await GymRegistration.countDocuments({
      gymSession: id,
      status: 'registered'
    });

    if (activeRegistrations >= gymSession.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'This gym session is full'
      });
    }

    // Check for existing registration (either registered or cancelled)
    let existingRegistration = await GymRegistration.findOne({
      gymSession: id,
      user: userId
    });

    // Normalize userType to match the role enum in the model (lowercase, except 'TA' stays uppercase)
    let normalizedRole = normalizedUserType.toLowerCase();
    if (normalizedUserType === 'TA' || normalizedUserType === 'ta') {
      normalizedRole = 'TA';
    }

    let registration;
    
    if (existingRegistration) {
      // If already registered, return error
      if (existingRegistration.status === 'registered') {
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this gym session'
        });
      }
      
      // If cancelled, reactivate the registration
      if (existingRegistration.status === 'cancelled') {
        existingRegistration.status = 'registered';
        existingRegistration.role = normalizedRole;
        existingRegistration.registeredAt = new Date();
        await existingRegistration.save();
        registration = existingRegistration;
      }
    } else {
      // Create new registration
      registration = await GymRegistration.create({
        user: userId,
        gymSession: id,
        role: normalizedRole,
        status: 'registered'
      });
    }

    // Update current participants count (use updateOne to avoid full validation)
    await GymSession.findByIdAndUpdate(id, {
      currentParticipants: activeRegistrations + 1
    });

    // Populate the registration with session details
    await registration.populate('gymSession', 'date time duration type location instructor');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for gym session',
      registration
    });

  } catch (error) {
    console.error('Error registering for gym session:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this gym session'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering for gym session',
      error: error.message
    });
  }
};

// Get user's gym session registrations
exports.getMyGymRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;

    const registrations = await GymRegistration.find({
      user: userId,
      status: 'registered'
    })
      .populate('gymSession', 'date time duration type maxParticipants currentParticipants location instructor description status')
      .sort({ registeredAt: -1 });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching gym registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gym registrations',
      error: error.message
    });
  }
};

// Cancel gym session registration
exports.cancelGymRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the registration
    const registration = await GymRegistration.findOne({
      gymSession: id,
      user: userId,
      status: 'registered'
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Update registration status
    registration.status = 'cancelled';
    await registration.save();

    // Update gym session participant count (use updateOne to avoid full validation)
    const activeRegistrations = await GymRegistration.countDocuments({
      gymSession: id,
      status: 'registered'
    });
    await GymSession.findByIdAndUpdate(id, {
      currentParticipants: activeRegistrations
    });

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling gym registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling registration',
      error: error.message
    });
  }
};

// Get all registrations for a gym session (for admins/event office)
exports.getGymSessionRegistrations = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has permission (admin or event office)
    if (!['admin', 'event_office'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view registrations'
      });
    }

    const registrations = await GymRegistration.find({
      gymSession: id,
      status: 'registered'
    })
      .populate('user', 'firstName lastName email userType')
      .populate('gymSession', 'date time duration type location instructor')
      .sort({ registeredAt: -1 });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching gym session registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

module.exports = {
  createGymSession: exports.createGymSession,
  getAllGymSessions: exports.getAllGymSessions,
  getGymSessionById: exports.getGymSessionById,
  updateGymSession: exports.updateGymSession,
  deleteGymSession: exports.deleteGymSession,
  bulkUpdateGymSessions: exports.bulkUpdateGymSessions,
  getGymSessionStats: exports.getGymSessionStats,
  registerForGymSession: exports.registerForGymSession,
  getMyGymRegistrations: exports.getMyGymRegistrations,
  cancelGymRegistration: exports.cancelGymRegistration,
  getGymSessionRegistrations: exports.getGymSessionRegistrations
};
