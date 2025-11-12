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

    const crypto = require('crypto');
    const User = require('../models/userModel');
    
    // Check if User already exists
    let user = await User.findOne({ email: studentEmail.toLowerCase().trim() });
    if (!user) {
      user = new User({
        email: studentEmail,
        name: studentName,
        userType: 'Student',
        gucId: studentId, // map to gucId
        password: tempPassword
      });
      await user.save();  // <-- fails here
}
    // Generate verification token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    if (!user) {
      // Create User record if it doesn't exist
      // Generate a temporary password (user will need to reset it via password reset flow)
      const tempPassword = crypto.randomBytes(16).toString('hex');
      
      user = await User.create({
        email: studentEmail.toLowerCase().trim(),
        password: tempPassword, // Temporary password - user should reset via password reset
        userType: 'Student',
        firstName: studentName.split(' ')[0] || studentName,
        lastName: studentName.split(' ').slice(1).join(' ') || '',
        isVerified: false,
        verificationToken: token,
        verificationExpiresAt: expiresAt,
        status: 'blocked'
      });
    } else {
      // Update existing user with new verification token if not already verified
      if (!user.isVerified) {
        user.verificationToken = token;
        user.verificationExpiresAt = expiresAt;
        await user.save();
      }
    }
    
    // Only send verification email if user is not already verified
    if (!user.isVerified) {
      // Use the existing email sending infrastructure
      const apiBase = process.env.API_BASE_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verifyUrl = `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${frontendUrl}/login`;
      
      // Use the same email transport as authController
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === 'true'),
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined
      });
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
            <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Welcome to Bindly!</h2>
            <p>Hello ${studentName},</p>
            <p>Thank you for registering for ${event.title}. To complete your registration and access your account, please verify your email address by clicking the link below:</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify My Email
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>Note:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #d32f2f; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>After verification, you'll be redirected to the login page where you can sign in to your account.</p>
            <p>This verification link will expire in 24 hours.</p>
            <p style="margin-top: 20px;">
              Best regards,<br>
              <strong>The Bindly Team</strong>
            </p>
          </div>
        </div>
      `;
      
      try {
        const mailOptions = {
          from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
          to: studentEmail,
          subject: 'Verify Your Student Account - Bindly',
          html: html
        };
        
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          await transporter.sendMail(mailOptions);
          console.log('✅ Verification email sent to:', studentEmail);
        } else {
          console.warn('⚠️ SMTP not configured; verification email not sent.');
          console.log('🔗 Verification link for testing:', verifyUrl);
        }
      } catch (emailError) {
        console.error('❌ Error sending verification email:', emailError);
        // Don't fail the registration if email fails, but log it
      }
    }
    


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

    // Format the response - filter out registrations with deleted events
    const formattedRegistrations = registrations
      .filter(reg => reg.event && reg.event !== null) // Filter out registrations where event was deleted
      .map(reg => ({
        id: reg._id,
        eventId: reg.event?._id ? String(reg.event._id) : null, // Include event ID for checking registration status
        eventTitle: reg.event?.title || 'Event Deleted',
        eventType: reg.event?.type || 'unknown',
        eventDate: reg.event?.startDate || null,
        eventEndDate: reg.event?.endDate || null,
        eventLocation: reg.event?.location || 'N/A',
        eventDescription: reg.event?.description || '',
        capacity: reg.event?.capacity || null,
        registeredCount: reg.event?.registeredCount || 0,
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
