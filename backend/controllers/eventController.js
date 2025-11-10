const Event = require("../models/eventModel");
const Registration = require("../models/registrationModel");
const Trip = require("../models/tripModel");
const VendorRequest = require("../models/vendorRequest");
// 🎯 Create a new event (Admin or Event Office)
exports.createEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      startDate, 
      endDate, 
      location, 
      capacity,
      agenda,
      faculty,
      professors,
      extraResources,
      bannerFile
    } = req.body;

    if (!title || !type || !startDate || !endDate || !location) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const newEvent = new Event({
      title,
      description,
      type,
      startDate,
      endDate,
      location,
      capacity: capacity || 100,
      createdBy: req.user._id,
      status: req.user.userType === "Professor" ? "pending" : "approved", // Professors submit for approval
      // Workshop-specific fields
      agenda,
      faculty,
      professors,
      extraResources,
      bannerFile
    });

    await newEvent.save();
    res.status(201).json({ msg: "Event created successfully", event: newEvent });
  } catch (err) {
    console.error("❌ Error creating event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create a new conference (Admin or Event Office)
exports.createConference = async (req, res) => {
  try {
    const {
      title, startDate, endDate, location, agenda, website, budget, fundingSource
    } = req.body || {};

    if (!title || !startDate || !endDate || !location || !agenda || !website || budget == null || !fundingSource) {
      return res.status(400).json({ msg: "Missing required conference fields" });
    }

    const newConference = new Event({
      ...req.body,
      type: "conference",
      createdBy: req.user ? req.user._id : undefined,
      status: "approved"
    });

    await newConference.save();
    return res.status(201).json({ msg: "Conference created", conference: newConference });
  } catch (err) {
    console.error("createConference error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// 📅 Get all approved/upcoming events
exports.getAllEvents = async (req, res) => {
  try {
    const { q, name, type, status } = req.query;
    const search = (q || name || '').toString().trim();

    // Base match (type/status) - exclude 'other' type events
    const baseMatch = {
      type: { $ne: 'other' } // Exclude 'other' type events
    };
    if (type) {
      const typeMap = {
        workshops: 'workshop',
        trips: 'trip',
        bazaars: 'bazaar',
        booths: 'booth',
        confrence: 'conference',
        conference: 'conference'
      };
      baseMatch.type = typeMap[type] || type;
    }
    if (status && status !== 'all') {
      baseMatch.status = status;
    }

    const pipeline = [
      { $match: baseMatch },
      { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const nameRegex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: nameRegex },
            { name: nameRegex },
            { description: nameRegex },
            { location: nameRegex },
            { 'creator.firstName': nameRegex },
            { 'creator.lastName': nameRegex },
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { startDate: 1 } },
      { $project: {
        _id: 1,
        title: 1,
        name: 1,
        description: 1,
        type: 1,
        startDate: 1,
        endDate: 1,
        registrationDeadline: 1,
        location: 1,
        capacity: 1,
        price: 1,
        registeredCount: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        agenda: 1,
        website: 1,
        budget: 1,
        fundingSource: 1,
        extraResources: 1,
        // Workshop-specific fields
        faculty: 1,
        professors: 1,
        bannerFile: 1,
        createdBy: {
          _id: '$creator._id',
          firstName: '$creator.firstName',
          lastName: '$creator.lastName',
          email: '$creator.email',
          userType: '$creator.userType'
        }
      } }
    );

    const events = await Event.aggregate(pipeline);
    
    // For bazaars and booths, get vendor information
    const eventsWithVendors = await Promise.all(events.map(async (e) => {
      const baseEvent = {
        ...e,
        creatorName: e.createdBy ? `${e.createdBy.firstName || ''} ${e.createdBy.lastName || ''}`.trim() : null,
        creatorRole: e.createdBy ? (e.createdBy.userType || null) : null,
        creatorFirstName: e.createdBy?.firstName || null,
        creatorLastName: e.createdBy?.lastName || null,
      };

      // Add vendor information for bazaars and booths
      if (e.type === 'bazaar' || e.type === 'booth') {
        try {
          const VendorRequest = require('../models/vendorRequest');
          const vendorRequests = await VendorRequest.find({
            [e.type]: e._id,
            status: 'accepted'
          }).populate('vendor', 'firstName lastName companyName email').lean();

          // For booth events, include full vendor request details
          if (e.type === 'booth') {
            baseEvent.vendorRequests = vendorRequests.map(vr => ({
              _id: vr._id,
              vendor: {
                _id: vr.vendor._id,
                name: vr.vendor.companyName || `${vr.vendor.firstName} ${vr.vendor.lastName}`,
                companyName: vr.vendor.companyName,
                contactName: `${vr.vendor.firstName} ${vr.vendor.lastName}`,
                email: vr.vendor.email,
              },
              boothSize: vr.boothSize,
              durationWeeks: vr.durationWeeks,
              boothLocation: vr.boothLocation,
              attendees: vr.attendees || [],
              message: vr.message || '',
              status: vr.status,
              createdAt: vr.createdAt,
              eventName: vr.eventName,
              eventType: vr.eventType
            }));
          }

          // Keep the original vendors array for backward compatibility
          baseEvent.vendors = vendorRequests.map(vr => ({
            _id: vr.vendor._id,
            name: vr.vendor.companyName || `${vr.vendor.firstName} ${vr.vendor.lastName}`,
            companyName: vr.vendor.companyName,
            contactName: `${vr.vendor.firstName} ${vr.vendor.lastName}`,
            email: vr.vendor.email,
            boothSize: vr.boothSize,
            durationWeeks: vr.durationWeeks,
            boothLocation: vr.boothLocation,
            attendees: vr.attendees || []
          }));

          // For bazaars, also get related booth events
          if (e.type === 'bazaar') {
            const boothEvents = await Event.find({
              type: 'booth',
              location: e.location,
              startDate: { $gte: e.startDate },
              endDate: { $lte: e.endDate },
              status: 'approved'
            }).lean();

            baseEvent.booths = boothEvents.map(booth => ({
              _id: booth._id,
              title: booth.title,
              description: booth.description,
              startDate: booth.startDate,
              endDate: booth.endDate,
              location: booth.location,
              capacity: booth.capacity,
              price: booth.price
            }));
          }
        } catch (vendorError) {
          console.error('Error fetching vendor info for event:', e._id, vendorError);
          baseEvent.vendors = [];
        }
      }

      return baseEvent;
    }));

    res.json(eventsWithVendors);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 📅 Get all events for students with vendor details for bazaars
exports.getAllEventsForStudents = async (req, res) => {
  try {
    const { q, type, status } = req.query;
    
    console.log('🔍 Student search query:', q);
    console.log('🔍 User type:', req.user.userType);
    console.log('🔍 User role:', req.user.role);
    console.log('🔍 User ID:', req.user._id);
    console.log('🔍 Event type filter:', type);
    console.log('🔍 Status filter:', status);
    
    // Build filter - Event Office users can see all events, others only see approved
    const filter = { 
      startDate: { $gt: new Date() } // Only events that start in the future
    };
    
    // Only filter by status for non-Event Office users
    const isEventOffice = req.user.userType === 'Event Office' || 
                         req.user.userType === 'Events Office' || 
                         req.user.userType === 'event_office' || 
                         req.user.role === 'event_office' || 
                         req.user.role === 'Event Office' ||
                         req.user.userType === 'event office' ||
                         req.user.role === 'event office';
    
    if (!isEventOffice) {
      filter.status = 'approved';
      console.log('🔍 Non-Event Office user - filtering to approved only');
    } else {
      console.log('🔍 Event Office user - showing all statuses');
    }
    
    if (type && type !== 'all') filter.type = type;
    console.log('🔍 Final filter:', filter);

    // Get events with creator information
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      // Add creator name fields for easier searching
      {
        $addFields: {
          creatorFullName: {
            $concat: [
              { $ifNull: ['$creator.firstName', ''] },
              ' ',
              { $ifNull: ['$creator.lastName', ''] }
            ]
          }
        }
      },
      // Apply search filter after adding creator name
      ...(q ? [{
        $match: {
          $or: [
            { title: new RegExp(q, "i") },
            { description: new RegExp(q, "i") },
            { location: new RegExp(q, "i") },
            { faculty: new RegExp(q, "i") },
            { professors: new RegExp(q, "i") },
            { creatorFullName: new RegExp(q, "i") }
          ]
        }
      }] : []),
      { $sort: { startDate: 1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          type: 1,
          startDate: 1,
          endDate: 1,
          registrationDeadline: 1,
          location: 1,
          capacity: 1,
          price: 1,
          registeredCount: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          agenda: 1,
          website: 1,
          budget: 1,
          fundingSource: 1,
          extraResources: 1,
          faculty: 1,
          professors: 1,
          bannerFile: 1,
          createdBy: {
            _id: '$creator._id',
            firstName: '$creator.firstName',
            lastName: '$creator.lastName',
            email: '$creator.email',
            userType: '$creator.userType'
          }
        }
      }
    ];

    const events = await Event.aggregate(pipeline);
    
    console.log('🔍 Found events:', events.length);
    if (q) {
      console.log('🔍 Search results for query "' + q + '":', events.map(e => ({
        title: e.title,
        creatorName: e.creatorFullName,
        creator: e.createdBy
      })));
    }
    
    console.log('🔍 Found events:', events.length);
    console.log('🔍 Events by type:', events.reduce((acc, ev) => {
      acc[ev.type] = (acc[ev.type] || 0) + 1;
      return acc;
    }, {}));
    console.log('🔍 Events by status:', events.reduce((acc, ev) => {
      acc[ev.status] = (acc[ev.status] || 0) + 1;
      return acc;
    }, {}));
    
    // For each event, get vendor details if it's a bazaar
    const eventsWithVendors = await Promise.all(
      events.map(async (event) => {
        let vendors = [];
        
        if (event.type === 'bazaar') {
          try {
            const vendorRequests = await VendorRequest.find({
              bazaar: event._id,
              status: 'accepted'
            })
            .populate('vendor', 'companyName firstName lastName email')
            .select('vendor attendees boothSize createdAt');
            
            vendors = vendorRequests.map(req => ({
              id: req._id,
              companyName: req.vendor?.companyName || `${req.vendor?.firstName || ''} ${req.vendor?.lastName || ''}`.trim(),
              email: req.vendor?.email || '',
              attendees: req.attendees || [],
              boothSize: req.boothSize || null,
              joinedAt: req.createdAt
            }));
          } catch (vendorErr) {
            console.error('Error fetching vendors for bazaar:', vendorErr);
            vendors = [];
          }
        }
        
        return {
          ...event,
          vendors,
          creatorName: event.createdBy ? `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim() : null,
          creatorRole: event.createdBy ? (event.createdBy.userType || null) : null,
          creatorFirstName: event.createdBy?.firstName || null,
          creatorLastName: event.createdBy?.lastName || null,
        };
      })
    );

    res.json({
      success: true,
      events: eventsWithVendors
    });
  } catch (err) {
    console.error("❌ Error fetching events for students:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// Get all events for admin management (including pending)
exports.getAllEventsForAdmin = async (req, res) => {
  try {
    const { q, type, status } = req.query;
    console.log('🔍 Admin requesting events with query:', { q, type, status });
    
    const filter = {
      type: { $ne: 'other' } // Exclude 'other' type events
    };

    if (q) {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }
    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;

    console.log('🔍 Filter applied:', filter);

    const events = await Event.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log('📊 Found events:', events.length);
    console.log('📊 Events data:', events);

    // Add vendor information for workshops and booths
    const eventsWithVendors = await Promise.all(events.map(async (event) => {
      const baseEvent = event.toObject();
      
      // Add vendor information for workshops, booths, and bazaars
      if (event.type === 'workshop' || event.type === 'booth' || event.type === 'bazaar') {
        try {
          const VendorRequest = require('../models/vendorRequest');
          const vendorRequests = await VendorRequest.find({
            [event.type]: event._id,
            status: 'accepted'
          }).populate('vendor', 'firstName lastName companyName email phone userType').lean();

          // For booth events, include full vendor request details
          if (event.type === 'booth') {
            baseEvent.vendorRequests = vendorRequests.map(vr => ({
              _id: vr._id,
              vendor: {
                _id: vr.vendor._id,
                name: vr.vendor.companyName || `${vr.vendor.firstName} ${vr.vendor.lastName}`,
                companyName: vr.vendor.companyName,
                contactName: `${vr.vendor.firstName} ${vr.vendor.lastName}`,
                email: vr.vendor.email,
              },
              boothSize: vr.boothSize,
              durationWeeks: vr.durationWeeks,
              boothLocation: vr.boothLocation,
              attendees: vr.attendees || [],
              message: vr.message || '',
              status: vr.status,
              createdAt: vr.createdAt,
              eventName: vr.eventName,
              eventType: vr.eventType
            }));
          }

          // Keep the original vendors array for backward compatibility
          baseEvent.vendors = vendorRequests.map(vr => ({
            id: vr._id,
            companyName: vr.vendor?.companyName || `${vr.vendor?.firstName || ''} ${vr.vendor?.lastName || ''}`.trim(),
            contactName: `${vr.vendor?.firstName || ''} ${vr.vendor?.lastName || ''}`.trim(),
            email: vr.vendor?.email || '',
            phone: vr.vendor?.phone || '',
            userType: vr.vendor?.userType || '',
            boothSize: vr.boothSize || null,
            durationWeeks: vr.durationWeeks || null,
            boothLocation: vr.boothLocation || null,
            attendees: vr.attendees || [],
            message: vr.message || '',
            status: vr.status,
            joinedAt: vr.createdAt
          }));
        } catch (vendorError) {
          console.error('Error fetching vendor information:', vendorError);
          baseEvent.vendors = [];
          baseEvent.vendorRequests = [];
        }
      }

      return baseEvent;
    }));

    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      events: eventsWithVendors
    });
  } catch (err) {
    console.error("❌ Error fetching events for admin:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 🔍 Get a single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("❌ Error fetching event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ✏️ Update an existing event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('🔍 Updating event:', id);
    console.log('🔍 Updates:', updates);

    const event = await Event.findById(id);
    if (!event) {
      console.log('❌ Event not found:', id);
      return res.status(404).json({ msg: "Event not found" });
    }

    console.log('🔍 Event type:', event.type);
    console.log('🔍 Title field:', updates.title);
    console.log('🔍 Name field:', updates.name);

    // Check if professor is trying to edit someone else's event
    if (req.user.userType === "Professor" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "You can only edit your own events" });
    }

    console.log('📊 Current event status:', event.status);
    console.log('📊 New status:', updates.status);

    Object.assign(event, updates);
    await event.save();

    console.log('✅ Event updated successfully');
    res.json({ msg: "Event updated successfully", event });
  } catch (err) {
    console.error("❌ Error updating event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ❌ Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    console.log('🗑️ Delete event request:', { eventId: req.params.id, user: req.user });
    
    const event = await Event.findById(req.params.id);
    if (!event) {
      console.log('❌ Event not found:', req.params.id);
      return res.status(404).json({ msg: "Event not found" });
    }

    console.log('📊 Event found:', { 
      id: event._id, 
      title: event.title, 
      registeredCount: event.registeredCount,
      createdBy: event.createdBy,
      userType: req.user.userType,
      userId: req.user._id
    });

    // Professors may only delete events they created
    if (req.user && req.user.userType === "Professor" && event.createdBy?.toString() !== req.user._id.toString()) {
      console.log('❌ Professor trying to delete event they did not create');
      return res.status(403).json({ msg: "You can only delete your own events" });
    }

    // Do not allow delete if people already registered
    if (event.registeredCount && event.registeredCount > 0) {
      console.log('❌ Cannot delete event: users already registered:', event.registeredCount);
      return res.status(400).json({ msg: "Cannot delete event: users already registered." });
    }

    console.log('✅ Proceeding with event deletion');
    await event.deleteOne();
    console.log('✅ Event deleted successfully');
    res.json({ msg: "Event deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 📝 Register a user for an event
// 📝 Register a user for an event OR a trip using the same endpoint
exports.registerForEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user?._id || req.user?.id;

    if (!id) return res.status(400).json({ msg: "Missing id in URL" });
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    // Try Event first
    let holder = await Event.findById(id);
    let holderType = "event";

    // If not an Event, try Trip
    if (!holder) {
      holder = await Trip.findById(id);
      holderType = holder ? "trip" : null;
    }

    if (!holderType) {
      return res.status(404).json({ msg: "Event/Trip not found" });
    }

    // Optional: check registration deadline for trips
    if (holderType === "trip" && holder.registrationDeadline && holder.registrationDeadline < new Date()) {
      return res.status(400).json({ msg: "Registration deadline has passed" });
    }

    // Capacity check: use count of registrations for this id
    const regCount = await Registration.countDocuments({ event: id });
    if (holder.capacity && regCount >= holder.capacity) {
      return res.status(400).json({ msg: `${holderType === 'trip' ? 'Trip' : 'Event'} is full` });
    }

    // Prevent duplicate registration
    const existing = await Registration.findOne({ event: id, user: userId });
    if (existing) {
      return res.status(400).json({ msg: "You are already registered" });
    }

    // Create registration (store the same id in `event` field)
    const registration = await Registration.create({
      event: id,                 // works for both Event and Trip ids
      user: userId,
      role: req.user.userType || req.user.role || "attendee",
      status: "approved"
    });

    // Optionally increment registeredCount for Events only (Trips don’t have this field)
    if (holderType === "event") {
      holder.registeredCount = (holder.registeredCount || 0) + 1;
      await holder.save();
    }

    return res.status(201).json({
      msg: `Successfully registered for ${holderType}`,
      holderType,
      registration
    });
  } catch (err) {
    console.error("❌ Error registering for event/trip:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};


// 👤 Get events the logged-in user is registered for
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate("event", "title startDate endDate location type")
      .sort({ createdAt: -1 })
      .lean();

    res.json(registrations);
  } catch (err) {
    console.error("❌ Error fetching registrations:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 🎓 Get events created by the logged-in professor
exports.getMyEvents = async (req, res) => {
  try {
    console.log('🎓 Professor requesting their events, user ID:', req.user._id);
    
    const events = await Event.find({ createdBy: req.user._id })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log('📊 Found professor events:', events.length);

    res.status(200).json({
      success: true,
      message: 'Professor events fetched successfully',
      events
    });
  } catch (err) {
    console.error("❌ Error fetching professor events:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 🎓 Get workshops created by the logged-in professor
exports.getMyWorkshops = async (req, res) => {
  try {
    console.log('🎓 Professor requesting their workshops, user ID:', req.user._id);
    
    // Filter events where type is 'workshop' and createdBy matches the professor
    const workshops = await Event.find({ 
      createdBy: req.user._id,
      type: 'workshop'
    })
      .populate('createdBy', 'firstName lastName email userType')
      .sort({ createdAt: -1 });

    console.log('📊 Found professor workshops:', workshops.length);

    res.status(200).json({
      success: true,
      message: 'Professor workshops fetched successfully',
      workshops,
      count: workshops.length
    });
  } catch (err) {
    console.error("❌ Error fetching professor workshops:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// 👥 Get registrations for a specific event (for event creators)
exports.getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log('👥 Fetching registrations for event:', eventId);
    
    // First verify the event exists and the user created it
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }
    
    // Check if the user created this event (or is admin)
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.userType !== 'Admin') {
      return res.status(403).json({ msg: "Not authorized to view registrations for this event" });
    }
    
    // Get registrations for this event with user details
    const registrations = await Registration.find({ event: eventId })
      .populate('user', 'firstName lastName email gucId userType')
      .sort({ createdAt: -1 });

    console.log('📊 Found registrations:', registrations.length);

    // Transform the data to match frontend expectations
    const transformedRegistrations = registrations.map(reg => ({
      id: reg._id,
      name: `${reg.user.firstName} ${reg.user.lastName}`,
      email: reg.user.email,
      studentId: reg.user.gucId || '',
      userType: reg.user.userType,
      status: reg.status,
      registeredAt: reg.createdAt
    }));

    res.status(200).json({
      success: true,
      message: 'Event registrations fetched successfully',
      registrations: transformedRegistrations
    });
  } catch (err) {
    console.error("❌ Error fetching event registrations:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
