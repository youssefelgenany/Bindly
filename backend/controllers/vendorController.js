const User = require('../models/userModel.js');
const Bazaar = require('../models/bazaarModel.js'); // legacy (unused for upcoming)
const Booth = require('../models/boothModel.js');   // legacy (unused for upcoming)
const VendorRequest = require('../models/vendorRequest.js');
const Event = require('../models/eventModel.js');
const VendorLoyaltyProgram = require('../models/vendorLoyaltyProgramModel.js');
const { sampleVendors } = require('../scripts/test-vendor-loyalty-program.js');
const path = require('path');
const fs = require('fs').promises;

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  process.env.BASE_URL ||
  process.env.BACKEND_BASE_URL ||
  'http://localhost:5000';

const buildAbsoluteLogoUrl = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const cleaned = rawPath.trim().replace(/\\/g, '/');
  if (!cleaned) return null;
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('data:')
  ) {
    return cleaned;
  }
  const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return `${APP_BASE_URL}${normalized}`;
};

// Get all vendors (for admin/events office to get vendor IDs)
module.exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ userType: 'Vendor' })
      .select('_id companyName email firstName lastName vendorLogoPath vendorTaxCardPath isVerified status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const vendorList = vendors.map((vendor) => ({
      id: vendor._id,
      companyName: vendor.companyName || null,
      email: vendor.email,
      firstName: vendor.firstName || null,
      lastName: vendor.lastName || null,
      isVerified: vendor.isVerified || false,
      status: vendor.status || 'blocked',
      hasLogo: !!vendor.vendorLogoPath,
      hasTaxCard: !!vendor.vendorTaxCardPath,
      createdAt: vendor.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: vendorList.length,
      vendors: vendorList
    });
  } catch (error) {
    console.error('Server error in getAllVendors:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch vendors'
    });
  }
};

module.exports.getLoyaltyProgramVendors = async (req, res) => {
  try {
    const VendorLoyaltyProgram = require('../models/vendorLoyaltyProgramModel');
    
    // Get all active loyalty program vendors from database
    const vendors = await VendorLoyaltyProgram.find({ isActive: true })
      .sort({ vendorName: 1 })
      .lean();

    let logoFallbackMap = new Map();
    const vendorNameKeys = vendors
      .map((vendor) => (vendor.vendorName || '').trim())
      .filter(Boolean);

    if (vendorNameKeys.length) {
      const vendorDocs = await User.find({
        userType: 'Vendor',
        companyName: { $in: vendorNameKeys }
      })
        .select('companyName vendorLogoPath')
        .lean();

      vendorDocs.forEach((doc) => {
        const key = (doc.companyName || '').trim().toLowerCase();
        if (key && doc.vendorLogoPath) {
          logoFallbackMap.set(key, doc.vendorLogoPath);
        }
      });
    }

    const formattedVendors = vendors.map((vendor) => ({
      id: vendor._id.toString(),
      vendorName: vendor.vendorName,
      category: vendor.category || null,
      description: vendor.description || null,
      discountRate: vendor.discountRate,
      discountType: vendor.discountType || 'percentage',
      promoCode: vendor.promoCode,
      termsAndConditions: vendor.termsAndConditions,
      validFrom: vendor.validFrom || null,
      validUntil: vendor.validUntil || null,
      logoUrl: buildAbsoluteLogoUrl(
        vendor.logoUrl ||
        logoFallbackMap.get((vendor.vendorName || '').trim().toLowerCase())
      ),
      isActive: vendor.isActive,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt || null
    }));

    return res.status(200).json({
      success: true,
      count: formattedVendors.length,
      vendors: formattedVendors
    });
  } catch (error) {
    console.error('Server error in getLoyaltyProgramVendors:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch loyalty program vendors',
      error: error.message
    });
  }
};
// View upcoming bazaars/booths
module.exports.viewUpcomingEvents = async (req, res) => {
  try {
    const { type } = req.query;
    if (!['bazaar', 'booth', 'trip', 'standaloneBooth'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const now = new Date();

    // Handle standaloneBooth type separately
    if (type === 'standaloneBooth') {
      const standaloneBooths = await Event.find({
        type: 'booth', // Changed from 'standaloneBooth' to 'booth' to show real booth events
        status: 'approved' // Show approved booth events
      })
        .populate('createdBy', 'firstName lastName email')
        .sort({ startDate: 1 })
        .lean();

      // Map booth events structure to match frontend expectations
      const mappedBooths = standaloneBooths.map(booth => ({
        _id: booth._id,
        name: booth.title,
        title: booth.title,
        description: booth.description,
        startDate: booth.startDate,
        endDate: booth.endDate,
        location: booth.location,
        capacity: booth.capacity,
        price: booth.price,
        status: booth.status,
        type: 'standaloneBooth' // Keep the frontend type as standaloneBooth for compatibility
      }));

      return res.json(mappedBooths);
    }

    // Read from unified events collection for other types
    const docs = await Event.find({
      type,
      startDate: { $gt: now },
      status: 'approved',
    })
      .select('title startDate endDate location description _id capacity price')
      .sort({ startDate: 1 })
      .lean();

    // Map title -> name to match existing frontend expectations
    const mapped = (docs || []).map(e => ({
      _id: e._id,
      name: e.title,
      location: e.location,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      capacity: e.capacity,
      price: e.price,
    }));

    // If type is 'bazaar', also include related booth information
    if (type === 'bazaar') {
      const bazaarsWithBooths = await Promise.all(
        mapped.map(async (bazaar) => {
          // Find booth events that are related to this bazaar
          const boothEvents = await Event.find({
            type: 'booth',
            location: bazaar.location,
            startDate: { $gte: bazaar.startDate },
            endDate: { $lte: bazaar.endDate },
            status: 'approved'
          }).select('title description startDate endDate location capacity price').lean();

          // If no real booths found, add mock booths for demonstration
          let booths = boothEvents.map(booth => ({
            _id: booth._id,
            name: booth.title,
            description: booth.description,
            startDate: booth.startDate,
            endDate: booth.endDate,
            location: booth.location,
            capacity: booth.capacity,
            price: booth.price
          }));

          // Add mock booths if none exist
          if (booths.length === 0) {
            booths = [
              {
                _id: `mock-booth-1-${bazaar._id}`,
                name: 'Premium Booth A',
                description: 'Large premium booth with excellent visibility and foot traffic. Perfect for established vendors.',
                startDate: bazaar.startDate,
                endDate: bazaar.endDate,
                location: bazaar.location,
                capacity: 50,
                price: 200
              },
              {
                _id: `mock-booth-2-${bazaar._id}`,
                name: 'Standard Booth B',
                description: 'Standard sized booth perfect for most vendors. Good balance of space and cost.',
                startDate: bazaar.startDate,
                endDate: bazaar.endDate,
                location: bazaar.location,
                capacity: 30,
                price: 150
              },
              {
                _id: `mock-booth-3-${bazaar._id}`,
                name: 'Economy Booth C',
                description: 'Budget-friendly booth option for small vendors and startups.',
                startDate: bazaar.startDate,
                endDate: bazaar.endDate,
                location: bazaar.location,
                capacity: 20,
                price: 100
              },
              {
                _id: `mock-booth-4-${bazaar._id}`,
                name: 'Corner Booth D',
                description: 'Prime corner location with maximum visibility and foot traffic.',
                startDate: bazaar.startDate,
                endDate: bazaar.endDate,
                location: bazaar.location,
                capacity: 40,
                price: 180
              }
            ];
          }

          return {
            ...bazaar,
            booths: booths
          };
        })
      );
      return res.json(bazaarsWithBooths);
    }

    return res.json(mapped);
  } catch (error) {
    console.error('Server error in viewUpcomingEvents:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Apply to bazaar or booth
module.exports.applyToEvent = async (req, res) => {
  try {
    console.log('🔍 applyToEvent - Request received');
    console.log('🔍 applyToEvent - User:', req.user?.email || req.user?._id);
    console.log('🔍 applyToEvent - Body keys:', Object.keys(req.body || {}));
    console.log('🔍 applyToEvent - Files:', req.files?.length || 0);
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required', success: false });
    }

    const vendorId = req.user._id || req.user.id;
    const { eventId, attendees: rawAttendees, boothSize, durationWeeks, boothLocation, message, eventType, isStandalone } = req.body;
    
    console.log('🔍 applyToEvent - eventId:', eventId);
    console.log('🔍 applyToEvent - eventType:', eventType);
    console.log('🔍 applyToEvent - boothSize:', boothSize);
    console.log('🔍 applyToEvent - attendees count:', Array.isArray(rawAttendees) ? rawAttendees.length : typeof rawAttendees);

    // Parse attendees when sent as JSON string (multipart/form-data) or ensure it's an array
    let attendees = rawAttendees;
    if (typeof attendees === 'string') {
      try {
        attendees = JSON.parse(attendees);
      } catch (e) {
        // If parse fails, fallback to empty array
        attendees = [];
      }
    }
    if (!Array.isArray(attendees)) attendees = [];

    // Validate vendor role
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      console.error('❌ Vendor not found:', vendorId);
      return res.status(404).json({ message: 'Vendor not found', success: false });
    }
    if (vendor.userType !== 'Vendor') {
      console.error('❌ User is not a vendor:', vendor.userType);
      return res.status(403).json({ message: 'Unauthorized. Only vendors can apply to events.', success: false });
    }

    // Validate attendees
    if (!attendees || attendees.length === 0) {
      console.error('❌ No attendees provided');
      return res.status(400).json({ message: 'At least one attendee is required', success: false });
    }
    if (attendees.length > 5) {
      console.error('❌ Too many attendees:', attendees.length);
      return res.status(400).json({ message: 'Maximum 5 attendees allowed', success: false });
    }

    // Fetch event from 'events' collection or standalone booth from 'booths' collection
    let event = await Event.findById(eventId);
    let isStandaloneBooth = false;

    // If not found in events, check if it's a standalone booth
    if (!event) {
      event = await Booth.findById(eventId);
      if (event) {
        isStandaloneBooth = true;
        // Convert booth to event-like structure for compatibility
        event = {
          ...event.toObject(),
          type: 'booth',
          title: event.name
        };
      }
    }

    if (!event) {
      console.error('❌ Event not found:', eventId);
      return res.status(404).json({ message: 'Event or booth not found. Please check the event ID.', success: false });
    }
    if (event.type !== 'bazaar' && event.type !== 'booth') {
      console.error('❌ Invalid event type:', event.type);
      return res.status(400).json({ message: `Invalid event type: ${event.type}. Only bazaar and booth events are supported.`, success: false });
    }

    // Validate specific requirements based on event type
    if (event.type === 'bazaar' && !boothSize) {
      console.error('❌ Booth size missing for bazaar');
      return res.status(400).json({ message: 'Booth size is required for bazaar applications', success: false });
    }
    if (event.type === 'booth') {
      // Check if this is a standalone booth event based on eventType parameter
      const isStandaloneBooth = eventType === 'standaloneBooth';

      if (isStandaloneBooth) {
        // For standalone booth events, only duration is required
        if (!durationWeeks || durationWeeks < 1 || durationWeeks > 4) {
          return res.status(400).json({ message: 'Valid duration (1-4 weeks) required for standalone booth' });
        }
      } else {
        // For regular booth events, both duration and location are required
        if (!durationWeeks || !boothLocation || durationWeeks < 1 || durationWeeks > 4) {
          return res.status(400).json({ message: 'Valid duration (1-4 weeks) and platform location required for booth' });
        }

        // Validate booth location is from predefined list
        const validLocations = [
          'sports-area', 'parking', 'main-gate', 'platform', 'exam-halls'
        ];

        if (!boothLocation || boothLocation.trim() === '' || !validLocations.includes(boothLocation)) {
          return res.status(400).json({ message: 'Valid booth location is required. Please select from the provided options.' });
        }
      }
    }

    const existingRequest = await VendorRequest.findOne({
      vendor: vendorId,
      $or: [
        { bazaar: eventId },
        { booth: eventId },
        { standaloneBooth: eventId }
      ]
    });
    if (existingRequest) {
      // Update existing application instead of rejecting duplicates
      existingRequest.attendees = attendees;
      existingRequest.boothSize = boothSize;
      // Handle uploaded attendee IDs files (multiple)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        existingRequest.individualIdsPaths = req.files.map(f => '/uploads/' + f.filename);
      }
      if (eventType === 'booth' || eventType === 'standaloneBooth') {
        existingRequest.durationWeeks = durationWeeks;
        if (eventType === 'booth') {
          existingRequest.boothLocation = (boothLocation && boothLocation.trim() !== '') ? boothLocation : undefined;
        }
      }
      if (typeof message === 'string') existingRequest.message = message;
      await existingRequest.save();
      console.log('✅ Application updated successfully');
      return res.status(200).json({ message: 'Application updated successfully', success: true });
    }

    const requestData = {
      vendor: vendorId,
      attendees,
      boothSize: event.type === 'bazaar' ? boothSize : undefined,
      durationWeeks: event.type === 'booth' ? durationWeeks : undefined,
      boothLocation: (event.type === 'booth' && eventType === 'booth' && boothLocation && boothLocation.trim() !== '') ? boothLocation : undefined,
      message,
      // denormalized fields for quick access
      eventName: event.title || event.name,
      eventType: eventType, // Use the eventType from the request, not the event's type
    };

    // If attendee IDs files were uploaded, include their paths
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      requestData.individualIdsPaths = req.files.map(f => '/uploads/' + f.filename);
    }

    // Set the correct reference field based on event type and source
    if (event.type === 'bazaar') {
      requestData.bazaar = eventId;
    } else if (event.type === 'booth') {
      // All booth events (regular and standalone) use the booth field
      requestData.booth = eventId;
    }

    console.log('🔍 Creating new VendorRequest with data:', requestData);
    const request = new VendorRequest(requestData);
    await request.save();
    console.log('✅ Saved VendorRequest with ID:', request._id);
    
    // Notify Events Office users about the new vendor request
    try {
      const notificationService = require('../services/notificationService');
      const vendor = await User.findById(req.user._id);
      const event = await Event.findById(eventId);
      if (vendor && event) {
        await notificationService.notifyVendorRequest(request, vendor, event);
      }
    } catch (notifError) {
      console.error('Error creating vendor request notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json({ message: 'Application submitted', success: true });
  } catch (error) {
    console.error('❌ Server error in applyToEvent:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ 
        message: 'Validation error',
        error: error.message,
        validationErrors: Object.values(validationErrors),
        success: false
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A vendor request with these details already exists',
        error: error.message,
        success: false
      });
    }
    
    // Return detailed error message in development, generic in production
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Server error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      success: false
    });
  }
};

module.exports.getParticipants = async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!['bazaar', 'booth'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const filter = type === 'bazaar' ? { bazaar: id } : { booth: id };
    filter.status = 'accepted';

    const requests = await VendorRequest.find(filter)
      .populate('vendor', 'companyName firstName lastName email')
      .select('vendor attendees boothSize createdAt');

    const participants = requests.map(r => ({
      id: r._id,
      companyName: r.vendor?.companyName || `${r.vendor?.firstName || ''} ${r.vendor?.lastName || ''}`.trim(),
      email: r.vendor?.email || '',
      attendees: r.attendees || [],
      boothSize: r.boothSize || null,
      joinedAt: r.createdAt
    }));

    return res.json({ success: true, participants });
  } catch (error) {
    console.error('Server error in getParticipants:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get upcoming bazaars/booths the logged-in vendor is accepted for
module.exports.getMyAcceptedUpcoming = async (req, res) => {
  try {
    const vendorId = req.user && (req.user.id || req.user._id);
    if (!vendorId) return res.status(401).json({ message: 'Unauthorized' });

    const { type } = req.query; // 'bazaar' | 'booth' | undefined
    const now = new Date();

    const buildQuery = (eventKey) => ({
      vendor: vendorId,
      status: 'accepted',
      [eventKey]: { $ne: null }
    });

    const pickFields = 'name startDate endDate location description _id';

    const fetchForType = async (t) => {
      if (t === 'bazaar') {
        const requests = await VendorRequest.find(buildQuery('bazaar'))
          .populate({ path: 'bazaar', select: pickFields })
          .lean();
        const eventsOnly = (requests || [])
          .map(r => r.bazaar)
          .filter(e => e && new Date(e.startDate) > now);
        return eventsOnly.map(e => ({ ...e, type: 'bazaar' }));
      }
      if (t === 'booth') {
        const requests = await VendorRequest.find(buildQuery('booth'))
          .populate({ path: 'booth', select: pickFields })
          .lean();
        const eventsOnly = (requests || [])
          .map(r => r.booth)
          .filter(e => e && new Date(e.startDate) > now);
        return eventsOnly.map(e => ({ ...e, type: 'booth' }));
      }
      return [];
    };

    if (type === 'bazaar' || type === 'booth') {
      const list = await fetchForType(type);
      return res.json({ success: true, events: list });
    }

    // Fetch accepted platform booth requests
    const fetchAcceptedPlatformBooths = async () => {
      const query = {
        vendor: vendorId,
        status: 'accepted',
        eventType: 'platformBooth'
      };
      const requests = await VendorRequest.find(query).lean();
      return (requests || []).map(r => ({
        _id: r._id,
        title: 'Platform Booth',
        name: `Platform Booth - ${r.boothLocation ? r.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Location TBD'}`,
        description: r.message || 'Platform booth reservation',
        startDate: r.startDate || r.createdAt,
        endDate: r.startDate ? new Date(new Date(r.startDate).getTime() + (r.durationWeeks || 1) * 7 * 24 * 60 * 60 * 1000) : null,
        location: r.boothLocation ? r.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Platform',
        type: 'platformBooth',
        eventType: 'platformBooth',
        attendees: r.attendees || [],
        boothSize: r.boothSize || undefined,
        durationWeeks: r.durationWeeks || undefined,
        boothLocation: r.boothLocation || undefined
      }));
    };

    if (type === 'platformBooth') {
      const list = await fetchAcceptedPlatformBooths();
      return res.json({ success: true, events: list });
    }

    // If no specific type requested, return combined list
    const [bazaars, booths, platformBooths] = await Promise.all([
      fetchForType('bazaar'),
      fetchForType('booth'),
      fetchAcceptedPlatformBooths()
    ]);
    const combined = [...bazaars, ...booths, ...platformBooths].sort((a, b) => {
      const dateA = new Date(a.startDate || 0);
      const dateB = new Date(b.startDate || 0);
      return dateA - dateB; // Ascending: nearest first
    });
    return res.json({ success: true, events: combined });
  } catch (error) {
    console.error('Server error in getMyAcceptedUpcoming:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get pending/rejected requests by the vendor for upcoming bazaars/booths
module.exports.getMyRequests = async (req, res) => {
  try {
    const vendorId = req.user && (req.user.id || req.user._id);
    if (!vendorId) return res.status(401).json({ message: 'Unauthorized' });

    const { status = 'pending', type } = req.query; // status: pending|rejected|accepted|all
    if (!['pending', 'rejected', 'accepted', 'all'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pickFields = 'name title startDate endDate location description _id';

    const buildQuery = (eventKey) => ({
      vendor: vendorId,
      ...(status === 'all' ? {} : { status }),
      [eventKey]: { $ne: null }
    });

    const fetchForType = async (t) => {
      if (t === 'bazaar') {
        const requests = await VendorRequest.find(buildQuery('bazaar'))
          .populate({ path: 'bazaar', select: pickFields })
          .lean();
        return (requests || [])
          .filter(r => r.bazaar)
          .map(r => ({
            _id: r.bazaar._id,
            title: r.bazaar.title,
            name: r.bazaar.name || r.bazaar.title,
            description: r.bazaar.description,
            startDate: r.bazaar.startDate,
            endDate: r.bazaar.endDate,
            location: r.bazaar.location,
            type: 'bazaar',
            requestId: r._id,
            status: r.status,
            paymentStatus: r.paymentStatus || 'pending',
            paidAt: r.paidAt || null,
            attendees: r.attendees || [],
            boothSize: r.boothSize || undefined,
            qrCode: r.qrCode || undefined,
            qrCodeData: r.qrCodeData || undefined
          }));
      }
      if (t === 'booth') {
        const requests = await VendorRequest.find(buildQuery('booth'))
          .populate({ path: 'booth', select: pickFields })
          .lean();
        return (requests || [])
          .filter(r => r.booth)
          .map(r => ({
            _id: r.booth._id,
            title: r.booth.title,
            name: r.booth.name || r.booth.title,
            description: r.booth.description,
            startDate: r.booth.startDate,
            endDate: r.booth.endDate,
            location: r.booth.location,
            type: r.eventType || 'booth',
            requestId: r._id,
            status: r.status,
            paymentStatus: r.paymentStatus || 'pending',
            paidAt: r.paidAt || null,
            attendees: r.attendees || [],
            durationWeeks: r.durationWeeks || undefined,
            boothLocation: r.boothLocation || undefined,
            qrCode: r.qrCode || undefined,
            qrCodeData: r.qrCodeData || undefined
          }));
      }
      return [];
    };

    // Fetch platform booth requests (they don't have bazaar/booth fields)
    const fetchPlatformBooths = async () => {
      const query = {
        vendor: vendorId,
        ...(status === 'all' ? {} : { status }),
        eventType: 'platformBooth'
      };
      const requests = await VendorRequest.find(query).lean();
      return (requests || []).map(r => ({
        _id: r._id, // Use request ID as the main ID
        title: 'Platform Booth',
        name: `Platform Booth - ${r.boothLocation ? r.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Location TBD'}`,
        description: r.message || 'Platform booth reservation request',
        startDate: r.startDate || r.createdAt,
        endDate: r.startDate ? new Date(new Date(r.startDate).getTime() + (r.durationWeeks || 1) * 7 * 24 * 60 * 60 * 1000) : null,
        location: r.boothLocation ? r.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Platform',
        type: 'platformBooth',
        eventType: 'platformBooth',
        requestId: r._id,
        status: r.status,
        paymentStatus: r.paymentStatus || 'pending',
        paidAt: r.paidAt || null,
        attendees: r.attendees || [],
        boothSize: r.boothSize || undefined,
        durationWeeks: r.durationWeeks || undefined,
        boothLocation: r.boothLocation || undefined,
        boothId: r.boothId || undefined,
        createdAt: r.createdAt,
        message: r.message || undefined,
        qrCode: r.qrCode || undefined,
        qrCodeData: r.qrCodeData || undefined
      }));
    };

    if (type === 'bazaar' || type === 'booth' || type === 'standaloneBooth') {
      // Treat standaloneBooth the same as booth since they're both stored in Event collection
      const actualType = type === 'standaloneBooth' ? 'booth' : type;
      const list = await fetchForType(actualType);
      return res.json({ success: true, events: list, status });
    }

    if (type === 'platformBooth') {
      const list = await fetchPlatformBooths();
      return res.json({ success: true, events: list, status });
    }

    // If no type specified, fetch all types
    const [bazaars, booths, platformBooths] = await Promise.all([
      fetchForType('bazaar'),
      fetchForType('booth'),
      fetchPlatformBooths()
    ]);
    const combined = [...bazaars, ...booths, ...platformBooths].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || 0);
      const dateB = new Date(b.createdAt || b.startDate || 0);
      return dateB - dateA; // Most recent first
    });
    return res.json({ success: true, events: combined, status });
  } catch (error) {
    console.error('Server error in getMyRequests:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Upload/Update vendor tax card and logo
// @route POST /api/vendor/my/documents
// @access Vendor (authenticated)
module.exports.uploadVendorDocuments = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const vendorId = req.user._id || req.user.id;

    // Verify vendor role
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    if (vendor.userType !== 'Vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can upload documents'
      });
    }

    const files = req.files || {};
    const logo = files.vendorLogo && files.vendorLogo[0];
    const taxCard = files.vendorTaxCard && files.vendorTaxCard[0];

    // Check if at least one file is provided
    if (!logo && !taxCard) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one file (vendorLogo or vendorTaxCard)'
      });
    }

    const updateData = {};
    const filesToDelete = [];

    // Handle logo upload
    if (logo) {
      // Validate logo is an image
      const logoExt = path.extname(logo.originalname).toLowerCase();
      const validImageExts = ['.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
      if (!validImageExts.includes(logoExt)) {
        return res.status(400).json({
          success: false,
          message: 'Logo must be an image file (PNG, JPG, JPEG, JFIF, WEBP, GIF, or BMP)'
        });
      }

      // Delete old logo if exists
      if (vendor.vendorLogoPath) {
        const oldLogoPath = path.join(__dirname, '..', vendor.vendorLogoPath);
        filesToDelete.push(oldLogoPath);
      }

      // Set new logo path
      updateData.vendorLogoPath = '/uploads/' + logo.filename;
    }

    // Handle tax card upload
    if (taxCard) {
      // Validate tax card is PDF or image
      const taxExt = path.extname(taxCard.originalname).toLowerCase();
      const validTaxExts = ['.pdf', '.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
      if (!validTaxExts.includes(taxExt)) {
        return res.status(400).json({
          success: false,
          message: 'Tax card must be a PDF or image file'
        });
      }

      // Delete old tax card if exists
      if (vendor.vendorTaxCardPath) {
        const oldTaxPath = path.join(__dirname, '..', vendor.vendorTaxCardPath);
        filesToDelete.push(oldTaxPath);
      }

      // Set new tax card path
      updateData.vendorTaxCardPath = '/uploads/' + taxCard.filename;
    }

    // Delete old files (don't fail if file doesn't exist)
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, continue
        console.log(`Note: Could not delete old file ${filePath}:`, error.message);
      }
    }

    // Update vendor in database
    Object.assign(vendor, updateData);
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      vendor: {
        id: vendor._id,
        companyName: vendor.companyName,
        email: vendor.email,
        hasLogo: !!vendor.vendorLogoPath,
        hasTaxCard: !!vendor.vendorTaxCardPath,
        logoPath: vendor.vendorLogoPath || null,
        taxCardPath: vendor.vendorTaxCardPath || null
      }
    });
  } catch (error) {
    console.error('Error uploading vendor documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading documents',
      error: error.message
    });
  }
};

// 🎯 Apply to Vendor Loyalty Program
module.exports.applyToLoyaltyProgram = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { discountRate, discountType, promoCode, termsAndConditions, validFrom, validUntil, description, category } = req.body;

    // Validate required fields
    if (!discountRate || !promoCode || !termsAndConditions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: discountRate, promoCode, termsAndConditions'
      });
    }

    // Validate discount rate
    if (typeof discountRate !== 'number' || discountRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount rate must be a positive number'
      });
    }

    // Validate discount type
    if (discountType && !['percentage', 'amount'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be either "percentage" or "amount"'
      });
    }

    // Get vendor details
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.userType !== 'Vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if vendor already has an active loyalty program application
    const existingApplication = await VendorLoyaltyProgram.findOne({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`,
      isActive: true
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active loyalty program application. Update it instead.'
      });
    }

    // If there's an inactive application, reactivate it instead of creating a new one
    const inactiveApplication = await VendorLoyaltyProgram.findOne({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`,
      isActive: false
    });

    if (inactiveApplication) {
      // Reactivate and update the existing application
      inactiveApplication.discountRate = discountRate;
      inactiveApplication.discountType = discountType || 'percentage';
      inactiveApplication.promoCode = promoCode.toUpperCase();
      inactiveApplication.termsAndConditions = termsAndConditions;
      inactiveApplication.validFrom = validFrom ? new Date(validFrom) : new Date();
      inactiveApplication.validUntil = validUntil ? new Date(validUntil) : null;
      inactiveApplication.description = description || '';
      inactiveApplication.category = category || '';
      inactiveApplication.isActive = true;
      inactiveApplication.logoUrl = buildAbsoluteLogoUrl(
        vendor.vendorLogoPath || vendor.logoUrl || vendor.companyLogo
      );
      await inactiveApplication.save();

      return res.status(200).json({
        success: true,
        message: 'Loyalty program application reactivated successfully',
        application: {
          _id: inactiveApplication._id,
          vendorName: inactiveApplication.vendorName,
          discountRate: inactiveApplication.discountRate,
          discountType: inactiveApplication.discountType,
          promoCode: inactiveApplication.promoCode,
          termsAndConditions: inactiveApplication.termsAndConditions,
          validFrom: inactiveApplication.validFrom,
          validUntil: inactiveApplication.validUntil,
          isActive: inactiveApplication.isActive,
          createdAt: inactiveApplication.createdAt,
          updatedAt: inactiveApplication.updatedAt
        }
      });
    }

    // Create new loyalty program application
    const loyaltyApplication = new VendorLoyaltyProgram({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`,
      description: description || '',
      category: category || '',
      discountRate,
      discountType: discountType || 'percentage',
      promoCode: promoCode.toUpperCase(),
      termsAndConditions,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: true,
      logoUrl: buildAbsoluteLogoUrl(
        vendor.vendorLogoPath || vendor.logoUrl || vendor.companyLogo
      )
    });

    await loyaltyApplication.save();

    return res.status(201).json({
      success: true,
      message: 'Loyalty program application submitted successfully',
      application: {
        _id: loyaltyApplication._id,
        vendorName: loyaltyApplication.vendorName,
        discountRate: loyaltyApplication.discountRate,
        discountType: loyaltyApplication.discountType,
        promoCode: loyaltyApplication.promoCode,
        termsAndConditions: loyaltyApplication.termsAndConditions,
        validFrom: loyaltyApplication.validFrom,
        validUntil: loyaltyApplication.validUntil,
        isActive: loyaltyApplication.isActive,
        createdAt: loyaltyApplication.createdAt
      }
    });
  } catch (error) {
    console.error('Error applying to loyalty program:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting loyalty program application',
      error: error.message
    });
  }
};

// 📋 Get My Loyalty Program Application
module.exports.getMyLoyaltyApplication = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get vendor details
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.userType !== 'Vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Find vendor's loyalty program application (active or inactive)
    const application = await VendorLoyaltyProgram.findOne({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No loyalty program application found'
      });
    }

    return res.status(200).json({
      success: true,
      application: {
        _id: application._id,
        vendorName: application.vendorName,
        description: application.description,
        category: application.category,
        discountRate: application.discountRate,
        discountType: application.discountType,
        promoCode: application.promoCode,
        termsAndConditions: application.termsAndConditions,
        validFrom: application.validFrom,
        validUntil: application.validUntil,
        isActive: application.isActive,
        logoUrl: buildAbsoluteLogoUrl(application.logoUrl),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching loyalty program application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching loyalty program application',
      error: error.message
    });
  }
};

// ✏️ Update My Loyalty Program Application
module.exports.updateLoyaltyApplication = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { discountRate, discountType, promoCode, termsAndConditions, validFrom, validUntil, description, category, isActive } = req.body;

    // Get vendor details
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.userType !== 'Vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Find vendor's loyalty program application
    const application = await VendorLoyaltyProgram.findOne({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No loyalty program application found'
      });
    }

    // Update fields if provided
    if (discountRate !== undefined) {
      if (typeof discountRate !== 'number' || discountRate < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount rate must be a positive number'
        });
      }
      application.discountRate = discountRate;
    }

    if (discountType) {
      if (!['percentage', 'amount'].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: 'Discount type must be either "percentage" or "amount"'
        });
      }
      application.discountType = discountType;
    }

    if (promoCode) application.promoCode = promoCode.toUpperCase();
    if (termsAndConditions) application.termsAndConditions = termsAndConditions;
    if (description !== undefined) application.description = description;
    if (category !== undefined) application.category = category;
    if (validFrom) application.validFrom = new Date(validFrom);
    if (validUntil) application.validUntil = new Date(validUntil);
    if (isActive !== undefined) application.isActive = isActive;

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Loyalty program application updated successfully',
      application: {
        _id: application._id,
        vendorName: application.vendorName,
        description: application.description,
        category: application.category,
        discountRate: application.discountRate,
        discountType: application.discountType,
        promoCode: application.promoCode,
        termsAndConditions: application.termsAndConditions,
        validFrom: application.validFrom,
        validUntil: application.validUntil,
        isActive: application.isActive,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating loyalty program application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating loyalty program application',
      error: error.message
    });
  }
};

// ❌ Cancel Loyalty Program Application
module.exports.cancelLoyaltyProgram = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get vendor details
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.userType !== 'Vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Find vendor's loyalty program application (active or inactive)
    const application = await VendorLoyaltyProgram.findOne({
      vendorName: vendor.companyName || `${vendor.firstName} ${vendor.lastName}`
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No loyalty program application found to cancel'
      });
    }

    // Check if already inactive
    if (!application.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your loyalty program application is already cancelled'
      });
    }

    // Mark as inactive (soft delete approach - preserve data)
    application.isActive = false;
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Loyalty program application cancelled successfully',
      application: {
        _id: application._id,
        vendorName: application.vendorName,
        promoCode: application.promoCode,
        isActive: application.isActive,
        cancelledAt: new Date(),
        message: 'Your loyalty program has been deactivated. You can reactivate it anytime.'
      }
    });
  } catch (error) {
    console.error('Error cancelling loyalty program:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling loyalty program application',
      error: error.message
    });
  }
};