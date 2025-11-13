const GymSession = require('../models/gymSessionModel');
const GymRegistration = require('../models/gymRegistrationModel');
const User = require('../models/userModel');
const { sendGymCancellationEmail } = require('../utils/sendGymCancellationEmail');

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

    // Check if status is being changed to 'cancelled'
    const wasActive = gymSession.status === 'active';
    const isBeingCancelled = updates.status === 'cancelled' && wasActive;

    // Use findByIdAndUpdate to avoid full validation issues
    const updatedGymSession = await GymSession.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: false }
    );

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

// Register for a gym session
exports.registerForGymSession = async (req, res) => {
  try {
    const { id } = req.params;
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
