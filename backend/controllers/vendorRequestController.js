// controllers/vendorRequestController.js
const VendorRequest = require('../models/vendorRequest');
const Event = require('../models/eventModel');

// @desc View all vendor participation requests
// @route GET /api/vendor-requests
// @access Events Office / Admin
const getAllVendorRequests = async (req, res) => {
  try {
    const requests = await VendorRequest.find()
      .populate('vendor', 'companyName firstName lastName email')
      .populate('bazaar', 'title name location startDate endDate description')
      .populate('booth', 'title name location startDate endDate description')
      .lean();

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
          type: r.bazaar ? 'bazaar' : (r.booth ? 'booth' : r.eventType),
        } : null,
        // raw fields that might be useful
        bazaar: r.bazaar || null,
        booth: r.booth || null,
        attendees: r.attendees || [],
        boothSize: r.boothSize,
        durationWeeks: r.durationWeeks,
        boothLocation: r.boothLocation,
        message: r.message || '',
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
    console.log('Creating vendor request:', req.body);
    console.log('User:', req.user);
    
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
    const vendorId = req.user._id;
    console.log('Vendor ID:', vendorId);

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

module.exports = {
  getAllVendorRequests,
  getVendorRequestById,
  createVendorRequest,
  updateVendorRequestStatus,
};
