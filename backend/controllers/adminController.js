const crypto = require("crypto");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const StudentRegistration = require("../models/studentRegistrationModel");
const Registration = require("../models/registrationModel");
const { sendVerificationEmail } = require("../utils/mailer");

// Admin assigns correct role (staff/TA/professor) and sends email


exports.assignRoleAndSendVerification = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role)
      return res.status(400).json({ msg: "userId and role are required" });

    // Must match your schema's enum values exactly
    const allowedRoles = ["Staff", "TA", "Professor"];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ msg: "Invalid role for this endpoint" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Ensure name exists
    if (!user.name || user.name.trim() === '') {
      user.name = user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.email.split('@')[0]; // fallback to email prefix
    }

    // Update userType + activate and verify account
    // When admin assigns a role, it's considered approval, so verify immediately
    user.userType = role;
    user.isVerified = true; // Verify immediately when admin assigns role
    user.status = 'active'; // Activate the account when admin assigns role
    // Still generate token for email confirmation (optional)
    user.verificationToken = crypto.randomBytes(24).toString("hex");
    user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email (use first + last name if available)
    const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.name;
    const emailResult = await sendVerificationEmail(user.email, user.verificationToken, name);
    
    if (emailResult.sent) {
      console.log('✅ Verification email sent successfully to:', user.email);
    } else {
      console.error('❌ Verification email not sent:', emailResult.reason || emailResult.error);
    }

    res.json({ msg: "Role assigned and verification email sent successfully.", token: user.verificationToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // exclude password field
    res.status(200).json({
      success: true,
      message: 'All users fetched successfully',
      users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    // Only allow updating into TA/Staff/Professor
    const allowedAssignableRoles = ['Staff', 'TA', 'Professor'];
    if (!allowedAssignableRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Admin can only assign roles: TA, Staff, Professor.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow updating users who originally signed as TA/Staff/Professor
    const updatableOriginRoles = ['Staff', 'TA', 'Professor'];
    if (!updatableOriginRoles.includes(user.userType)) {
      return res.status(400).json({
        success: false,
        message: 'This user is not eligible for role update (only TA/Staff/Professor accounts can be updated)'
      });
    }

    // Update user type (role) within the allowed set
    user.userType = role;

    // Generate verification token and set user as unverified
    // User must click verification link in email to verify their account
    user.verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.isVerified = false; // Keep user unverified until they click the email link

    await user.save();

    // Send verification email
    try {
      const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.name || 'User';
      const emailResult = await sendVerificationEmail(user.email, user.verificationToken, name);
      if (emailResult.sent) {
        console.log('✅ Verification email sent to:', user.email);
      } else {
        console.error('❌ Verification email not sent:', emailResult.reason || emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Don't fail the role update if email fails, but log it
      // The admin can manually resend the email if needed
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully. Verification email has been sent. User must click the verification link to activate their account.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update user status (activate/deactivate)
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, confirmationPassword } = req.body;

    console.log('🔍 Updating user status:', userId);
    console.log('🔍 Is Active:', isActive);
    console.log('🔍 Request body:', req.body);

    if (typeof isActive !== 'boolean') {
      console.log('❌ Invalid isActive type:', typeof isActive);
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('📊 Current user:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      currentStatus: user.status
    });

    // Require password confirmation when modifying Admin/Event Office accounts
    if (user.userType === 'Admin' || user.userType === 'Event Office') {
      if (!confirmationPassword || typeof confirmationPassword !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'confirmationPassword is required to modify admin accounts'
        });
      }
      if (confirmationPassword !== '123456') {
        return res.status(401).json({
          success: false,
          message: 'Invalid confirmation password'
        });
      }
    }

    // Update user status
    const previousStatus = user.status;
    user.status = isActive ? 'active' : 'blocked';

    console.log('📊 New status:', user.status);

    // If activating a user and they are not verified, send verification email
    // This handles the case when events office accepts/activates a user
    if (isActive && !user.isVerified && ['Staff', 'TA', 'Professor'].includes(user.userType)) {
      try {
        // Generate verification token if not exists or expired
        if (!user.verificationToken || (user.verificationExpiresAt && user.verificationExpiresAt < new Date())) {
          user.verificationToken = crypto.randomBytes(32).toString('hex');
          user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }

        await user.save();

        // Send verification email
        const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.name || 'User';
        const emailResult = await sendVerificationEmail(user.email, user.verificationToken, name);
        if (emailResult.sent) {
          console.log('✅ Verification email sent to:', user.email);
          console.log('   User activated and verification email sent');
        } else {
          console.error('❌ Verification email not sent:', emailResult.reason || emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending verification email:', emailError);
        // Don't fail the status update if email fails, but log it
      }
    } else {
      await user.save();
    }

    console.log('✅ User status updated successfully');

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully${isActive && !user.isVerified && ['Staff', 'TA', 'Professor'].includes(user.userType) ? '. Verification email has been sent.' : ''}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('❌ Error updating user status:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Change admin password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user._id;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Update user profile
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all vendors for admin management
exports.getAllVendors = async (req, res) => {
  try {
    const { q, status } = req.query;
    console.log('🔍 Admin requesting vendors with query:', { q, status });

    const filter = { userType: 'Vendor' };

    if (q) {
      filter.$or = [
        { firstName: new RegExp(q, "i") },
        { lastName: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { companyName: new RegExp(q, "i") },
      ];
    }

    if (status && status !== 'all') {
      if (status === 'verified') {
        filter.isVerified = true;
      } else if (status === 'pending') {
        filter.isVerified = false;
      } else if (status === 'active') {
        filter.status = 'active';
      } else if (status === 'blocked') {
        filter.status = 'blocked';
      }
    }

    console.log('🔍 Filter applied:', filter);

    const vendors = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 });

    console.log('📊 Found vendors:', vendors.length);

    res.status(200).json({
      success: true,
      message: 'Vendors fetched successfully',
      vendors
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
};

// Update vendor verification status
exports.updateVendorVerification = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { isVerified } = req.body;

    console.log('🔍 Updating vendor verification:', vendorId);
    console.log('🔍 Is Verified:', isVerified);

    if (typeof isVerified !== 'boolean') {
      console.log('❌ Invalid isVerified type:', typeof isVerified);
      return res.status(400).json({
        success: false,
        message: "isVerified must be a boolean value",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    console.log('📊 Current verification status:', vendor.isVerified);
    vendor.isVerified = isVerified;
    await vendor.save();
    console.log('✅ Vendor verification updated successfully');

    res.status(200).json({
      success: true,
      message: `Vendor ${isVerified ? 'verified' : 'unverified'} successfully`,
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        companyName: vendor.companyName,
        isVerified: vendor.isVerified,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error("❌ Error updating vendor verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor verification",
      error: error.message,
    });
  }
};

// Update vendor status (active/blocked)
exports.updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body;

    console.log('🔍 Updating vendor status:', vendorId);
    console.log('🔍 New Status:', status);

    if (!['active', 'blocked'].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'blocked'",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    console.log('📊 Current status:', vendor.status);
    vendor.status = status;
    await vendor.save();
    console.log('✅ Vendor status updated successfully');

    res.status(200).json({
      success: true,
      message: `Vendor ${status === 'active' ? 'activated' : 'blocked'} successfully`,
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        companyName: vendor.companyName,
        isVerified: vendor.isVerified,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error("❌ Error updating vendor status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor status",
      error: error.message,
    });
  }
};

// Note: Direct user verification is disabled - users must verify via email
// This endpoint is kept for backward compatibility but should not be used
exports.updateUserVerification = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Direct user verification is disabled. Users must verify via email verification link.",
  });
};

// Send verification email to user
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📧 Sending verification email for user:', userId);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Allow sending verification emails to both verified and unverified users
    // This allows admins to resend verification emails if needed

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'User must be active before sending verification email'
      });
    }

    // Generate a new verification token
    const verificationToken = crypto.randomBytes(24).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    if (!user.name || user.name.trim() === '') {
      user.name = user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.email.split('@')[0];
    }
    await user.save();

    // Send verification email
    const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.name || 'User';

    console.log('📧 Sending verification email to:', user.email);
    console.log('📧 Verification token:', verificationToken);

    const emailResult = await sendVerificationEmail(user.email, verificationToken, name);
    if (emailResult.sent) {
      console.log('✅ Verification email sent successfully');
    } else {
      console.error('❌ Verification email not sent:', emailResult.reason || emailResult.error);
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully. User must click the link in the email to verify their account.',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification email",
      error: error.message,
    });
  }
};

// Get attendees report for Events Office/Admin
exports.getAttendeesReport = async (req, res) => {
  try {
    console.log('📊 Generating attendees report...');

    // Extract filter parameters from query string
    const { eventName, eventType, startDate, endDate } = req.query;

    console.log('🔍 Filters applied:', { eventName, eventType, startDate, endDate });

    // Build event filter object
    const eventFilter = {};

    // Filter by event name (case-insensitive partial match)
    if (eventName) {
      eventFilter.title = { $regex: eventName, $options: 'i' };
    }

    // Filter by event type
    if (eventType) {
      eventFilter.type = eventType;
    }

    // Filter by date range
    if (startDate || endDate) {
      // Match events that overlap with the date range
      if (startDate && endDate) {
        // Event overlaps with the date range: starts before endDate AND ends after startDate
        eventFilter.$and = [
          { startDate: { $lte: new Date(endDate) } },
          { endDate: { $gte: new Date(startDate) } }
        ];
      } else if (startDate) {
        // Event ends on or after startDate
        eventFilter.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        // Event starts on or before endDate
        eventFilter.startDate = { $lte: new Date(endDate) };
      }
    }

    // Get filtered events
    const allEvents = await Event.find(eventFilter).lean();
    console.log(`📅 Found ${allEvents.length} events matching filters`);

    // Get event IDs for filtering registrations
    const eventIds = allEvents.map(e => e._id);

    // Initialize empty arrays for registrations
    let studentRegistrations = [];
    let regularRegistrations = [];

    // Only query registrations if there are events matching the filter
    if (eventIds.length > 0) {
      // Get student registrations for filtered events (for workshops and trips)
      studentRegistrations = await StudentRegistration.find({
        event: { $in: eventIds },
        status: { $in: ['approved', 'pending'] } // Only count approved/pending registrations
      }).lean();

      // Get regular registrations for filtered events (for other event types)
      regularRegistrations = await Registration.find({
        event: { $in: eventIds },
        status: { $in: ['approved', 'pending'] } // Only count approved/pending registrations
      }).lean();
    }

    // Initialize report structure
    const report = {
      summary: {
        totalEvents: allEvents.length,
        totalAttendees: 0,
        totalStudentRegistrations: studentRegistrations.length,
        totalRegularRegistrations: regularRegistrations.length,
      },
      byEventType: {},
      byEvent: []
    };

    // Process student registrations (workshops and trips)
    const studentRegByEvent = {};
    studentRegistrations.forEach(reg => {
      const eventId = reg.event.toString();
      if (!studentRegByEvent[eventId]) {
        studentRegByEvent[eventId] = 0;
      }
      studentRegByEvent[eventId]++;
    });

    // Process regular registrations
    const regularRegByEvent = {};
    regularRegistrations.forEach(reg => {
      const eventId = reg.event.toString();
      if (!regularRegByEvent[eventId]) {
        regularRegByEvent[eventId] = 0;
      }
      regularRegByEvent[eventId]++;
    });

    // Aggregate by event type and build per-event details
    allEvents.forEach(event => {
      const eventId = event._id.toString();
      const eventType = event.type || 'other';

      // Count attendees for this event
      const studentRegCount = studentRegByEvent[eventId] || 0;
      const regularRegCount = regularRegByEvent[eventId] || 0;
      const totalAttendees = studentRegCount + regularRegCount;

      // Initialize event type in report if not exists
      if (!report.byEventType[eventType]) {
        report.byEventType[eventType] = {
          eventCount: 0,
          totalAttendees: 0,
          studentRegistrations: 0,
          regularRegistrations: 0
        };
      }

      // Update event type totals
      report.byEventType[eventType].eventCount++;
      report.byEventType[eventType].totalAttendees += totalAttendees;
      report.byEventType[eventType].studentRegistrations += studentRegCount;
      report.byEventType[eventType].regularRegistrations += regularRegCount;

      // Add per-event details
      report.byEvent.push({
        eventId: eventId,
        title: event.title,
        type: eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        capacity: event.capacity,
        registeredCount: event.registeredCount || 0,
        actualAttendees: totalAttendees,
        studentRegistrations: studentRegCount,
        regularRegistrations: regularRegCount,
        status: event.status
      });
    });

    // Calculate total attendees
    report.summary.totalAttendees = report.summary.totalStudentRegistrations + report.summary.totalRegularRegistrations;

    // Sort events by start date (most recent first)
    report.byEvent.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    console.log('✅ Attendees report generated successfully');
    console.log(`   Total Events: ${report.summary.totalEvents}`);
    console.log(`   Total Attendees: ${report.summary.totalAttendees}`);

    res.status(200).json({
      success: true,
      message: 'Attendees report fetched successfully',
      report: report,
      filters: {
        eventName: eventName || null,
        eventType: eventType || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('❌ Error generating attendees report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendees report',
      error: error.message
    });
  }
};

// Get sales report for Events Office/Admin
exports.getSalesReport = async (req, res) => {
  try {
    console.log('💰 Generating sales report...');

    // Extract filter parameters from query string
    const { eventType, startDate, endDate, sortBy } = req.query;

    console.log('🔍 Filters applied:', { eventType, startDate, endDate, sortBy });

    const Payment = require('../models/paymentModel');
    const Event = require('../models/eventModel');
    const Trip = require('../models/tripModel');

    // Build event filter object
    const eventFilter = {};

    // Filter by event type
    if (eventType) {
      eventFilter.type = eventType;
    }

    // Filter by date range (event dates)
    if (startDate || endDate) {
      if (startDate && endDate) {
        eventFilter.$and = [
          { startDate: { $lte: new Date(endDate) } },
          { endDate: { $gte: new Date(startDate) } }
        ];
      } else if (startDate) {
        eventFilter.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        eventFilter.startDate = { $lte: new Date(endDate) };
      }
    }

    // Get all events matching the filter
    const events = await Event.find(eventFilter).lean();
    const trips = await Trip.find(eventFilter).lean();
    const allEvents = [...events, ...trips];
    
    const eventIds = allEvents.map(e => e._id);
    console.log(`📅 Found ${allEvents.length} events matching filters`);

    // Get successful payments for these events
    const payments = await Payment.find({
      event: { $in: eventIds },
      status: 'success'
    }).lean();

    console.log(`💳 Found ${payments.length} successful payments`);

    // Build report structure
    const report = {
      summary: {
        totalEvents: allEvents.length,
        totalRevenue: 0,
        totalPayments: payments.length
      },
      byEventType: {},
      byEvent: []
    };

    // Aggregate revenue by event
    const revenueByEvent = {};
    payments.forEach(payment => {
      const eventId = payment.event.toString();
      if (!revenueByEvent[eventId]) {
        revenueByEvent[eventId] = {
          totalRevenue: 0,
          paymentCount: 0
        };
      }
      revenueByEvent[eventId].totalRevenue += payment.amount;
      revenueByEvent[eventId].paymentCount += 1;
    });

    // Build per-event details
    allEvents.forEach(event => {
      const eventId = event._id.toString();
      const eventType = event.type || 'other';
      const revenue = revenueByEvent[eventId] || { totalRevenue: 0, paymentCount: 0 };

      // Initialize event type in report if not exists
      if (!report.byEventType[eventType]) {
        report.byEventType[eventType] = {
          eventCount: 0,
          totalRevenue: 0,
          paymentCount: 0
        };
      }

      // Update event type totals
      report.byEventType[eventType].eventCount++;
      report.byEventType[eventType].totalRevenue += revenue.totalRevenue;
      report.byEventType[eventType].paymentCount += revenue.paymentCount;

      // Add per-event details
      report.byEvent.push({
        eventId: eventId,
        title: event.title || event.name,
        type: eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        price: event.price || 0,
        revenue: revenue.totalRevenue,
        paymentCount: revenue.paymentCount,
        status: event.status
      });
    });

    // Calculate total revenue
    report.summary.totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Sort events by revenue
    if (sortBy === 'revenue-asc') {
      report.byEvent.sort((a, b) => a.revenue - b.revenue);
    } else if (sortBy === 'revenue-desc') {
      report.byEvent.sort((a, b) => b.revenue - a.revenue);
    } else {
      // Default: sort by start date (most recent first)
      report.byEvent.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    console.log('✅ Sales report generated successfully');
    console.log(`   Total Revenue: ${report.summary.totalRevenue}`);
    console.log(`   Total Events: ${report.summary.totalEvents}`);

    res.status(200).json({
      success: true,
      message: 'Sales report fetched successfully',
      report: report,
      filters: {
        eventType: eventType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortBy || null
      },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('❌ Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report',
      error: error.message
    });
  }
};

// Block a user account
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body; // Optional: reason for blocking

    console.log('🔍 Blocking user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already blocked
    if (user.status === 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    user.status = 'blocked';
    await user.save();

    console.log('✅ User blocked successfully:', {
      id: user._id,
      email: user.email,
      reason: reason || 'No reason provided'
    });

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        status: user.status
      }
    });
  } catch (err) {
    console.error('❌ Error blocking user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Unblock a user account
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Unblocking user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already active
    if (user.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already active'
      });
    }

    user.status = 'active';
    await user.save();

    console.log('✅ User unblocked successfully:', {
      id: user._id,
      email: user.email
    });

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        status: user.status
      }
    });
  } catch (err) {
    console.error('❌ Error unblocking user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};