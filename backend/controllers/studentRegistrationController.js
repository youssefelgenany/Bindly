const StudentRegistration = require('../models/studentRegistrationModel');
const Event = require('../models/eventModel');

// Register a student for a workshop or trip
exports.registerStudentForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentName, studentId, studentEmail, emergencyContact, dietaryRequirements, medicalConditions } = req.body;

    // Validate required fields
    if (!studentName || !studentId || !studentEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'Student name, ID, and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address' 
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    // Check if event is a workshop or trip
    if (!['workshop', 'trip'].includes(event.type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Registration is only available for workshops and trips' 
      });
    }

    // Check if event is approved and upcoming
    if (event.status !== 'approved') {
      return res.status(400).json({ 
        success: false,
        message: 'This event is not available for registration' 
      });
    }

    if (event.startDate <= new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Registration deadline has passed for this event' 
      });
    }

    // Check registration deadline if it exists
    if (event.registrationDeadline && event.registrationDeadline <= new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Registration deadline has passed' 
      });
    }

    // Check capacity
    const currentRegistrations = await StudentRegistration.countDocuments({ event: eventId });
    if (event.capacity && currentRegistrations >= event.capacity) {
      return res.status(400).json({ 
        success: false,
        message: 'This event is full' 
      });
    }

    // Check for duplicate registration
    const existingRegistration = await StudentRegistration.findOne({ 
      event: eventId, 
      studentEmail: studentEmail.toLowerCase() 
    });
    
    if (existingRegistration) {
      return res.status(400).json({ 
        success: false,
        message: 'You are already registered for this event' 
      });
    }

    // Create registration
    const registrationData = {
      event: eventId,
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      studentEmail: studentEmail.toLowerCase().trim(),
      eventType: event.type,
    };

    // Add additional fields for trips
    if (event.type === 'trip') {
      if (emergencyContact) registrationData.emergencyContact = emergencyContact;
      if (dietaryRequirements) registrationData.dietaryRequirements = dietaryRequirements;
      if (medicalConditions) registrationData.medicalConditions = medicalConditions;
    }

    const registration = await StudentRegistration.create(registrationData);

    // Update event registered count
    event.registeredCount = (event.registeredCount || 0) + 1;
    await event.save();

    res.status(201).json({
      success: true,
      message: `Successfully registered for ${event.type}`,
      registration: {
        id: registration._id,
        eventTitle: event.title,
        eventType: event.type,
        studentName: registration.studentName,
        studentEmail: registration.studentEmail,
        registeredAt: registration.registeredAt
      }
    });

  } catch (error) {
    console.error('Error registering student for event:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'You are already registered for this event' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error occurred during registration' 
    });
  }
};

// Get student registrations for an event (for event organizers)
exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const registrations = await StudentRegistration.find({ event: eventId })
      .sort({ registeredAt: -1 })
      .lean();

    res.json({
      success: true,
      registrations
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error occurred while fetching registrations' 
    });
  }
};

// Get student registrations by email (for students to view their own registrations)
exports.getStudentRegistrationsByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    console.log('🔍 Student registration search request for email:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const registrations = await StudentRegistration.find({ 
      studentEmail: email.toLowerCase().trim() 
    })
    .populate('event', 'title startDate endDate location type description capacity registeredCount')
    .sort({ registeredAt: -1 })
    .lean();

    console.log('🔍 Found registrations:', registrations.length);

    // Format the response
    const formattedRegistrations = registrations.map(reg => ({
      id: reg._id,
      eventTitle: reg.event.title,
      eventType: reg.event.type,
      eventDate: reg.event.startDate,
      eventEndDate: reg.event.endDate,
      eventLocation: reg.event.location,
      eventDescription: reg.event.description,
      capacity: reg.event.capacity,
      registeredCount: reg.event.registeredCount,
      studentName: reg.studentName,
      studentId: reg.studentId,
      studentEmail: reg.studentEmail,
      status: reg.status,
      registeredAt: reg.registeredAt,
      emergencyContact: reg.emergencyContact,
      dietaryRequirements: reg.dietaryRequirements,
      medicalConditions: reg.medicalConditions
    }));

    console.log('🔍 Formatted registrations:', formattedRegistrations.length);

    res.json({
      success: true,
      registrations: formattedRegistrations,
      count: formattedRegistrations.length
    });
  } catch (error) {
    console.error('Error fetching student registrations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error occurred while fetching registrations' 
    });
  }
};

// Get all student registrations (admin only)
exports.getAllStudentRegistrations = async (req, res) => {
  try {
    const registrations = await StudentRegistration.find()
      .populate('event', 'title startDate endDate location type')
      .sort({ registeredAt: -1 })
      .lean();

    res.json({
      success: true,
      registrations
    });
  } catch (error) {
    console.error('Error fetching all student registrations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error occurred while fetching registrations' 
    });
  }
};
