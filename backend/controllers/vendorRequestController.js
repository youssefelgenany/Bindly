// controllers/vendorRequestController.js
const mongoose = require('mongoose');
const VendorRequest = require('../models/vendorRequest');
const Event = require('../models/eventModel');
const VendorVote = require('../models/vendorVoteModel');

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
      .populate('vendor', 'companyName firstName lastName email')
      .populate('bazaar', 'title name location startDate endDate description')
      .populate('booth', 'title name location startDate endDate description')
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
    return res.status(500).json({ message: "Error fetching vendor requests", error: error.message });
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
      eventType,
      attendees,
      boothSize,
      durationWeeks,
      boothLocation,
      boothId,
      startDate,
      message
    } = req.body;

    console.log('🔍 createVendorRequest - Received data:', {
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
        'main-entrance', 'food-court', 'central-plaza', 'student-center',
        'library-area', 'gym-entrance', 'parking-lot', 'garden-section',
        'auditorium-hall', 'cafeteria-area'
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

    // Update the request status
    request.status = status;
    await request.save();

    // If accepting a platform booth request, create an event
    if (status === 'accepted' && request.eventType === 'platformBooth') {
      // Check if an event was already created for this request
      if (request.booth) {
        console.log('⚠️ Event already exists for this platform booth request:', request.booth);
      } else {
        try {
          // Calculate dates
          const startDate = request.startDate || new Date();
          const durationWeeks = request.durationWeeks || 1;
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (durationWeeks * 7));

          // Format location name
          const locationName = request.boothLocation 
            ? request.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : 'Platform';

          // Create event title
          const vendorName = request.vendor?.companyName || 
            `${request.vendor?.firstName || ''} ${request.vendor?.lastName || ''}`.trim() || 
            'Vendor';
          const eventTitle = `Platform Booth - ${vendorName} - ${locationName}`;

          // Create the event
          const newEvent = new Event({
            title: eventTitle,
            description: request.message || `Platform booth reservation by ${vendorName} at ${locationName}`,
            type: 'standaloneBooth',
            startDate: startDate,
            endDate: endDate,
            location: locationName,
            boothSize: request.boothSize || '2x2',
            boothNumber: request.boothId ? (parseInt(request.boothId) || 1) : 1, // Use boothId if available, otherwise default to 1
            boothStatus: 'taken', // Mark as taken since it's being reserved
            currentOwner: request.vendor._id, // Set the vendor as the current owner
            occupancyEndDate: endDate, // Set the occupancy end date
            status: 'approved',
            createdBy: req.user._id || req.user.id,
            capacity: 1, // Platform booths typically have capacity of 1
            registeredCount: 0
          });

          await newEvent.save();
          console.log('✅ Created event for platform booth request:', newEvent._id);

          // Link the event to the vendor request
          request.booth = newEvent._id;
          await request.save();
          console.log('✅ Linked event to vendor request');
        } catch (eventError) {
          console.error('❌ Error creating event for platform booth:', eventError);
          console.error('❌ Error details:', eventError.message);
          console.error('❌ Error stack:', eventError.stack);
          // Re-throw the error so the main catch block can handle it
          throw new Error(`Failed to create event for platform booth: ${eventError.message}`);
        }
      }
    }

    res.status(200).json({
      message: `Vendor request ${status} successfully.`,
      updatedRequest: request,
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

module.exports = {
  getPendingVendorRequestNotifications,
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus,
  voteForVendorRequest,
  removeVote,
  getVendorRequestVotes,
};
