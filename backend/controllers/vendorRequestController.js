// controllers/vendorRequestController.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const VendorRequest = require('../models/vendorRequest');
const Event = require('../models/eventModel');
const VendorVote = require('../models/vendorVoteModel');
const BoothPoll = require('../models/boothPollModel');
const Payment = require('../models/paymentModel');
const User = require('../models/userModel');
const { sendVendorRequestStatusEmail } = require('../utils/sendVendorRequestStatusEmail');
const { sendReceiptEmail } = require('../utils/sendReceiptEmail');
const { calculateVendorParticipationFee } = require('../utils/calculateVendorFee');

const getPendingVendorRequestNotifications = async (req, res) => {
  try {
    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(limitParam) ? 10 : Math.min(Math.max(limitParam, 1), 50);

    const pendingRequests = await VendorRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('vendor', 'companyName firstName lastName email phoneNumber')
      .populate('bazaar', 'title name location startDate endDate')
      .populate('booth', 'title name location startDate endDate')
      .lean();

    const notifications = pendingRequests.map((request) => {
      const eventInfo = request.bazaar || request.booth || null;
      const vendorInfo = request.vendor || {};

      return {
        id: request._id,
        status: request.status,
        submittedAt: request.createdAt,
        eventType: request.eventType || (request.bazaar ? 'bazaar' : request.booth ? 'booth' : null),
        event: eventInfo
          ? {
            id: eventInfo._id,
            name: eventInfo.name || eventInfo.title || request.eventName || 'Untitled Event',
            location: eventInfo.location || null,
            startDate: eventInfo.startDate || null,
            endDate: eventInfo.endDate || null
          }
          : null,
        vendor: {
          id: vendorInfo._id || null,
          companyName: vendorInfo.companyName || null,
          firstName: vendorInfo.firstName || null,
          lastName: vendorInfo.lastName || null,
          email: vendorInfo.email || null,
          phoneNumber: vendorInfo.phoneNumber || null
        },
        boothSize: request.boothSize || null,
        durationWeeks: request.durationWeeks || null,
        boothLocation: request.boothLocation || null,
        attendeesCount: Array.isArray(request.attendees) ? request.attendees.length : 0,
        message: request.message || null
      };
    });

    return res.status(200).json({
      success: true,
      totalPending: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('getPendingVendorRequestNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch pending vendor request notifications'
    });
  }
};

// @desc View all vendor participation requests
// @route GET /api/vendor-requests
// @access Events Office / Admin
const getAllVendorRequests = async (req, res) => {
  try {
    console.log('🔍 getAllVendorRequests - Fetching all vendor requests');
    const requests = await VendorRequest.find()
      .populate({
        path: 'vendor',
        select: 'companyName firstName lastName email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'bazaar',
        select: 'title name location startDate endDate description',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'booth',
        select: 'title name location startDate endDate description',
        options: { strictPopulate: false }
      })
      .lean();
    console.log('🔍 getAllVendorRequests - Found requests:', requests.length);

    // Enrich any missing event data from Event collection (for legacy docs where populate fails)
    const missingEventIds = [];
    for (const r of requests) {
      const hasEventObj = !!(r.bazaar || r.booth);
      if (!hasEventObj && (r.bazaar || r.booth)) {
        const id = r.bazaar || r.booth;
        if (id) missingEventIds.push(id);
      }
    }
    let idToEvent = {};
    if (missingEventIds.length) {
      const uniqueIds = [...new Set(missingEventIds.map(String))];
      const found = await Event.find({ _id: { $in: uniqueIds } })
        .select('title name location startDate endDate description')
        .lean();
      for (const e of found) {
        idToEvent[String(e._id)] = e;
      }
    }

    // Get vote counts for all vendor requests
    const requestIds = requests.map(r => String(r._id));
    const voteCounts = await VendorVote.aggregate([
      { $match: { vendorRequest: { $in: requestIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$vendorRequest', count: { $sum: 1 } } }
    ]);

    const voteCountMap = {};
    voteCounts.forEach(item => {
      voteCountMap[String(item._id)] = item.count;
    });

    // Normalize a minimal, frontend-friendly shape while still returning full records
    const normalized = (requests || []).map(r => {
      let event = r.bazaar || r.booth || null;
      if (!event && (r.bazaar || r.booth)) {
        const fallback = idToEvent[String(r.bazaar || r.booth)];
        if (fallback) event = fallback;
      }
      return {
        _id: r._id,
        status: r.status,
        eventType: r.eventType || null, // Include eventType for filtering
        // vendor details (may be undefined if not present)
        vendor: r.vendor ? {
          _id: r.vendor._id,
          companyName: r.vendor.companyName,
          firstName: r.vendor.firstName,
          lastName: r.vendor.lastName,
          email: r.vendor.email,
        } : null,
        // event details
        event: event ? {
          _id: event._id,
          name: event.name || event.title || r.eventName || 'Untitled',
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          description: event.description,
          type: r.bazaar ? 'bazaar' : (r.booth ? (r.eventType || 'booth') : r.eventType),
        } : null,
        // raw fields that might be useful
        bazaar: r.bazaar || null,
        booth: r.booth || null,
        standaloneBooth: r.standaloneBooth || null,
        attendees: r.attendees || [],
        boothSize: r.boothSize,
        durationWeeks: r.durationWeeks,
        boothLocation: r.boothLocation,
        boothId: r.boothId || null,
        startDate: r.startDate || null,
        message: r.message || '',
        voteCount: voteCountMap[String(r._id)] || 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return res.status(200).json({ success: true, requests: normalized });
  } catch (error) {
    console.error('getAllVendorRequests error:', error);
    // Try to return partial results if possible
    // If we can't, return empty array to prevent UI breaking
    try {
      const fallbackRequests = await VendorRequest.find()
        .select('_id status eventType boothSize durationWeeks boothLocation createdAt updatedAt')
        .lean();
      const minimalNormalized = fallbackRequests.map(r => ({
        _id: r._id,
        status: r.status,
        eventType: r.eventType || null,
        vendor: null,
        event: null,
        bazaar: null,
        booth: null,
        standaloneBooth: null,
        attendees: [],
        boothSize: r.boothSize,
        durationWeeks: r.durationWeeks,
        boothLocation: r.boothLocation,
        boothId: null,
        startDate: null,
        message: '',
        voteCount: 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }));
      return res.status(200).json({ success: true, requests: minimalNormalized });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return res.status(200).json({ success: true, requests: [] });
    }
  }
};

// @desc Get a specific vendor request by ID
// @route GET /api/vendor-requests/:id
// @access Events Office / Admin
const getVendorRequestById = async (req, res) => {
  try {
    const request = await VendorRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Vendor request not found" });
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vendor request", error });
  }
};

// @desc Create a new vendor request
// @route POST /api/vendor-requests
// @access Vendor
const createVendorRequest = async (req, res) => {
  try {
    const {
      eventId,
      eventType,
      attendees: rawAttendees,
      boothSize,
      durationWeeks,
      boothLocation,
      boothId,
      startDate,
      message
    } = req.body;

    // If attendees arrives as a JSON string (multipart/form-data), parse it
    let attendees = rawAttendees;
    if (typeof attendees === 'string') {
      try {
        attendees = JSON.parse(attendees);
      } catch (e) {
        attendees = [];
      }
    }

    console.log('🔍 createVendorRequest - Received data:', {
      eventId,
      eventType,
      attendeesCount: attendees?.length,
      boothSize,
      durationWeeks,
      boothLocation,
      boothId,
      startDate,
      hasMessage: !!message
    });

    // Get vendor ID from authenticated user
    const vendorId = req.user._id || req.user.id;
    console.log('🔍 createVendorRequest - Vendor ID:', vendorId);
    console.log('🔍 createVendorRequest - req.user:', req.user);

    if (!vendorId) {
      return res.status(401).json({
        message: 'User ID not found in authentication token',
        error: 'Missing vendor ID'
      });
    }

    // Validate required fields
    if (!eventType) {
      return res.status(400).json({
        message: 'Event type is required',
        error: 'Missing eventType field'
      });
    }

    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({
        message: 'At least one attendee is required',
        error: 'Missing or empty attendees array'
      });
    }

    // Validate attendees structure
    if (!Array.isArray(attendees)) {
      return res.status(400).json({
        message: 'Attendees must be an array',
        error: 'Invalid attendees format'
      });
    }

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      if (!attendee || typeof attendee !== 'object') {
        return res.status(400).json({
          message: `Attendee at index ${i} is invalid`,
          error: 'Invalid attendee structure'
        });
      }
      if (!attendee.name || typeof attendee.name !== 'string' || attendee.name.trim() === '') {
        return res.status(400).json({
          message: `Attendee at index ${i} must have a valid name`,
          error: 'Missing or invalid attendee name'
        });
      }
      if (!attendee.email || typeof attendee.email !== 'string' || attendee.email.trim() === '') {
        return res.status(400).json({
          message: `Attendee at index ${i} must have a valid email`,
          error: 'Missing or invalid attendee email'
        });
      }
      // Clean the attendee data
      attendees[i] = {
        name: attendee.name.trim(),
        email: attendee.email.trim()
      };
    }

    // If request contains uploaded files (multipart), ensure files correspond to attendees
    if (req.files && Array.isArray(req.files)) {
      // require one file per attendee
      if (req.files.length !== attendees.length) {
        return res.status(400).json({
          message: 'Please upload one ID file per attendee',
          error: 'Mismatched number of ID files and attendees'
        });
      }

      // Validate file types
      const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
      for (const f of req.files) {
        const ext = require('path').extname(f.originalname).toLowerCase();
        if (!validExtensions.includes(ext)) {
          // delete uploaded files
          for (const ff of req.files) {
            try { await require('fs').promises.unlink(ff.path); } catch (e) { }
          }
          return res.status(400).json({ message: 'Invalid file type for attendee IDs' });
        }
      }
    }

    // Validate eventType enum
    const validEventTypes = ['bazaar', 'booth', 'standaloneBooth', 'platformBooth'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        message: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
        error: `Invalid eventType: ${eventType}`
      });
    }

    // Validate boothSize if provided
    if (boothSize && !['2x2', '4x4'].includes(boothSize)) {
      return res.status(400).json({
        message: 'Booth size must be either "2x2" or "4x4"',
        error: `Invalid boothSize: ${boothSize}`
      });
    }

    // Validate durationWeeks if provided
    if (durationWeeks !== undefined && durationWeeks !== null) {
      const duration = parseInt(durationWeeks);
      if (isNaN(duration) || duration < 1 || duration > 4) {
        return res.status(400).json({
          message: 'Duration must be a number between 1 and 4 weeks',
          error: `Invalid durationWeeks: ${durationWeeks}`
        });
      }
    }

    // Validate boothLocation if provided
    if (boothLocation) {
      const validLocations = [
        'sports-area', 'parking', 'main-gate', 'platform', 'exam-halls'
      ];
      if (!validLocations.includes(boothLocation)) {
        return res.status(400).json({
          message: `Invalid booth location. Must be one of: ${validLocations.join(', ')}`,
          error: `Invalid boothLocation: ${boothLocation}`
        });
      }
    }

    // Prepare data object, only including fields with valid values
    const requestData = {
      vendor: vendorId,
      eventType,
      attendees,
      status: 'pending'
    };

    // Link event based on type
    if (eventId) {
      if (eventType === 'bazaar') {
        requestData.bazaar = eventId;
      } else if (eventType === 'booth') {
        requestData.booth = eventId;
      } else if (eventType === 'standaloneBooth') {
        requestData.standaloneBooth = eventId;
      } else if (eventType === 'platformBooth') {
        requestData.booth = eventId;
      }
    }

    // Only add optional fields if they have valid values
    if (boothSize && (boothSize === '2x2' || boothSize === '4x4')) {
      requestData.boothSize = boothSize;
    }

    if (durationWeeks !== undefined && durationWeeks !== null && durationWeeks !== '') {
      const duration = parseInt(durationWeeks);
      if (!isNaN(duration) && duration >= 1 && duration <= 4) {
        requestData.durationWeeks = duration;
      }
    }

    if (boothLocation && boothLocation.trim() !== '') {
      requestData.boothLocation = boothLocation.trim();
    }

    if (boothId && boothId.trim() !== '') {
      requestData.boothId = boothId.trim();
    }

    if (startDate) {
      const date = new Date(startDate);
      if (!isNaN(date.getTime())) {
        requestData.startDate = date;
      }
    }

    if (message && message.trim() !== '') {
      requestData.message = message.trim();
    }

    console.log('🔍 createVendorRequest - Final request data:', requestData);

    // If files were uploaded (multipart), include their stored paths
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      requestData.individualIdsPaths = req.files.map(f => '/uploads/' + f.filename);
    }

    // Create the vendor request
    const vendorRequest = new VendorRequest(requestData);

    console.log('🔍 createVendorRequest - Created VendorRequest object:', vendorRequest);

    await vendorRequest.save();
    console.log('🔍 createVendorRequest - Saved successfully with ID:', vendorRequest._id);

    res.status(201).json({
      message: 'Vendor request created successfully',
      request: vendorRequest
    });
  } catch (error) {
    console.error('❌ Error creating vendor request:', error);
    console.error('❌ Error stack:', error.stack);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      console.error('❌ Mongoose Validation Errors:', validationErrors);
      return res.status(400).json({
        message: 'Validation error',
        error: error.message,
        validationErrors: Object.values(validationErrors),
        details: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A vendor request with these details already exists',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Error creating vendor request',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc Accept or reject a vendor participation request
// @route PATCH /api/vendor-requests/:id/status
// @access Events Office / Admin
const updateVendorRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
  }

  try {
    // Find the request first to check if it's a platform booth request
    const request = await VendorRequest.findById(id).populate('vendor', 'companyName firstName lastName email');

    if (!request) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    console.log(`🔍 updateVendorRequestStatus - Request details:`, {
      id: request._id,
      eventType: request.eventType,
      status: request.status,
      newStatus: status,
      hasBooth: !!request.booth,
      boothId: request.booth
    });

    // Update the request status
    request.status = status;

    // If accepting, calculate fee and set payment deadline
    if (status === 'accepted') {
      try {
        // Calculate participation fee
        const fee = calculateVendorParticipationFee(request);
        request.participationFee = fee;
        request.paymentStatus = 'pending';

        // Set payment deadline: 3 days from now
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 3);
        request.paymentDeadline = deadline;

        console.log(`💰 Calculated participation fee: ${fee} EGP`);
        console.log(`📅 Payment deadline: ${deadline.toISOString()}`);
      } catch (error) {
        console.error('❌ Error calculating participation fee:', error);
        // Continue with acceptance even if fee calculation fails
        // Admin can manually set fee later if needed
      }
    } else if (status === 'rejected') {
      // Clear payment info if rejected
      request.participationFee = null;
      request.paymentStatus = null;
      request.paymentDeadline = null;
      request.paidAt = null;
    }

    await request.save();

    // Reload the request to ensure we have the latest data, especially eventType
    const reloadedRequest = await VendorRequest.findById(id).populate('vendor', 'companyName firstName lastName email');
    if (!reloadedRequest) {
      return res.status(404).json({ message: "Vendor request not found after save" });
    }

    console.log(`🔍 updateVendorRequestStatus - Reloaded request details:`, {
      id: reloadedRequest._id,
      eventType: reloadedRequest.eventType,
      status: reloadedRequest.status,
      hasBooth: !!reloadedRequest.booth,
      boothId: reloadedRequest.booth
    });

    // Send email notification to vendor (don't wait for it to complete)
    if (reloadedRequest.vendor && reloadedRequest.vendor.email) {
      sendVendorRequestStatusEmail(reloadedRequest.vendor, reloadedRequest, status)
        .then(result => {
          if (result.sent) {
            console.log(`✅ Email notification sent to vendor: ${reloadedRequest.vendor.email}`);
          } else if (result.stored) {
            console.log(`✅ Email notification stored in database for vendor: ${reloadedRequest.vendor.email}`);
          } else {
            console.log(`⚠️ Email notification could not be sent/stored for vendor: ${reloadedRequest.vendor.email}`);
          }
        })
        .catch(error => {
          console.error('❌ Error sending vendor request status email:', error);
          // Don't throw - email failure shouldn't break the status update
        });
    } else {
      console.log('⚠️ Vendor email not found, skipping email notification');
    }

    // If accepting a platform booth request, create an event
    // Check eventType with case-insensitive comparison to handle any variations
    const isPlatformBooth = reloadedRequest.eventType && 
      (reloadedRequest.eventType.toLowerCase() === 'platformbooth' || 
       reloadedRequest.eventType === 'platformBooth');
    
    if (status === 'accepted' && isPlatformBooth) {
      console.log('🔍 Platform booth request accepted, checking if event needs to be created...');
      
      // Check if an event was already created for this request
      let existingEvent = null;
      if (reloadedRequest.booth) {
        try {
          existingEvent = await Event.findById(reloadedRequest.booth);
          if (existingEvent) {
            console.log('⚠️ Event already exists for this platform booth request:', reloadedRequest.booth);
            console.log('⚠️ Existing event details:', {
              id: existingEvent._id,
              title: existingEvent.title,
              type: existingEvent.type,
              status: existingEvent.status
            });
          } else {
            console.log('⚠️ Booth reference exists but event not found, will create new event');
            reloadedRequest.booth = null; // Clear invalid reference
            await reloadedRequest.save();
          }
        } catch (checkError) {
          console.error('❌ Error checking existing event:', checkError);
          reloadedRequest.booth = null; // Clear invalid reference
          await reloadedRequest.save();
        }
      }
      
      // Create event if it doesn't exist
      if (!existingEvent) {
        try {
          console.log('📅 Creating new event for platform booth request...');
          
          // Calculate dates
          const startDate = reloadedRequest.startDate || new Date();
          const durationWeeks = reloadedRequest.durationWeeks || 1;
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (durationWeeks * 7));

          // Format location name
          const locationName = reloadedRequest.boothLocation
            ? reloadedRequest.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : 'Platform';

          // Create event title
          const vendorName = reloadedRequest.vendor?.companyName ||
            `${reloadedRequest.vendor?.firstName || ''} ${reloadedRequest.vendor?.lastName || ''}`.trim() ||
            'Vendor';
          const eventTitle = `Platform Booth - ${vendorName} - ${locationName}`;

          console.log('📅 Event details:', {
            title: eventTitle,
            startDate: startDate,
            endDate: endDate,
            location: locationName,
            durationWeeks: durationWeeks
          });

          // Create the event
          const newEvent = new Event({
            title: eventTitle,
            description: reloadedRequest.message || `Platform booth reservation by ${vendorName} at ${locationName}`,
            type: 'platformBooth',  // Use 'platformBooth' to distinguish from regular booths
            startDate: startDate,
            endDate: endDate,
            location: locationName,
            boothSize: reloadedRequest.boothSize || '2x2',
            boothNumber: reloadedRequest.boothId ? (parseInt(reloadedRequest.boothId) || 1) : 1, // Use boothId if available, otherwise default to 1
            boothStatus: 'taken', // Mark as taken since it's being reserved
            currentOwner: reloadedRequest.vendor._id, // Set the vendor as the current owner
            occupancyEndDate: endDate, // Set the occupancy end date
            status: 'approved',
            createdBy: req.user._id || req.user.id,
            capacity: 1, // Platform booths typically have capacity of 1
            registeredCount: 0
          });

          await newEvent.save();
          console.log('✅ Created event for platform booth request:', {
            eventId: newEvent._id,
            title: newEvent.title,
            type: newEvent.type,
            status: newEvent.status
          });

          // Link the event to the vendor request
          reloadedRequest.booth = newEvent._id;
          await reloadedRequest.save();
          console.log('✅ Linked event to vendor request');

          // Notify all users about the new event
          try {
            const { notifyNewEventCreated } = require('../services/notificationService');
            await notifyNewEventCreated(newEvent);
            console.log('✅ Notified all users about new platform booth event');
          } catch (notifError) {
            console.error('❌ Error notifying users about new event:', notifError);
            // Don't fail the request if notification fails
          }
        } catch (eventError) {
          console.error('❌ Error creating event for platform booth:', eventError);
          console.error('❌ Error details:', eventError.message);
          console.error('❌ Error stack:', eventError.stack);
          // Re-throw the error so the main catch block can handle it
          throw new Error(`Failed to create event for platform booth: ${eventError.message}`);
        }
      } else {
        console.log('⏭️ Skipping event creation - event already exists');
      }
    } else {
      console.log('⏭️ Not a platform booth request or not accepting:', {
        eventType: reloadedRequest.eventType,
        status: status,
        isPlatformBooth: isPlatformBooth,
        isAccepted: status === 'accepted'
      });
    }

    // Reload one more time to get the final state with the event linked
    const finalRequest = await VendorRequest.findById(id).populate('vendor', 'companyName firstName lastName email');
    
    res.status(200).json({
      message: `Vendor request ${status} successfully.`,
      updatedRequest: finalRequest || reloadedRequest,
    });
  } catch (error) {
    console.error('❌ Error updating vendor request status:', error);
    res.status(500).json({ message: "Error updating vendor request", error: error.message });
  }
};

// @desc Vote for a vendor request
// @route POST /api/vendor-requests/:id/vote
// @access Student, Staff, TA, Professor
const voteForVendorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userType = req.user.userType || req.user.role;

    // Validate user type (only students, staff, TA, professors can vote)
    const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'student', 'staff', 'professor'];
    const normalizedUserType = userType ? String(userType) : '';
    if (!allowedRoles.includes(normalizedUserType)) {
      return res.status(403).json({
        success: false,
        message: 'Only students, staff, TA, and professors can vote for vendor requests'
      });
    }

    // Find the vendor request
    const vendorRequest = await VendorRequest.findById(id);
    if (!vendorRequest) {
      return res.status(404).json({
        success: false,
        message: 'Vendor request not found'
      });
    }

    // Check if user already voted
    const existingVote = await VendorVote.findOne({
      vendorRequest: id,
      user: userId
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this vendor request'
      });
    }

    // Normalize role for storage
    let normalizedRole = normalizedUserType.toLowerCase();
    if (normalizedUserType === 'TA' || normalizedUserType === 'ta') {
      normalizedRole = 'TA';
    }

    // Create vote
    const vote = await VendorVote.create({
      vendorRequest: id,
      user: userId,
      role: normalizedRole
    });

    res.status(201).json({
      success: true,
      message: 'Vote submitted successfully',
      vote
    });
  } catch (error) {
    console.error('Error voting for vendor request:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this vendor request'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error voting for vendor request',
      error: error.message
    });
  }
};

// @desc Remove vote from a vendor request
// @route DELETE /api/vendor-requests/:id/vote
// @access Student, Staff, TA, Professor
const removeVote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find and delete the vote
    const vote = await VendorVote.findOneAndDelete({
      vendorRequest: id,
      user: userId
    });

    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'Vote not found'
      });
    }

    res.json({
      success: true,
      message: 'Vote removed successfully'
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing vote',
      error: error.message
    });
  }
};

// @desc Get vote count and user's vote status for a vendor request
// @route GET /api/vendor-requests/:id/votes
// @access All authenticated users
const getVendorRequestVotes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if vendor request exists
    const vendorRequest = await VendorRequest.findById(id);
    if (!vendorRequest) {
      return res.status(404).json({
        success: false,
        message: 'Vendor request not found'
      });
    }

    // Get total vote count
    const totalVotes = await VendorVote.countDocuments({
      vendorRequest: id
    });

    // Check if current user has voted
    const userVote = await VendorVote.findOne({
      vendorRequest: id,
      user: userId
    });

    // Get vote breakdown by role
    const votesByRole = await VendorVote.aggregate([
      { $match: { vendorRequest: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleBreakdown = {
      student: 0,
      staff: 0,
      TA: 0,
      professor: 0
    };

    votesByRole.forEach(item => {
      roleBreakdown[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        totalVotes,
        hasVoted: !!userVote,
        userVote: userVote ? {
          _id: userVote._id,
          votedAt: userVote.votedAt
        } : null,
        votesByRole: roleBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching vendor request votes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching votes',
      error: error.message
    });
  }
};

// @desc Upload individual IDs for a vendor request
// @route POST /api/vendor-requests/:requestId/individual-ids
// @access Vendor (owner of the request)
const uploadIndividualIds = async (req, res) => {
  try {
    const { requestId } = req.params;
    const vendorId = req.user._id || req.user.id;

    console.log('🔍 uploadIndividualIds - Request ID:', requestId);
    console.log('🔍 uploadIndividualIds - Vendor ID:', vendorId);

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format. Please provide a valid vendor request ID.'
      });
    }

    // Find the vendor request
    const vendorRequest = await VendorRequest.findById(requestId);
    if (!vendorRequest) {
      console.log('❌ Vendor request not found with ID:', requestId);

      // Check if there are any vendor requests for this vendor
      const vendorRequests = await VendorRequest.find({ vendor: vendorId }).select('_id eventName eventType status').limit(5);
      console.log('📋 Available vendor requests for this vendor:', vendorRequests.length);

      return res.status(404).json({
        success: false,
        message: 'Vendor request not found',
        hint: vendorRequests.length > 0
          ? `Available request IDs: ${vendorRequests.map(r => r._id).join(', ')}`
          : 'You may not have any vendor requests yet. Create one first.'
      });
    }

    // Verify the vendor owns this request
    const requestVendorId = vendorRequest.vendor.toString();
    if (requestVendorId !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload IDs for your own vendor requests'
      });
    }

    // Check if file was uploaded
    // Check files were uploaded
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one individual IDs file (PDF or image)'
      });
    }

    // Validate file types and collect file paths
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
    const uploadedPaths = [];

    for (const file of req.files) {
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        // Delete all uploaded files from this request before returning error
        for (const f of req.files) {
          try { await fs.unlink(f.path); } catch (e) { /* ignore */ }
        }
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${validExtensions.join(', ')}`
        });
      }
      uploadedPaths.push('/uploads/' + file.filename);
    }

    // Delete old files if exist
    if (vendorRequest.individualIdsPaths && Array.isArray(vendorRequest.individualIdsPaths)) {
      for (const oldRel of vendorRequest.individualIdsPaths) {
        const oldFilePath = path.join(__dirname, '..', oldRel);
        try {
          await fs.unlink(oldFilePath);
          console.log('Deleted old individual IDs file:', oldFilePath);
        } catch (error) {
          console.log('Note: Could not delete old file:', error.message);
        }
      }
    }

    // Update vendor request with new file paths
    vendorRequest.individualIdsPaths = uploadedPaths;
    await vendorRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Individual IDs uploaded successfully',
      vendorRequest: {
        id: vendorRequest._id,
        eventType: vendorRequest.eventType,
        eventName: vendorRequest.eventName,
        hasIndividualIds: (vendorRequest.individualIdsPaths || []).length > 0,
        individualIdsPaths: vendorRequest.individualIdsPaths
      }
    });
  } catch (error) {
    console.error('Error uploading individual IDs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading individual IDs',
      error: error.message
    });
  }
};

// @desc Get payment details for a vendor request
// @route GET /api/vendor-requests/:requestId/payment
// @access Vendor (owner of the request)
const getVendorRequestPayment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const vendorId = req.user._id || req.user.id;

    // Find the vendor request
    const vendorRequest = await VendorRequest.findById(requestId);
    if (!vendorRequest) {
      return res.status(404).json({
        success: false,
        message: 'Vendor request not found'
      });
    }

    // Verify the vendor owns this request
    const requestVendorId = vendorRequest.vendor.toString();
    if (requestVendorId !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view payment details for your own vendor requests'
      });
    }

    // Check if request is accepted
    if (vendorRequest.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Payment is only required for accepted requests'
      });
    }

    // Check if payment is required
    if (!vendorRequest.participationFee || vendorRequest.participationFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No payment required for this request'
      });
    }

    // Check if already paid
    const existingPayment = await Payment.findOne({
      vendorRequest: requestId,
      user: vendorId,
      status: 'success'
    });

    // Calculate days until deadline
    let daysUntilDeadline = null;
    let isOverdue = false;
    if (vendorRequest.paymentDeadline) {
      const now = new Date();
      const deadline = new Date(vendorRequest.paymentDeadline);
      const diffTime = deadline - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysUntilDeadline = diffDays;
      isOverdue = diffTime < 0;
    }

    return res.status(200).json({
      success: true,
      payment: {
        requestId: vendorRequest._id,
        eventName: vendorRequest.eventName,
        eventType: vendorRequest.eventType,
        amount: vendorRequest.participationFee,
        paymentStatus: vendorRequest.paymentStatus,
        paymentDeadline: vendorRequest.paymentDeadline,
        paidAt: vendorRequest.paidAt,
        daysUntilDeadline: daysUntilDeadline,
        isOverdue: isOverdue,
        isPaid: existingPayment !== null || vendorRequest.paymentStatus === 'paid'
      }
    });
  } catch (error) {
    console.error('Error getting vendor request payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting payment details',
      error: error.message
    });
  }
};

// @desc Pay participation fee for a vendor request
// @route POST /api/vendor-requests/:requestId/payment
// @access Vendor (owner of the request)
const payVendorRequestFee = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { paymentMethod } = req.body;
    const vendorId = req.user._id || req.user.id;

    if (!paymentMethod || !['wallet', 'card'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be 'wallet' or 'card'"
      });
    }

    // Find the vendor request
    const vendorRequest = await VendorRequest.findById(requestId).populate('vendor');
    if (!vendorRequest) {
      return res.status(404).json({
        success: false,
        message: 'Vendor request not found'
      });
    }

    // Verify the vendor owns this request
    const requestVendorId = vendorRequest.vendor._id.toString();
    if (requestVendorId !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own vendor requests'
      });
    }

    // Check if request is accepted
    if (vendorRequest.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Payment is only required for accepted requests'
      });
    }

    // Check if payment is required
    if (!vendorRequest.participationFee || vendorRequest.participationFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No payment required for this request'
      });
    }

    // Check if already paid
    if (vendorRequest.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this request'
      });
    }

    // Check if payment deadline has passed
    if (vendorRequest.paymentDeadline && new Date() > new Date(vendorRequest.paymentDeadline)) {
      vendorRequest.paymentStatus = 'overdue';
      await vendorRequest.save();
      return res.status(400).json({
        success: false,
        message: 'Payment deadline has passed. Please contact the Events Office.'
      });
    }

    // Handle wallet payment
    if (paymentMethod === 'wallet') {
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (!vendor.walletBalance || vendor.walletBalance < vendorRequest.participationFee) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance',
          required: vendorRequest.participationFee,
          available: vendor.walletBalance || 0
        });
      }

      // Deduct from wallet
      vendor.walletBalance -= vendorRequest.participationFee;
      vendor.walletTransactions.push({
        amount: -vendorRequest.participationFee,
        type: 'payment',
        description: `Participation fee for ${vendorRequest.eventName}`,
        balanceAfter: vendor.walletBalance,
        reference: vendorRequest._id.toString()
      });
      await vendor.save();

      // Create payment record
      const payment = new Payment({
        user: vendorId,
        vendorRequest: requestId,
        amount: vendorRequest.participationFee,
        paymentMethod: 'wallet',
        status: 'success'
      });
      await payment.save();

      // Update vendor request
      vendorRequest.paymentStatus = 'paid';
      vendorRequest.paidAt = new Date();
      await vendorRequest.save();

      // Send payment receipt email (don't wait for it to complete)
      // Get vendor's personal name for greeting
      const vendorPersonalName = `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.companyName || 'Vendor';
      const vendorCompanyName = vendor.companyName || 'Your Company';

      // Build event title with more details
      let eventTitle = vendorRequest.eventName || 'Vendor Request';
      if (vendorRequest.eventType) {
        const eventTypeDisplay = {
          'bazaar': 'Bazaar',
          'booth': 'Booth',
          'standaloneBooth': 'Standalone Booth',
          'platformBooth': 'Platform Booth'
        }[vendorRequest.eventType] || vendorRequest.eventType;

        if (vendorRequest.eventName) {
          eventTitle = `${eventTypeDisplay} - ${vendorRequest.eventName}`;
        } else {
          eventTitle = `${eventTypeDisplay} Participation`;
        }
      }

      // Build additional details for receipt
      const receiptDetails = {
        eventType: vendorRequest.eventType,
        boothSize: vendorRequest.boothSize,
        durationWeeks: vendorRequest.durationWeeks,
        boothLocation: vendorRequest.boothLocation
      };

      sendReceiptEmail(
        vendor.email,
        vendorPersonalName,
        eventTitle,
        vendorRequest.participationFee,
        'wallet',
        vendorRequest.paidAt,
        receiptDetails
      )
        .then(result => {
          if (result.sent) {
            console.log(`✅ Payment receipt email sent to vendor: ${vendor.email}`);
          } else if (result.reason === 'SMTP not configured') {
            console.log(`📧 Payment receipt email stored in database for vendor: ${vendor.email}`);
            console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
          } else {
            console.log(`⚠️ Payment receipt email could not be sent for vendor: ${vendor.email}`);
          }
        })
        .catch(error => {
          console.error('❌ Error sending payment receipt email:', error);
          // Don't throw - email failure shouldn't break the payment
        });

      return res.status(200).json({
        success: true,
        message: 'Payment completed successfully',
        payment: {
          id: payment._id,
          amount: payment.amount,
          method: payment.paymentMethod,
          status: payment.status,
          paidAt: vendorRequest.paidAt
        }
      });
    }

    // Handle card payment (Stripe)
    if (paymentMethod === 'card') {
      const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

      if (!stripe) {
        // Stripe not configured - simulate a successful card payment for local/dev environments
        try {
          const cardNumberRaw = req.body.cardNumber || req.body.card_number || '';
          const cardLast4 = (String(cardNumberRaw).replace(/\D/g, '') || '').slice(-4) || null;

          // Create a successful payment record
          const payment = new Payment({
            user: vendorId,
            vendorRequest: requestId,
            amount: vendorRequest.participationFee,
            paymentMethod: 'card',
            status: 'success',
            cardLast4: cardLast4
          });
          await payment.save();

          // Update vendor request
          vendorRequest.paymentStatus = 'paid';
          vendorRequest.paidAt = new Date();
          await vendorRequest.save();

          // Send payment receipt email asynchronously
          const vendorPersonalName = `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.companyName || 'Vendor';
          const vendorCompanyName = vendor.companyName || 'Your Company';
          let eventTitle = vendorRequest.eventName || 'Vendor Request';
          if (vendorRequest.eventType) {
            const eventTypeDisplay = {
              'bazaar': 'Bazaar',
              'booth': 'Booth',
              'standaloneBooth': 'Standalone Booth',
              'platformBooth': 'Platform Booth'
            }[vendorRequest.eventType] || vendorRequest.eventType;

            if (vendorRequest.eventName) {
              eventTitle = `${eventTypeDisplay} - ${vendorRequest.eventName}`;
            } else {
              eventTitle = `${eventTypeDisplay} Participation`;
            }
          }

          const receiptDetails = {
            eventType: vendorRequest.eventType,
            boothSize: vendorRequest.boothSize,
            durationWeeks: vendorRequest.durationWeeks,
            boothLocation: vendorRequest.boothLocation
          };

          sendReceiptEmail(
            vendor.email,
            vendorPersonalName,
            eventTitle,
            vendorRequest.participationFee,
            'card',
            vendorRequest.paidAt,
            receiptDetails
          ).catch(err => console.error('Error sending receipt email (simulated card):', err));

          return res.status(200).json({
            success: true,
            message: 'Payment completed (simulated).',
            payment: {
              id: payment._id,
              amount: payment.amount,
              method: payment.paymentMethod,
              status: payment.status,
              paidAt: vendorRequest.paidAt,
              cardLast4: cardLast4
            }
          });
        } catch (err) {
          console.error('Error simulating card payment:', err);
          return res.status(500).json({ success: false, message: 'Error processing simulated card payment', error: err.message });
        }
      }

      // Get vendor details
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Vendor';

      // Create payment record first
      const payment = new Payment({
        user: vendorId,
        vendorRequest: requestId,
        amount: vendorRequest.participationFee,
        paymentMethod: 'card',
        status: 'pending'
      });
      await payment.save();

      // Create Stripe checkout session
      const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'egp',
              product_data: {
                name: `Participation Fee - ${vendorRequest.eventName}`,
                description: `${vendorRequest.eventType} participation fee for ${vendorName}`
              },
              unit_amount: vendorRequest.participationFee * 100 // Convert to piastres (EGP * 100)
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${backendUrl}/api/vendor-requests/payment-success?session_id={CHECKOUT_SESSION_ID}&type=vendor-request&requestId=${requestId}`,
        cancel_url: `${clientUrl}/payment-cancel?type=vendor-request&requestId=${requestId}`,
        metadata: {
          paymentId: payment._id.toString(),
          vendorRequestId: requestId,
          userId: vendorId.toString(),
          type: 'vendor-request'
        }
      });

      // Update payment with session ID
      payment.stripeSessionId = session.id;
      await payment.save();

      return res.status(200).json({
        success: true,
        message: 'Stripe checkout session created',
        checkoutUrl: session.url,
        sessionId: session.id
      });
    }
  } catch (error) {
    console.error('Error processing vendor request payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

// @desc Cancel a vendor request (vendor can only cancel if payment hasn't been made)
// @route DELETE /api/vendor-requests/:requestId
// @access Vendor (owner only)
const cancelVendorRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const vendorId = req.user._id || req.user.id;

    console.log('🔍 cancelVendorRequest - Request ID:', requestId);
    console.log('🔍 cancelVendorRequest - Vendor ID:', vendorId);

    // Validate request ID format
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    // Find the vendor request
    const vendorRequest = await VendorRequest.findById(requestId);
    if (!vendorRequest) {
      return res.status(404).json({
        success: false,
        message: 'Vendor request not found'
      });
    }

    // Check if vendor owns this request
    const requestVendorId = vendorRequest.vendor.toString();
    if (requestVendorId !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own vendor requests'
      });
    }

    // Check if request is already cancelled
    if (vendorRequest.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This vendor request has already been cancelled'
      });
    }

    // Check if payment has been made
    if (vendorRequest.paymentStatus === 'paid' || vendorRequest.paidAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel vendor request. Payment has already been made. Please contact the Events Office for assistance.',
        paymentStatus: vendorRequest.paymentStatus,
        paidAt: vendorRequest.paidAt
      });
    }

    // Cancel the request
    vendorRequest.status = 'cancelled';

    // Clear payment-related fields if they exist (since request is cancelled before payment)
    if (vendorRequest.paymentStatus === 'pending') {
      vendorRequest.paymentStatus = null;
      vendorRequest.paymentDeadline = null;
    }

    await vendorRequest.save();

    console.log('✅ Vendor request cancelled successfully:', requestId);

    return res.status(200).json({
      success: true,
      message: 'Vendor request cancelled successfully',
      vendorRequest: {
        id: vendorRequest._id,
        status: vendorRequest.status,
        eventType: vendorRequest.eventType,
        eventName: vendorRequest.eventName
      }
    });
  } catch (error) {
    console.error('❌ Error cancelling vendor request:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling vendor request',
      error: error.message
    });
  }
};

// @desc Create a booth poll for conflicting vendor requests
// @route POST /api/vendor-requests/polls
// @access Events Office / Admin
const createBoothPoll = async (req, res) => {
  try {
    const { title, description, vendorRequestIds } = req.body;

    if (!title || !description || !Array.isArray(vendorRequestIds) || vendorRequestIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and at least 2 vendor request IDs are required'
      });
    }

    // Verify all vendor requests exist and are pending
    const vendorRequests = await VendorRequest.find({
      _id: { $in: vendorRequestIds },
      status: 'pending'
    }).populate('vendor', 'companyName firstName lastName');

    if (vendorRequests.length !== vendorRequestIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some vendor requests not found or not in pending status'
      });
    }

    // Create poll options
    const options = vendorRequests.map(vr => ({
      vendorRequest: vr._id,
      description: `${vr.vendor.companyName || `${vr.vendor.firstName} ${vr.vendor.lastName}`} - ${vr.boothSize || 'N/A'} booth, ${vr.durationWeeks || 'N/A'} weeks`
    }));

    const poll = new BoothPoll({
      title,
      description,
      options,
      createdBy: req.user._id
    });

    await poll.save();

    res.status(201).json({
      success: true,
      message: 'Booth poll created successfully',
      poll
    });

  } catch (error) {
    console.error('Error creating booth poll:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booth poll',
      error: error.message
    });
  }
};

// @desc Get all booth polls
// @route GET /api/vendor-requests/polls
// @access Events Office / Admin
const getBoothPolls = async (req, res) => {
  try {
    console.log('🔍 getBoothPolls - Function called');
    console.log('🔍 getBoothPolls - User:', req.user?.email || req.user?._id);
    
    // Use the same approach as getPublicBoothPolls - Mongoose populate handles missing references gracefully
    const polls = await BoothPoll.find()
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'options.vendorRequest',
        select: 'vendor boothSize durationWeeks boothLocation message eventName eventType',
        populate: {
          path: 'vendor',
          select: 'companyName firstName lastName',
          model: 'User',
          options: { strictPopulate: false }
        },
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });
    
    console.log('🔍 getBoothPolls - Found polls:', polls.length);

    // Calculate vote counts and format response
    const pollsWithVotes = polls.map(poll => {
      const voteCounts = {};
      if (poll.votes && Array.isArray(poll.votes)) {
        poll.votes.forEach(vote => {
          const index = vote.optionIndex;
          voteCounts[index] = (voteCounts[index] || 0) + 1;
        });
      }

      return {
        _id: poll._id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        createdBy: poll.createdBy,
        options: poll.options.map((option, index) => ({
          ...option,
          vendorRequest: option.vendorRequest || null, // Mongoose populate handles missing refs
          voteCount: voteCounts[index] || 0
        })),
        totalVotes: poll.votes ? poll.votes.length : 0,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      };
    });

    console.log('🔍 getBoothPolls - Returning polls:', pollsWithVotes.length);
    res.json({
      success: true,
      polls: pollsWithVotes
    });
  } catch (error) {
    console.error('❌ Error fetching booth polls:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    // Return empty array instead of error to prevent UI breaking
    res.status(200).json({
      success: true,
      polls: [],
      message: 'Error loading polls, but continuing with empty list'
    });
  }
};

// @desc Vote in a booth poll
// @route POST /api/vendor-requests/polls/:pollId/vote
// @access Vendors
const voteInBoothPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid option index is required'
      });
    }

    const poll = await BoothPoll.findById(pollId);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Poll is not active'
      });
    }

    if (optionIndex >= poll.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option index'
      });
    }

    // Check if user already voted
    const existingVoteIndex = poll.votes.findIndex(vote => vote.user.toString() === req.user._id.toString());
    
    if (existingVoteIndex !== -1) {
      // User already voted - check if clicking the same option (deselect) or different option (change vote)
      const existingVote = poll.votes[existingVoteIndex];
      
      if (existingVote.optionIndex === optionIndex) {
        // User clicked the same option - remove vote (deselect)
        poll.votes.splice(existingVoteIndex, 1);
        
        await poll.save();

        return res.json({
          success: true,
          message: 'Vote removed successfully'
        });
      } else {
        // User clicked different option - update vote
        poll.votes[existingVoteIndex].optionIndex = optionIndex;
        poll.votes[existingVoteIndex].votedAt = new Date();
        
        await poll.save();

        return res.json({
          success: true,
          message: 'Vote updated successfully'
        });
      }
    }

    // Add new vote
    poll.votes.push({
      user: req.user._id,
      optionIndex
    });

    await poll.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully'
    });

  } catch (error) {
    console.error('Error voting in booth poll:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording vote',
      error: error.message
    });
  }
};

// @desc Close a booth poll
// @route PATCH /api/vendor-requests/polls/:pollId/close
// @access Events Office / Admin
const closeBoothPoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await BoothPoll.findById(pollId);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Poll is already closed'
      });
    }

    poll.status = 'closed';
    poll.closedAt = new Date();
    await poll.save();

    res.json({
      success: true,
      message: 'Poll closed successfully',
      poll
    });

  } catch (error) {
    console.error('Error closing booth poll:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing poll',
      error: error.message
    });
  }
};

// @desc Get public booth polls (for Students/Staff/TA/Professor to vote)
// @route GET /api/vendor-requests/polls/public
// @access Students, Staff, TA, Professor
const getPublicBoothPolls = async (req, res) => {
  try {
    const polls = await BoothPoll.find({ status: 'active' })
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'options.vendorRequest',
        populate: {
          path: 'vendor',
          select: 'companyName firstName lastName'
        },
        select: 'vendor boothSize durationWeeks boothLocation message'
      })
      .sort({ createdAt: -1 });

    // Check which polls the user has already voted in
    const userId = req.user._id;
    const pollsWithVoteStatus = polls.map(poll => {
      const userVote = poll.votes.find(vote => vote.user.toString() === userId.toString());
      const voteCounts = poll.options.map((_, index) => 
        poll.votes.filter(v => v.optionIndex === index).length
      );
      
      return {
        _id: poll._id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        options: poll.options.map((option, index) => ({
          vendorRequest: option.vendorRequest,
          description: option.description,
          voteCount: voteCounts[index]
        })),
        totalVotes: poll.votes.length,
        hasVoted: !!userVote,
        userVoteIndex: userVote ? userVote.optionIndex : null,
        createdAt: poll.createdAt
      };
    });

    res.json({
      success: true,
      polls: pollsWithVoteStatus
    });
  } catch (error) {
    console.error('Error fetching public booth polls:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching polls',
      error: error.message
    });
  }
};

// @desc Get booth poll results
// @route GET /api/vendor-requests/polls/:pollId/results
// @access Events Office / Admin
const getBoothPollResults = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await BoothPoll.findById(pollId)
      .populate({
        path: 'options.vendorRequest',
        select: 'vendor boothSize durationWeeks boothLocation message eventName eventType',
        populate: {
          path: 'vendor',
          select: 'companyName firstName lastName',
          model: 'User',
          options: { strictPopulate: false }
        },
        options: { strictPopulate: false }
      })
      .populate('votes.user', 'companyName firstName lastName')
      .lean();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Calculate vote counts
    const voteCounts = {};
    poll.options.forEach((option, index) => {
      voteCounts[index] = 0;
    });

    poll.votes.forEach(vote => {
      voteCounts[vote.optionIndex]++;
    });

    // Sort options by vote count descending and handle missing vendor requests
    const results = poll.options.map((option, index) => {
      const vendorRequest = option.vendorRequest || {};
      const vendor = vendorRequest?.vendor || {};
      
      return {
        optionIndex: index,
        vendorRequest: vendorRequest._id ? {
          _id: vendorRequest._id,
          vendor: vendor._id ? {
            _id: vendor._id,
            companyName: vendor.companyName || '',
            firstName: vendor.firstName || '',
            lastName: vendor.lastName || ''
          } : null,
          boothSize: vendorRequest.boothSize || null,
          durationWeeks: vendorRequest.durationWeeks || null,
          boothLocation: vendorRequest.boothLocation || null,
          message: vendorRequest.message || null,
          eventName: vendorRequest.eventName || null,
          eventType: vendorRequest.eventType || null
        } : null,
        description: option.description,
        voteCount: voteCounts[index] || 0
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    res.json({
      success: true,
      poll: {
        _id: poll._id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        totalVotes: poll.votes.length,
        results
      }
    });

  } catch (error) {
    console.error('Error fetching booth poll results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching poll results',
      error: error.message
    });
  }
};

// @desc Handle Stripe payment success callback
// @route GET /api/vendor-requests/payment-success
// @access Public (called by Stripe redirect)
const handleStripePaymentSuccess = async (req, res) => {
  try {
    const { session_id, type, requestId } = req.query;

    console.log('🔔 Stripe payment success callback received');
    console.log('   Session ID:', session_id);
    console.log('   Type:', type);
    console.log('   Request ID:', requestId);

    if (!session_id) {
      console.error('❌ Missing session_id in payment success callback');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Missing session ID`);
    }

    // Retrieve the Stripe session (requires Stripe instance)
    let stripe = null;
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      }
    } catch (error) {
      console.error('❌ Stripe not configured');
    }

    if (!stripe) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Stripe not configured`);
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('📋 Stripe session retrieved. Payment status:', session.payment_status);

    if (session.payment_status !== 'paid') {
      console.warn('⚠️ Payment status is not paid:', session.payment_status);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Payment not completed`);
    }

    // Find the payment record
    const payment = await Payment.findOne({ stripeSessionId: session_id });
    if (!payment) {
      console.error('❌ Payment record not found for session:', session_id);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Payment record not found`);
    }

    console.log('💳 Found payment record. Current status:', payment.status);

    // If already processed, just redirect
    if (payment.status === 'success') {
      console.log('✅ Payment already processed');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-success?session_id=${session_id}`);
    }

    // Update payment status
    console.log('🔄 Updating payment status to success...');
    payment.status = 'success';
    payment.stripePaymentIntentId = session.payment_intent;
    await payment.save();
    console.log('✅ Payment status updated');

    // Update vendor request
    if (payment.vendorRequest) {
      console.log('🔍 Processing vendor request payment...');
      const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
      if (vendorRequest) {
        vendorRequest.paymentStatus = 'paid';
        vendorRequest.paidAt = new Date();
        await vendorRequest.save();
        console.log('✅ Vendor request marked as paid');
      }
    }

    // Fetch user for email
    const user = await User.findById(payment.user);
    if (user) {
      console.log('📧 Sending receipt email...');
      const vendorPersonalName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.companyName || user.email;
      let eventTitle = 'Vendor Request';
      let receiptDetails = {};

      if (payment.vendorRequest) {
        const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
        if (vendorRequest) {
          // Build event title
          if (vendorRequest.eventType) {
            const eventTypeDisplay = {
              'bazaar': 'Bazaar',
              'booth': 'Booth',
              'standaloneBooth': 'Standalone Booth',
              'platformBooth': 'Platform Booth'
            }[vendorRequest.eventType] || vendorRequest.eventType;

            if (vendorRequest.eventName) {
              eventTitle = `${eventTypeDisplay} - ${vendorRequest.eventName}`;
            } else {
              eventTitle = `${eventTypeDisplay} Participation`;
            }
          }

          // Build receipt details
          receiptDetails = {
            eventType: vendorRequest.eventType,
            boothSize: vendorRequest.boothSize,
            durationWeeks: vendorRequest.durationWeeks,
            boothLocation: vendorRequest.boothLocation
          };
        }
      }

      try {
        const { sendReceiptEmail } = require('../utils/sendReceiptEmail');
        const emailResult = await sendReceiptEmail(
          user.email,
          vendorPersonalName,
          eventTitle,
          payment.amount,
          'card',
          new Date(),
          receiptDetails
        );

        if (emailResult.sent) {
          console.log('✅ Receipt email sent successfully');
        } else {
          console.error('❌ Receipt email not sent:', emailResult.reason || emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending receipt email:', emailError.message);
        // Don't fail the entire process if email fails
      }
    }

    console.log('✅ Payment processing complete. Redirecting...');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // If this was a vendor-request payment, redirect vendors straight to their dashboard
    if (type === 'vendor-request' || (payment && payment.vendorRequest)) {
      return res.redirect(`${clientUrl}/dashboard`);
    }

    // Default: redirect to generic payment success page
    res.redirect(`${clientUrl}/payment-success?session_id=${session_id}`);

  } catch (error) {
    console.error('❌ Error processing payment success:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/payment-error?error=${encodeURIComponent(error.message)}`);
  }
};

module.exports = {
  getPendingVendorRequestNotifications,
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus,
  voteForVendorRequest,
  removeVote,
  getVendorRequestVotes,
  uploadIndividualIds,
  getVendorRequestPayment,
  payVendorRequestFee,
  cancelVendorRequest,
  createBoothPoll,
  getBoothPolls,
  getPublicBoothPolls,
  voteInBoothPoll,
  closeBoothPoll,
  getBoothPollResults,
  handleStripePaymentSuccess,
};
