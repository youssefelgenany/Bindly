const Event = require("../models/eventModel");
const Registration = require("../models/registrationModel");
const StudentRegistration = require("../models/studentRegistrationModel");
const Trip = require("../models/tripModel");
const VendorRequest = require("../models/vendorRequest");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const { sendReceiptEmail } = require("../utils/sendReceiptEmail");
const { sendRefundEmail } = require("../utils/sendRefundEmail");
const { salesReport } = require("../scripts/test-sales-report");
const { notifyNewEventCreated } = require("../services/notificationService");

// Initialize Stripe if secret key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    console.warn('⚠️ Stripe package not installed. Run: npm install stripe');
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured. Card payments will be disabled.');
}
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
    
    // Send notifications to all eligible users about the new event
    await notifyNewEventCreated(newEvent);
    
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

// 📈 Get sales report for events (admin and event office only)
exports.getSalesReport = async (req, res) => {
  try {
    const entries = Array.isArray(salesReport) ? [...salesReport] : [];

    const sortedReport = entries
      .map((entry) => {
        const ticketsSold = Number(entry.ticketsSold) || 0;
        const totalRevenue = Number(entry.totalRevenue) || 0;
        const averageTicketPrice =
          ticketsSold > 0 ? Number((totalRevenue / ticketsSold).toFixed(2)) : null;

        return {
          id: entry.id || entry.eventName,
          eventName: entry.eventName,
          totalRevenue,
          ticketsSold,
          ticketPrice: entry.ticketPrice ?? null,
          averageTicketPrice,
          category: entry.category || null,
          location: entry.location || null,
          startDate: entry.startDate || null,
          endDate: entry.endDate || null,
          notes: entry.notes || null
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totals = sortedReport.reduce(
      (acc, entry) => {
        acc.totalRevenue += entry.totalRevenue;
        acc.totalTicketsSold += entry.ticketsSold;
        return acc;
      },
      { totalRevenue: 0, totalTicketsSold: 0 }
    );

    const response = {
      success: true,
      generatedAt: new Date().toISOString(),
      currency: "EGP",
      totalRevenue: totals.totalRevenue,
      totalTicketsSold: totals.totalTicketsSold,
      averageRevenuePerEvent: sortedReport.length
        ? Number((totals.totalRevenue / sortedReport.length).toFixed(2))
        : 0,
      report: sortedReport
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Server error in getSalesReport:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to generate sales report"
    });
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

// 🎓 Get workshop participants (for professors who created the workshop)
exports.getWorkshopParticipants = async (req, res) => {
  try {
    const { workshopId } = req.params;
    console.log('🎓 Professor requesting participants for workshop:', workshopId);
    console.log('🎓 Professor ID:', req.user._id);
    
    // Verify the workshop exists and is a workshop
    const workshop = await Event.findById(workshopId);
    if (!workshop) {
      return res.status(404).json({ 
        success: false,
        message: 'Workshop not found' 
      });
    }
    
    // Verify it's a workshop
    if (workshop.type !== 'workshop') {
      return res.status(400).json({ 
        success: false,
        message: 'This endpoint is only for workshops' 
      });
    }
    
    // Verify the professor created this workshop
    if (workshop.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only view participants for workshops you created' 
      });
    }
    
    // Get all student registrations for this workshop
    const participants = await StudentRegistration.find({ 
      event: workshopId,
      eventType: 'workshop'
    })
      .sort({ registeredAt: -1 })
      .lean();
    
    console.log('📊 Found participants:', participants.length);
    
    // Calculate remaining spots
    const totalCapacity = workshop.capacity || 0;
    const currentRegistrations = participants.length;
    const remainingSpots = Math.max(0, totalCapacity - currentRegistrations);
    
    // Format participants data
    const formattedParticipants = participants.map(participant => ({
      id: participant._id,
      studentName: participant.studentName,
      studentId: participant.studentId,
      studentEmail: participant.studentEmail,
      status: participant.status,
      registeredAt: participant.registeredAt,
      createdAt: participant.createdAt
    }));
    
    res.status(200).json({
      success: true,
      message: 'Workshop participants fetched successfully',
      workshop: {
        id: workshop._id,
        title: workshop.title,
        capacity: totalCapacity,
        currentRegistrations: currentRegistrations,
        remainingSpots: remainingSpots
      },
      participants: formattedParticipants,
      count: formattedParticipants.length
    });
  } catch (err) {
    console.error("❌ Error fetching workshop participants:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// ⭐ Add event to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Get user and check if event is already in favorites
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Check if already in favorites (compare as strings)
    if (user.favoriteEvents && user.favoriteEvents.some(eventId => eventId.toString() === id)) {
      return res.status(400).json({ 
        success: false,
        msg: "Event is already in your favorites" 
      });
    }

    // Add to favorites
    if (!user.favoriteEvents) {
      user.favoriteEvents = [];
    }
    user.favoriteEvents.push(id);
    await user.save();

    res.status(200).json({
      success: true,
      msg: "Event added to favorites",
      favoriteEvents: user.favoriteEvents
    });
  } catch (err) {
    console.error("❌ Error adding event to favorites:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// ⭐ Remove event from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Check if event is in favorites (compare as strings)
    if (!user.favoriteEvents || !user.favoriteEvents.some(eventId => eventId.toString() === id)) {
      return res.status(400).json({ 
        success: false,
        msg: "Event is not in your favorites" 
      });
    }

    // Remove from favorites
    user.favoriteEvents = user.favoriteEvents.filter(
      eventId => eventId.toString() !== id
    );
    await user.save();

    res.status(200).json({
      success: true,
      msg: "Event removed from favorites",
      favoriteEvents: user.favoriteEvents
    });
  } catch (err) {
    console.error("❌ Error removing event from favorites:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// ⭐ Get user's favorite events
exports.getFavoriteEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with favorite events populated
    const user = await User.findById(userId)
      .populate({
        path: 'favoriteEvents',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName email userType'
        }
      });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Format the events similar to getAllEventsForStudents
    const favoriteEvents = await Promise.all(
      (user.favoriteEvents || []).map(async (event) => {
        if (!event) return null; // Handle deleted events

        const baseEvent = event.toObject ? event.toObject() : event;
        
        // Add vendor information for bazaars
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
          ...baseEvent,
          vendors,
          creatorName: event.createdBy ? `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim() : null,
          creatorRole: event.createdBy ? (event.createdBy.userType || null) : null,
          creatorFirstName: event.createdBy?.firstName || null,
          creatorLastName: event.createdBy?.lastName || null,
        };
      })
    );

    // Filter out null events (deleted events)
    const validFavoriteEvents = favoriteEvents.filter(event => event !== null);

    res.status(200).json({
      success: true,
      msg: "Favorite events retrieved successfully",
      events: validFavoriteEvents,
      count: validFavoriteEvents.length
    });
  } catch (err) {
    console.error("❌ Error fetching favorite events:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// Helper function to deduct from wallet
async function deductWallet(userId, amount, description, reference) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.walletBalance < amount) {
    throw new Error('Insufficient wallet balance');
  }
  
  user.walletBalance -= amount;
  
  // Add transaction record
  const walletTransaction = {
    amount: -amount, // Negative for payment
    type: 'payment',
    description: description || 'Payment for event registration',
    balanceAfter: user.walletBalance,
    reference: reference || '',
    createdAt: new Date()
  };
  user.walletTransactions.push(walletTransaction);
  
  await user.save();
  return user.walletBalance;
}

// Helper function to create Stripe session
async function createStripeSession(event, user) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const amountInCents = Math.round(event.price * 100); // Convert to cents
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'egp',
          product_data: {
            name: event.title || event.name,
            description: event.description || `Payment for ${event.type}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/payment-cancelled`,
    customer_email: user.email,
    metadata: {
      userId: user._id.toString(),
      eventId: event._id.toString(),
      eventTitle: event.title || event.name,
    },
  });
  
  return session;
}

// 💳 Pay for an event
exports.payForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user._id;

    if (!paymentMethod || !['wallet', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false,
        msg: "Payment method must be 'wallet' or 'card'" 
      });
    }

    // Find the event
    let event = await Event.findById(id);
    let isTrip = false;
    
    // If not found, try Trip
    if (!event) {
      const trip = await Trip.findById(id);
      if (trip) {
        event = trip;
        isTrip = true;
      }
    }

    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Check if event has a price
    const amount = event.price || 0;
    if (amount <= 0) {
      return res.status(400).json({ 
        success: false,
        msg: "This event is free. No payment required." 
      });
    }

    // Check if user is registered for this event
    // Try Registration model first
    let registration = await Registration.findOne({ 
      event: id, 
      user: userId 
    });

    // If not found, try StudentRegistration
    if (!registration) {
      const userDoc = await User.findById(userId);
      if (userDoc && userDoc.email) {
        registration = await StudentRegistration.findOne({
          event: id,
          studentEmail: userDoc.email.toLowerCase()
        });
      }
    }

    if (!registration) {
      return res.status(400).json({ 
        success: false,
        msg: "You are not registered for this event" 
      });
    }

    // Check if already paid
    if (registration.paid) {
      return res.status(400).json({ 
        success: false,
        msg: "Payment already completed for this registration" 
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Handle wallet payment
    if (paymentMethod === 'wallet') {
      try {
        const eventTitle = event.title || event.name || 'Event';
        const paymentDescription = `Payment for ${eventTitle}`;
        
        // Create payment record first to get payment ID
        const payment = await Payment.create({
          user: userId,
          event: id,
          amount: amount,
          paymentMethod: 'wallet',
          status: 'success'
        });

        // Deduct from wallet with transaction record
        const newBalance = await deductWallet(
          userId, 
          amount, 
          paymentDescription,
          payment._id.toString()
        );
        
        // Mark registration as paid
        registration.paid = true;
        await registration.save();

        // Send receipt email
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
        await sendReceiptEmail(
          user.email,
          userName,
          eventTitle,
          amount,
          'wallet',
          new Date()
        );

        return res.status(200).json({
          success: true,
          msg: "Payment completed successfully using wallet",
          payment: {
            id: payment._id,
            amount: amount,
            method: 'wallet',
            status: 'success'
          },
          walletBalance: newBalance
        });
      } catch (error) {
        if (error.message === 'Insufficient wallet balance') {
          return res.status(400).json({ 
            success: false,
            msg: "Insufficient wallet balance" 
          });
        }
        throw error;
      }
    }

    // Handle card payment with Stripe
    if (paymentMethod === 'card') {
      if (!stripe) {
        return res.status(500).json({ 
          success: false,
          msg: "Card payments are not available. Stripe is not configured." 
        });
      }

      try {
        const session = await createStripeSession(event, user);
        
        // Create pending payment record
        const payment = await Payment.create({
          user: userId,
          event: id,
          amount: amount,
          paymentMethod: 'card',
          status: 'pending',
          stripeSessionId: session.id
        });

        return res.status(200).json({
          success: true,
          msg: "Stripe checkout session created",
          sessionId: session.id,
          sessionUrl: session.url,
          payment: {
            id: payment._id,
            amount: amount,
            method: 'card',
            status: 'pending'
          }
        });
      } catch (error) {
        console.error('❌ Stripe session creation error:', error);
        return res.status(500).json({ 
          success: false,
          msg: "Failed to create payment session",
          error: error.message 
        });
      }
    }

  } catch (err) {
    console.error("❌ Error processing payment:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message 
    });
  }
};

// 🚫 Cancel event registration and process refund
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params; // event ID
    const userId = req.user._id;

    console.log('🚫 Cancellation request for event:', id, 'by user:', userId);

    // Find the event
    let event = await Event.findById(id);
    let isTrip = false;
    
    if (!event) {
      const trip = await Trip.findById(id);
      if (trip) {
        event = trip;
        isTrip = true;
      }
    }

    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Check if cancellation is allowed (at least 2 weeks before event)
    const eventStartDate = event.startDate;
    if (!eventStartDate) {
      return res.status(400).json({ 
        success: false,
        msg: "Event start date is not set" 
      });
    }

    const now = new Date();
    const startDate = new Date(eventStartDate);
    const daysUntilEvent = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)); // Convert to days

    // Check if event has already started
    if (daysUntilEvent < 0) {
      return res.status(400).json({ 
        success: false,
        msg: "Cannot cancel registration for an event that has already started or passed.",
        daysUntilEvent: daysUntilEvent,
        eventStartDate: startDate
      });
    }

    // Check if at least 2 weeks (14 days) remain
    if (daysUntilEvent < 14) {
      return res.status(400).json({ 
        success: false,
        msg: `Cancellation is only allowed if there are at least 2 weeks remaining until the event. The event starts in ${daysUntilEvent} day(s).`,
        daysUntilEvent: daysUntilEvent,
        eventStartDate: startDate,
        minimumDaysRequired: 14
      });
    }

    console.log(`✅ Cancellation allowed. Event starts in ${daysUntilEvent} days.`);

    // Find registration - try Registration model first
    let registration = await Registration.findOne({ 
      event: id, 
      user: userId 
    });
    let registrationType = 'registration';

    // If not found, try StudentRegistration
    if (!registration) {
      const userDoc = await User.findById(userId);
      if (userDoc && userDoc.email) {
        registration = await StudentRegistration.findOne({
          event: id,
          studentEmail: userDoc.email.toLowerCase()
        });
        registrationType = 'student';
      }
    }

    if (!registration) {
      return res.status(404).json({ 
        success: false,
        msg: "You are not registered for this event" 
      });
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        msg: "Registration is already cancelled" 
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Process refund if payment was made
    let refundAmount = 0;
    let refundProcessed = false;

    if (registration.paid) {
      // Find the payment record
      const payment = await Payment.findOne({
        user: userId,
        event: id,
        status: 'success'
      }).sort({ createdAt: -1 }); // Get the most recent successful payment

      if (payment) {
        refundAmount = payment.amount;
        
        // Refund to wallet
        console.log('💰 Processing refund of', refundAmount, 'EGP to wallet...');
        user.walletBalance += refundAmount;
        
        // Add transaction record
        const walletTransaction = {
          amount: refundAmount,
          type: 'refund',
          description: `Refund for cancelled registration: ${event.title || event.name || 'Event'}`,
          balanceAfter: user.walletBalance,
          reference: payment._id.toString(),
          createdAt: new Date()
        };
        user.walletTransactions.push(walletTransaction);
        await user.save();
        
        // Update payment status to refunded
        payment.status = 'refunded';
        await payment.save();
        
        refundProcessed = true;
        console.log('✅ Refund processed. New wallet balance:', user.walletBalance);
      } else {
        console.warn('⚠️ Payment record not found, but registration marked as paid');
        // Still process cancellation even if payment record not found
      }
    }

    // Update registration status to cancelled
    registration.status = 'cancelled';
    registration.paid = false; // Reset paid status
    await registration.save();

    // Send refund email if refund was processed
    if (refundProcessed && refundAmount > 0) {
      const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
      const eventTitle = event.title || event.name || 'Event';
      
      try {
        const emailResult = await sendRefundEmail(
          user.email,
          userName,
          eventTitle,
          refundAmount,
          new Date()
        );
        if (emailResult.sent) {
          console.log('✅ Refund email sent successfully');
        } else {
          console.error('❌ Refund email not sent:', emailResult.reason || emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Exception while sending refund email:', emailError);
        // Don't fail the cancellation if email fails
      }
    }

    return res.status(200).json({
      success: true,
      msg: "Registration cancelled successfully",
      refundProcessed: refundProcessed,
      refundAmount: refundAmount,
      walletBalance: user.walletBalance,
      registration: {
        id: registration._id,
        status: registration.status,
        eventTitle: event.title || event.name
      }
    });

  } catch (err) {
    console.error("❌ Error cancelling registration:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message 
    });
  }
};

// 💰 Get wallet transactions for the logged-in user
exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('walletBalance walletTransactions');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // Sort transactions by date (newest first)
    const transactions = (user.walletTransactions || []).sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance || 0,
      transactions: transactions.map(tx => ({
        id: tx._id,
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        balanceAfter: tx.balanceAfter,
        reference: tx.reference,
        createdAt: tx.createdAt
      })),
      count: transactions.length
    });

  } catch (err) {
    console.error("❌ Error fetching wallet transactions:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message 
    });
  }
};

// 📊 Get ratings and comments for an event (placeholder until schema is created)
exports.getEventRatingsAndComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Placeholder response - will be replaced when rating/comment schema is created
    res.status(200).json({
      success: true,
      message: "Ratings and comments retrieved successfully",
      eventId: id,
      ratings: {
        average: null,
        count: 0,
        distribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      },
      comments: []
    });
  } catch (err) {
    console.error("❌ Error fetching ratings and comments:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message 
    });
  }
};
