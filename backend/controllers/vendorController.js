const User = require('../models/userModel.js');
const Bazaar = require('../models/bazaarModel.js'); // legacy (unused for upcoming)
const Booth = require('../models/boothModel.js');   // legacy (unused for upcoming)
const VendorRequest = require('../models/vendorRequest.js');
const Event = require('../models/eventModel.js');
const { sampleVendors } = require('../scripts/test-vendor-loyalty-program.js');

module.exports.getLoyaltyProgramVendors = async (req, res) => {
  try {
    const vendors = (sampleVendors || []).map((vendor) => ({
      id: vendor.id || vendor.vendorName,
      vendorName: vendor.vendorName,
      category: vendor.category || null,
      description: vendor.description || null,
      discountRate: vendor.discountRate,
      discountType: vendor.discountType || 'percentage',
      promoCode: vendor.promoCode,
      termsAndConditions: vendor.termsAndConditions,
      validFrom: vendor.validFrom || null,
      validUntil: vendor.validUntil || null,
      logoUrl: vendor.logoUrl || null,
      updatedAt: vendor.updatedAt || null
    }));

    return res.status(200).json({
      success: true,
      count: vendors.length,
      vendors
    });
  } catch (error) {
    console.error('Server error in getLoyaltyProgramVendors:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch loyalty program vendors'
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
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const vendorId = req.user._id || req.user.id;
    const { eventId, attendees, boothSize, durationWeeks, boothLocation, message, eventType, isStandalone } = req.body;

    // Validate vendor role
    const vendor = await User.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.userType !== 'Vendor') return res.status(403).json({ message: 'Unauthorized' });

    // Attendees validated by frontend selection (max 5), no error message needed
    if (attendees.length > 5) return res.status(400).json({ message: 'Max 5 attendees exceeded' });

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
    
    if (!event) return res.status(404).json({ message: 'Invalid event or booth' });
    if (event.type !== 'bazaar' && event.type !== 'booth') {
      return res.status(400).json({ message: 'Event type must be bazaar or booth' });
    }

    // Validate specific requirements based on event type
    if (event.type === 'bazaar' && !boothSize) {
      return res.status(400).json({ message: 'Booth size required for bazaar' });
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
          'main-entrance', 'food-court', 'central-plaza', 'student-center',
          'library-area', 'gym-entrance', 'parking-lot', 'garden-section',
          'auditorium-hall', 'cafeteria-area'
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
      if (eventType === 'booth' || eventType === 'standaloneBooth') {
        existingRequest.durationWeeks = durationWeeks;
        if (eventType === 'booth') {
          existingRequest.boothLocation = (boothLocation && boothLocation.trim() !== '') ? boothLocation : undefined;
        }
      }
      if (typeof message === 'string') existingRequest.message = message;
      await existingRequest.save();
      return res.status(200).json({ message: 'Application updated' });
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
    console.log('🔍 Saved VendorRequest with ID:', request._id);
    res.status(201).json({ message: 'Application submitted' });
  } catch (error) {
    console.error('Server error in applyToEvent:', error);
    res.status(500).json({ message: 'Server error' });
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
            attendees: r.attendees || [],
            boothSize: r.boothSize || undefined
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
            attendees: r.attendees || [],
            durationWeeks: r.durationWeeks || undefined,
            boothLocation: r.boothLocation || undefined
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
        attendees: r.attendees || [],
        boothSize: r.boothSize || undefined,
        durationWeeks: r.durationWeeks || undefined,
        boothLocation: r.boothLocation || undefined,
        boothId: r.boothId || undefined,
        createdAt: r.createdAt,
        message: r.message || undefined
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