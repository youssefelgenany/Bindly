// controllers/vendorRequestController.js
const mongoose = require('mongoose');
const VendorRequest = require('../models/vendorRequest');
const Event = require('../models/eventModel');
const VendorVote = require('../models/vendorVoteModel');

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
        attendees: r.attendees || [],
        boothSize: r.boothSize,
        durationWeeks: r.durationWeeks,
        boothLocation: r.boothLocation,
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

    // Get vendor ID from authenticated user
    const vendorId = req.user.id;

    // Create the vendor request
    const vendorRequest = new VendorRequest({
      vendor: vendorId,
      eventType,
      attendees,
      boothSize,
      durationWeeks,
      boothLocation,
      boothId,
      startDate: startDate ? new Date(startDate) : undefined,
      message,
      status: 'pending'
    });

    await vendorRequest.save();

    res.status(201).json({
      message: 'Vendor request created successfully',
      request: vendorRequest
    });
  } catch (error) {
    console.error('Error creating vendor request:', error);
    res.status(500).json({ message: 'Error creating vendor request', error: error.message });
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
    const request = await VendorRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    res.status(200).json({
      message: `Vendor request ${status} successfully.`,
      updatedRequest: request,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating vendor request", error });
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
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus,
  voteForVendorRequest,
  removeVote,
  getVendorRequestVotes,
};
