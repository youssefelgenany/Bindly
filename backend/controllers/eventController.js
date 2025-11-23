const Event = require("../models/eventModel");
const Registration = require("../models/registrationModel");
const StudentRegistration = require("../models/studentRegistrationModel");
const Trip = require("../models/tripModel");
const VendorRequest = require("../models/vendorRequest");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const { sendReceiptEmail } = require("../utils/sendReceiptEmail");
const { sendRefundEmail } = require("../utils/sendRefundEmail");
const { sendCommentWarningEmail } = require("../utils/sendCommentWarningEmail");
const { salesReport } = require("../scripts/test-sales-report");

const { notifyNewEventCreated, notifyWorkshopSubmitted } = require("../services/notificationService");
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
      bannerFile,
      allowedUserTypes
    } = req.body;

    if (!title || !type || !startDate || !endDate || !location) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Validate event type
    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ msg: `Invalid event type. Allowed types: ${validTypes.join(', ')}` });
    }

    // Validate that title and location are not empty
    if (!title.trim() || !location.trim()) {
      return res.status(400).json({ msg: "Title and location cannot be empty" });
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
      bannerFile,
      // User type restrictions
      isRestricted: allowedUserTypes && allowedUserTypes.length > 0,
      allowedUserTypes: allowedUserTypes && allowedUserTypes.length > 0 ? allowedUserTypes : []
    });

    await newEvent.save();

    // Send notifications to all eligible users about the new event
    await notifyNewEventCreated(newEvent);

    // Notify events office if a workshop is submitted by a doctor (Professor)
    if (type === 'workshop' && req.user.userType === 'Professor') {
      console.log('Workshop submitted by Professor, notifying events office');
      await notifyWorkshopSubmitted(newEvent, req.user);
    }

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

    const { allowedUserTypes, ...otherFields } = req.body;
    const newConference = new Event({
      ...otherFields,
      type: "conference",
      createdBy: req.user ? req.user._id : undefined,
      status: "approved",
      // User type restrictions
      isRestricted: allowedUserTypes && allowedUserTypes.length > 0,
      allowedUserTypes: allowedUserTypes && allowedUserTypes.length > 0 ? allowedUserTypes : []
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
    const { startDate, endDate, type, sort } = req.query || {};

    const entries = Array.isArray(salesReport) ? [...salesReport] : [];

    const normalizeType = (value) =>
      String(value || '')
        .trim()
        .toLowerCase();

    const requestedType = type ? normalizeType(type) : null;

    const filteredEntries = entries.filter((entry) => {
      const entryType = normalizeType(entry.type || entry.category);

      if (requestedType && entryType !== requestedType) {
        return false;
      }

      if (startDate) {
        const entryStart = new Date(entry.startDate);
        if (Number.isNaN(entryStart.getTime()) || entryStart < new Date(startDate)) {
          return false;
        }
      }

      if (endDate) {
        const entryEnd = new Date(entry.endDate || entry.startDate);
        if (Number.isNaN(entryEnd.getTime()) || entryEnd > new Date(endDate)) {
          return false;
        }
      }

      return true;
    });

    const sortOrder = String(sort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const sortedReport = filteredEntries
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
      .sort((a, b) =>
        sortOrder === 'asc'
          ? a.totalRevenue - b.totalRevenue
          : b.totalRevenue - a.totalRevenue
      );

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

    // Base match (type/status) - only allow valid event types
    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
    const baseMatch = {
      type: { $in: validTypes }, // Only include valid event types
      $and: [
        // Exclude archived events (include if archived is false or doesn't exist)
        {
          $or: [
            { archived: false },
            { archived: { $exists: false } } // Include events where archived field doesn't exist (defaults to false)
          ]
        },
        // Require valid title
        { title: { $exists: true } },
        { title: { $ne: null } },
        { title: { $ne: '' } },
        // Require valid location
        { location: { $exists: true } },
        { location: { $ne: null } },
        { location: { $ne: '' } }
      ]
    };

    // For non-admin/event-office users, only show approved events
    // Check if user is admin or event office
    const isAdminOrEventOffice = req.user && (
      req.user.userType === 'admin' ||
      req.user.userType === 'Event Office' ||
      req.user.userType === 'Events Office' ||
      req.user.userType === 'event_office' ||
      req.user.role === 'admin' ||
      req.user.role === 'event_office' ||
      req.user.role === 'Event Office'
    );

    console.log('🔍 getAllEvents - User type check:', {
      userType: req.user?.userType,
      role: req.user?.role,
      isAdminOrEventOffice: isAdminOrEventOffice,
      statusQuery: status
    });

    // If status is not explicitly requested and user is not admin/event office, default to approved
    if (!status || status === 'all') {
      if (!isAdminOrEventOffice) {
        baseMatch.status = 'approved';
        console.log('🔍 Filtering to approved events only (non-admin user)');
      } else {
        console.log('🔍 Showing all statuses (admin/event office user)');
      }
    } else if (status !== 'all') {
      baseMatch.status = status;
      console.log('🔍 Filtering by status:', status);
    }

    // Add date filter: ONLY include future events - EXCLUDE all past events
    const now = new Date();
    console.log('🔍 getAllEvents - Date filter - Current time:', now.toISOString());
    
    // SIMPLE AND DIRECT: Only show events where endDate > now OR (no endDate AND startDate > now)
    const dateFilter = {
      $or: [
        // Case 1: Event has endDate and it's in the future
        {
          endDate: { $gt: now }
        },
        // Case 2: Event has no endDate but has startDate in the future
        {
          $and: [
            {
              $or: [
                { endDate: { $exists: false } },
                { endDate: null }
              ]
            },
            { startDate: { $gt: now } }
          ]
        }
      ]
    };
    
    // Combine baseMatch with dateFilter
    const finalMatch = {
      ...baseMatch,
      ...dateFilter
    };
    
    console.log('🔍 Final baseMatch filter with date filter:', JSON.stringify(finalMatch, null, 2));
    console.log('🔍 WILL EXCLUDE events where endDate <=', now.toISOString(), 'OR (no endDate AND startDate <=', now.toISOString(), ')');

    if (type) {
      const typeMap = {
        workshops: 'workshop',
        trips: 'trip',
        bazaars: 'bazaar',
        booths: 'booth',
        confrence: 'conference',
        conference: 'conference'
      };
      finalMatch.type = typeMap[type] || type;
    }

    const pipeline = [
      { $match: finalMatch },
      { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      // Lookup student registrations to get student names
      {
        $lookup: {
          from: 'studentregistrations',
          localField: '_id',
          foreignField: 'event',
          as: 'studentRegistrations'
        }
      },
      // Lookup registrations and populate user names
      {
        $lookup: {
          from: 'registrations',
          localField: '_id',
          foreignField: 'event',
          as: 'registrations'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'registrations.user',
          foreignField: '_id',
          as: 'registeredUsers'
        }
      },
      // Add creator name fields and student names for easier searching
      {
        $addFields: {
          creatorFullName: {
            $concat: [
              { $ifNull: ['$creator.firstName', ''] },
              ' ',
              { $ifNull: ['$creator.lastName', ''] }
            ]
          },
          // Create a searchable string with all student names from StudentRegistration
          allStudentNames: {
            $reduce: {
              input: '$studentRegistrations',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                  { $ifNull: ['$$this.studentName', ''] },
                  ' ',
                  { $ifNull: ['$$this.studentEmail', ''] }
                ]
              }
            }
          },
          // Create a searchable string with all user names from Registration
          allRegisteredUserNames: {
            $reduce: {
              input: '$registeredUsers',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                  { $ifNull: ['$$this.firstName', ''] },
                  ' ',
                  { $ifNull: ['$$this.lastName', ''] },
                  ' ',
                  { $ifNull: ['$$this.email', ''] }
                ]
              }
            }
          }
        }
      },
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
            { faculty: nameRegex },
            { professors: nameRegex },
            { 'creator.firstName': nameRegex },
            { 'creator.lastName': nameRegex },
            { creatorFullName: nameRegex },
            // Search in the concatenated student names field
            { allStudentNames: nameRegex },
            // Search in the concatenated registered user names field
            { allRegisteredUserNames: nameRegex }
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { startDate: 1 } },
      {
        $project: {
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
          isRestricted: 1,
          allowedUserTypes: 1,
          creatorFullName: 1,
          creatorName: '$creatorFullName',
          professorName: '$creatorFullName',
          createdByName: '$creatorFullName',
          createdBy: {
            _id: '$creator._id',
            firstName: '$creator.firstName',
            lastName: '$creator.lastName',
            email: '$creator.email',
            userType: '$creator.userType'
          }
        }
      }
    );

    let events = [];
    try {
      events = await Event.aggregate(pipeline);
      console.log('✅ Aggregation successful, found', events.length, 'events');
    } catch (aggError) {
      console.error('❌ Aggregation error:', aggError);
      console.error('❌ Aggregation error stack:', aggError.stack);
      console.error('❌ Pipeline:', JSON.stringify(pipeline, null, 2));
      throw aggError; // Re-throw to be caught by outer catch
    }

    // POST-FILTER: Double-check and remove ANY past events that might have slipped through
    const nowPostFilter = new Date();
    const initialCount = events.length;
    events = events.filter(event => {
      // If event has endDate, check if it's in the future
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        if (endDate <= nowPostFilter) {
          console.log('🚫 getAllEvents POST-FILTER: Removing past event:', event.title, 'endDate:', event.endDate, 'now:', nowPostFilter.toISOString());
          return false;
        }
      } else if (event.startDate) {
        // If no endDate, check startDate
        const startDate = new Date(event.startDate);
        if (startDate <= nowPostFilter) {
          console.log('🚫 getAllEvents POST-FILTER: Removing past event (no endDate):', event.title, 'startDate:', event.startDate, 'now:', nowPostFilter.toISOString());
          return false;
        }
      } else {
        // No dates at all - exclude it
        console.log('🚫 getAllEvents POST-FILTER: Removing event with no dates:', event.title);
        return false;
      }
      return true;
    });
    if (events.length < initialCount) {
      console.log('🚫 getAllEvents POST-FILTER: Removed', (initialCount - events.length), 'past events');
    }

    // Filter by user type restrictions
    if (req.user && req.user.userType) {
      const userType = req.user.userType;
      events = events.filter(event => {
        // If event has restrictions and allowedUserTypes array
        if (event.isRestricted && event.allowedUserTypes && event.allowedUserTypes.length > 0) {
          // Check if user's type is in the allowed list
          return event.allowedUserTypes.includes(userType);
        }
        // If no restrictions, show to all
        return true;
      });
    }

    const workshopEvents = events.filter(e => e.type === 'workshop');
    console.log('🔍 getAllEvents - Query results:', {
      totalEvents: events.length,
      workshopEvents: workshopEvents.length,
      approvedWorkshops: events.filter(e => e.type === 'workshop' && e.status === 'approved').length,
      eventTitles: events.slice(0, 5).map(e => ({ title: e.title, type: e.type, status: e.status })),
      workshopDetails: workshopEvents.slice(0, 3).map(e => ({
        title: e.title,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        endDateIsFuture: e.endDate ? new Date(e.endDate) > new Date() : 'no endDate'
      }))
    });

    // For bazaars and booths, get vendor information
    const eventsWithVendors = await Promise.all(events.map(async (e) => {
      const creatorFullName = e.createdBy ? `${e.createdBy.firstName || ''} ${e.createdBy.lastName || ''}`.trim() : null;
      const baseEvent = {
        ...e,
        creatorName: creatorFullName,
        professorName: creatorFullName,
        createdByName: creatorFullName,
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
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
    
    // Get user's registered event IDs (from both Registration and StudentRegistration)
    const userId = req.user._id;
    const userEmail = req.user.email;
    
    // Get registrations from Registration model
    const registrations = await Registration.find({ user: userId })
      .select('event')
      .lean();
    const registeredEventIds1 = registrations
      .map(r => r.event)
      .filter(id => id != null);
    
    // Get registrations from StudentRegistration model (by email)
    const studentRegistrations = await StudentRegistration.find({ 
      studentEmail: userEmail 
    })
      .select('event')
      .lean();
    const registeredEventIds2 = studentRegistrations
      .map(r => r.event)
      .filter(id => id != null);
    
    // Combine both sets of registered event IDs (keep as ObjectIds for MongoDB query)
    const registeredEventIds = [...new Set([
      ...registeredEventIds1.map(id => id.toString()),
      ...registeredEventIds2.map(id => id.toString())
    ])].filter(id => id);
    
    console.log('🔍 User registered event IDs:', registeredEventIds);
    
    // Build filter - Event Office users can see all events, others only see approved
    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
    
    // Build date filter: ONLY include future events - EXCLUDE all past events
    const now = new Date();
    console.log('🔍 Date filter - Current time:', now.toISOString());
    console.log('🔍 Date filter - Current timestamp:', now.getTime());
    
    // SIMPLE AND DIRECT: Only show events where endDate > now OR (no endDate AND startDate > now)
    const dateFilter = {
      $or: [
        // Case 1: Event has endDate and it's in the future
        {
          endDate: { $gt: now }
        },
        // Case 2: Event has no endDate but has startDate in the future
        {
          $and: [
            {
              $or: [
                { endDate: { $exists: false } },
                { endDate: null }
              ]
            },
            { startDate: { $gt: now } }
          ]
        }
      ]
    };
    
    console.log('🔍 Date filter applied:', JSON.stringify(dateFilter, null, 2));
    console.log('🔍 WILL EXCLUDE events where endDate <=', now.toISOString(), 'OR (no endDate AND startDate <=', now.toISOString(), ')');
    
    // Base filter conditions
    const baseFilter = {
      $and: [
        { title: { $exists: true } },
        { title: { $ne: null } },
        { title: { $ne: '' } },
        { location: { $exists: true } },
        { location: { $ne: null } },
        { location: { $ne: '' } }
      ]
    };
    
    // Handle type filter - apply before combining with baseFilter
    let typeFilter = { type: { $in: validTypes } }; // Default: all valid types
    
    if (type && type !== 'all' && type.trim() !== '') {
      const typeMap = {
        workshops: 'workshop',
        trips: 'trip',
        bazaars: 'bazaar',
        bazaar: 'bazaar', // Handle singular form
        booths: 'booth',
        booth: 'booth', // Handle singular form
        confrence: 'conference',
        conference: 'conference',
        workshop: 'workshop', // Handle singular form
        trip: 'trip' // Handle singular form
      };
      const normalizedType = (type || '').toString().trim().toLowerCase();
      const mappedType = typeMap[normalizedType] || normalizedType;
      console.log('🔍 Type filter received:', type, '-> normalized:', normalizedType, '-> mapped to:', mappedType);
      
      // Strictly check if mapped type is in valid types
      if (validTypes.includes(mappedType)) {
        // Use exact match for the specific type - ensure it's a string, not object
        typeFilter = { type: mappedType };
        console.log('🔍 Type filter applied (exact match):', mappedType, 'filter object:', JSON.stringify(typeFilter));
      } else {
        console.log('🔍 Invalid type filter, ignoring:', mappedType, '(valid types:', validTypes, ')');
        // If invalid type, return empty results by using impossible filter
        typeFilter = { _id: { $in: [] } }; // This will return no results
      }
    } else {
      console.log('🔍 No type filter or type is "all", showing all valid types');
    }
    
    const filter = {
      ...baseFilter,
      ...typeFilter,
      ...dateFilter
    };
    
    // Exclude events the user is already registered for from "Discover Events"
    // Registered events should only appear in "My Events"
    if (registeredEventIds.length > 0) {
      const mongoose = require('mongoose');
      const registeredObjectIds = registeredEventIds.map(id => {
        try {
          return mongoose.Types.ObjectId(id);
        } catch (e) {
          return null;
        }
      }).filter(id => id !== null);
      
      if (registeredObjectIds.length > 0) {
        filter._id = { $nin: registeredObjectIds };
        console.log('🔍 Excluding registered events from Discover Events:', registeredObjectIds.length, 'events');
      }
    }
    
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
    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));
    
    // Log workshop events found
    const workshopTest = await Event.find({ type: 'workshop', status: 'approved' }).limit(3).select('title status startDate endDate');
    console.log('🔍 getAllEventsForStudents - Sample approved workshops in DB:', workshopTest.map(w => ({
      title: w.title,
      status: w.status,
      startDate: w.startDate,
      endDate: w.endDate,
      endDateIsFuture: w.endDate ? new Date(w.endDate) > new Date() : 'no endDate'
    })));

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
      // Lookup student registrations to get student names
      {
        $lookup: {
          from: 'studentregistrations',
          localField: '_id',
          foreignField: 'event',
          as: 'studentRegistrations'
        }
      },
      // Lookup registrations and populate user names
      {
        $lookup: {
          from: 'registrations',
          localField: '_id',
          foreignField: 'event',
          as: 'registrations'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'registrations.user',
          foreignField: '_id',
          as: 'registeredUsers'
        }
      },
      // Add creator name fields and student names for easier searching
      {
        $addFields: {
          creatorFullName: {
            $concat: [
              { $ifNull: ['$creator.firstName', ''] },
              ' ',
              { $ifNull: ['$creator.lastName', ''] }
            ]
          },
          // Create a searchable string with all student names from StudentRegistration
          allStudentNames: {
            $reduce: {
              input: '$studentRegistrations',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                  { $ifNull: ['$$this.studentName', ''] },
                  ' ',
                  { $ifNull: ['$$this.studentEmail', ''] }
                ]
              }
            }
          },
          // Create a searchable string with all user names from Registration
          allRegisteredUserNames: {
            $reduce: {
              input: '$registeredUsers',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                  { $ifNull: ['$$this.firstName', ''] },
                  ' ',
                  { $ifNull: ['$$this.lastName', ''] },
                  ' ',
                  { $ifNull: ['$$this.email', ''] }
                ]
              }
            }
          }
        }
      },
      // Apply search filter after adding creator name and student registrations
      ...(q ? [{
        $match: {
          $or: [
            { title: new RegExp(q, "i") },
            { description: new RegExp(q, "i") },
            { location: new RegExp(q, "i") },
            { faculty: new RegExp(q, "i") },
            { professors: new RegExp(q, "i") },
            { creatorFullName: new RegExp(q, "i") },
            // Search in the concatenated student names field
            { allStudentNames: new RegExp(q, "i") },
            // Search in the concatenated registered user names field
            { allRegisteredUserNames: new RegExp(q, "i") }
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
          isRestricted: 1,
          allowedUserTypes: 1,
          creatorFullName: 1,
          creatorName: '$creatorFullName',
          professorName: '$creatorFullName',
          createdByName: '$creatorFullName',
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

    let events = await Event.aggregate(pipeline);

    // POST-FILTER: Double-check and remove ANY past events that might have slipped through
    const nowPostFilter = new Date();
    const initialCount = events.length;
    events = events.filter(event => {
      // If event has endDate, check if it's in the future
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        if (endDate <= nowPostFilter) {
          console.log('🚫 POST-FILTER: Removing past event:', event.title, 'endDate:', event.endDate, 'now:', nowPostFilter.toISOString());
          return false;
        }
      } else if (event.startDate) {
        // If no endDate, check startDate
        const startDate = new Date(event.startDate);
        if (startDate <= nowPostFilter) {
          console.log('🚫 POST-FILTER: Removing past event (no endDate):', event.title, 'startDate:', event.startDate, 'now:', nowPostFilter.toISOString());
          return false;
        }
      } else {
        // No dates at all - exclude it
        console.log('🚫 POST-FILTER: Removing event with no dates:', event.title);
        return false;
      }
      return true;
    });
    if (events.length < initialCount) {
      console.log('🚫 POST-FILTER: Removed', (initialCount - events.length), 'past events');
    }

    // Filter by user type restrictions
    if (req.user && req.user.userType) {
      const userType = req.user.userType;
      events = events.filter(event => {
        // If event has restrictions and allowedUserTypes array
        if (event.isRestricted && event.allowedUserTypes && event.allowedUserTypes.length > 0) {
          // Check if user's type is in the allowed list
          return event.allowedUserTypes.includes(userType);
        }
        // If no restrictions, show to all
        return true;
      });
    }

    console.log('🔍 Found events after all filters:', events.length);
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

        const creatorFullName = event.createdBy ? `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim() : null;
        return {
          ...event,
          vendors,
          creatorName: creatorFullName,
          professorName: creatorFullName,
          createdByName: creatorFullName,
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

    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
    const filter = {
      type: { $in: validTypes }, // Only valid event types
      $and: [
        { title: { $exists: true } },
        { title: { $ne: null } },
        { title: { $ne: '' } },
        { location: { $exists: true } },
        { location: { $ne: null } },
        { location: { $ne: '' } }
      ]
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

    // Normalize role to match Registration model enum (lowercase)
    let userRole = (req.user.userType || req.user.role || "student").toLowerCase();
    // Map common role variations to valid enum values
    if (userRole === 'ta') {
      userRole = 'TA'; // TA is capitalized in the enum
    } else if (!['student', 'staff', 'TA', 'professor', 'vendor'].includes(userRole)) {
      userRole = 'student'; // Default to student if role doesn't match enum
    }

    // Create registration (store the same id in `event` field)
    const registration = await Registration.create({
      event: id,                 // works for both Event and Trip ids
      user: userId,
      role: userRole,
      status: "approved"
    });

    // Generate QR code for bazaar/booth events (after registration is created to include registration ID)
    if (holderType === "event" && (holder.type === 'bazaar' || holder.type === 'booth' || holder.type === 'platformBooth' || holder.type === 'standaloneBooth')) {
      try {
        const User = require('../models/userModel');
        const user = await User.findById(userId);

        if (!user) {
          console.warn('⚠️ User not found for QR code generation:', userId);
        }

        const { generateQRCode } = require('../utils/generateQRCode');

        const qrResult = await generateQRCode(
          registration._id.toString(),
          {
            userId: userId,
            eventId: id,
            eventName: holder.name || holder.title,
            userName: user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.name || user?.email || 'Visitor',
            userEmail: user?.email || null
          }
        );

        if (qrResult.success) {
          registration.qrCode = qrResult.qrCodeDataUrl;
          registration.qrCodeData = qrResult.qrDataString;
          await registration.save();
          console.log('✅ QR code generated for registration:', registration._id);
        } else {
          console.warn('⚠️ QR code generation failed:', qrResult.error);
        }
      } catch (error) {
        console.error('❌ Error generating QR code:', error);
        console.error('❌ QR code error stack:', error.stack);
        // Don't fail the registration if QR code generation fails
      }
    }

    // Optionally increment registeredCount for Events only (Trips don't have this field)
    if (holderType === "event") {
      holder.registeredCount = (holder.registeredCount || 0) + 1;
      await holder.save();
    }

    // Send QR codes to vendors for bazaar/booth events
    if (holderType === "event" && (holder.type === 'bazaar' || holder.type === 'booth' || holder.type === 'platformBooth' || holder.type === 'standaloneBooth')) {
      try {
        const VendorRequest = require('../models/vendorRequest');
        const { sendQRCodesToVendor } = require('../utils/sendQRCodesToVendor');

        console.log('🔍 Looking for vendor requests for event:', id);
        console.log('🔍 Event type:', holder.type);

        // Find all accepted vendor requests for this event
        const vendorRequests = await VendorRequest.find({
          $or: [
            { bazaar: id, status: 'accepted' },
            { booth: id, status: 'accepted' },
            { standaloneBooth: id, status: 'accepted' }
          ]
        }).populate('vendor', 'email firstName lastName companyName');

        console.log(`🔍 Found ${vendorRequests.length} accepted vendor request(s) for this event`);

        if (vendorRequests.length === 0) {
          console.log('⚠️ No accepted vendor requests found for this event. QR code email will not be sent.');
          console.log('💡 Make sure you have:');
          console.log('   1. Created a vendor request linked to this event');
          console.log('   2. Accepted the vendor request (status = "accepted")');
        }

        // Get all registrations for this event with QR codes
        const allRegistrations = await Registration.find({ event: id })
          .populate('user', 'email firstName lastName name')
          .sort({ registeredAt: -1 });

        console.log(`🔍 Found ${allRegistrations.length} registration(s) with QR codes for this event`);

        // Send QR codes to each unique vendor (don't wait for completion)
        // Some vendors may have multiple accepted vendor requests for the same event
        // (e.g., booth + standaloneBooth). Deduplicate by vendor _id so we send
        // only one email per vendor address.
        const seenVendorKeys = new Set();
        const uniqueVendors = [];
        for (const vr of vendorRequests) {
          const v = vr.vendor;
          if (!v) continue;
          // Prefer deduplication by email (lowercased) when available,
          // otherwise fall back to vendor id.
          const emailKey = v.email ? String(v.email).toLowerCase().trim() : null;
          const idKey = v._id ? String(v._id) : (v.id ? String(v.id) : null);
          const vid = emailKey || idKey;
          if (!vid) continue;
          if (!seenVendorKeys.has(vid)) {
            seenVendorKeys.add(vid);
            uniqueVendors.push(v);
          }
        }

        for (const vendor of uniqueVendors) {
          if (vendor && vendor.email) {
            console.log(`📧 Sending QR codes email to vendor: ${vendor.email}`);
            sendQRCodesToVendor(vendor, holder, allRegistrations)
              .then(result => {
                if (result.sent) {
                  console.log(`✅ QR codes email sent to vendor: ${vendor.email}`);
                } else if (result.stored) {
                  console.log(`✅ QR codes email stored in database for vendor: ${vendor.email}`);
                  console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
                } else {
                  console.log(`⚠️ QR codes email could not be sent/stored for vendor: ${vendor.email}`);
                  console.log(`   Reason: ${result.reason || result.error || 'Unknown'}`);
                }
              })
              .catch(error => {
                console.error(`❌ Error sending QR codes email to vendor ${vendor.email}:`, error);
              });
          } else {
            console.warn('⚠️ Vendor found but vendor email is missing or invalid:', vendor);
          }
        }
      } catch (error) {
        console.error('❌ Error sending QR codes to vendors:', error);
        console.error('❌ Error stack:', error.stack);
        // Don't fail the registration if email fails
      }
    }

    return res.status(201).json({
      msg: `Successfully registered for ${holderType}`,
      holderType,
      registration
    });
  } catch (err) {
    console.error("❌ Error registering for event/trip:", err);
    console.error("❌ Error stack:", err.stack);
    console.error("❌ Error details:", {
      message: err.message,
      name: err.name,
      code: err.code
    });
    return res.status(500).json({
      msg: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

// Export registered names to .xlsx (except conferences)
exports.exportRegistrations = async (req, res) => {
  console.log('📊 Export registrations called for event:', req.params.id);
  try {
    const XLSX = require('xlsx');
    const eventId = req.params.id;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('📊 Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }
    console.log('📊 Event found:', event.title, event.type);
    
    if (event.type === 'conference') {
      return res.status(400).json({ message: 'Cannot export for conferences' });
    }
    
    // Check total registrations in DB
    const allRegistrations = await Registration.find({});
    console.log('📊 Total registrations in DB:', allRegistrations.length);
    
    // Check registrations for this event
    const registrations = await Registration.find({ event: eventId, status: { $ne: 'cancelled' } });
    console.log('📊 Found registrations for event (before populate):', registrations.length);
    
    // Try populate
    const populatedRegistrations = await Registration.find({ event: eventId, status: { $ne: 'cancelled' } }).populate('user', 'firstName lastName name userType');
    console.log('📊 Found registrations for event (after populate):', populatedRegistrations.length);
    
    if (populatedRegistrations.length > 0) {
      console.log('📊 First registration raw:', registrations[0]);
      console.log('📊 First registration populated:', populatedRegistrations[0]);
    }
    
    // Also try without status filter
    const allEventRegistrations = await Registration.find({ event: eventId }).populate('user', 'firstName lastName name');
    console.log('📊 All registrations for event (including cancelled):', allEventRegistrations.length);
    
    if (allEventRegistrations.length > 0) {
      console.log('📊 Sample registration:', {
        id: allEventRegistrations[0]._id,
        user: allEventRegistrations[0].user,
        status: allEventRegistrations[0].status,
        event: allEventRegistrations[0].event
      });
    }
    
    // Process registrations and build data array
    const data = [];
    for (const reg of populatedRegistrations) {
      console.log('📊 Processing registration:', {
        id: reg._id,
        userId: reg.user,
        userPopulated: !!reg.user,
        userType: reg.user ? typeof reg.user : 'null',
        userData: reg.user ? {
          firstName: reg.user.firstName,
          lastName: reg.user.lastName,
          name: reg.user.name,
          userType: reg.user.userType
        } : null
      });
      
      // Try to get user name
      let fullName = 'Unknown User';
      if (reg.user) {
        if (reg.user.firstName || reg.user.lastName) {
          fullName = `${reg.user.firstName || ''} ${reg.user.lastName || ''}`.trim();
        } else if (reg.user.name) {
          fullName = reg.user.name;
        }
      } else {
        // If populate failed, try to fetch user manually
        try {
          const User = require('../models/userModel');
          const userDoc = await User.findById(reg.user).select('firstName lastName name userType');
          if (userDoc) {
            if (userDoc.firstName || userDoc.lastName) {
              fullName = `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim();
            } else if (userDoc.name) {
              fullName = userDoc.name;
            }
            console.log('📊 Manual user fetch succeeded:', fullName);
          } else {
            console.log('📊 Manual user fetch failed: user not found');
          }
        } catch (err) {
          console.log('📊 Manual user fetch error:', err.message);
        }
      }
      
      if (fullName !== 'Unknown User') {
        data.push({ Name: fullName });
      }
    }
    
    console.log('📊 Final data array:', data);
    
    if (data.length === 0) {
      return res.status(200).json({ message: 'No registrations to export' });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate QR code for external visitors to bazaars
exports.generateQRCode = async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event || !['bazaar', 'career_fair'].includes(event.type)) {
      return res.status(400).json({ message: 'Invalid event type for QR generation' });
    }
    const qrData = `${process.env.CLIENT_URL}/checkin/${eventId}`;
    const qrImage = await QRCode.toDataURL(qrData);
    res.status(200).json({ qrCode: qrImage });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register for an event
exports.registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({ msg: 'Event is not available for registration' });
    }

    // Check user type restrictions
    if (event.isRestricted && event.allowedUserTypes && event.allowedUserTypes.length > 0) {
      const userType = req.user.userType;
      if (!event.allowedUserTypes.includes(userType)) {
        return res.status(403).json({ msg: 'You are not allowed to register for this event' });
      }
    }
    // Check specific user restrictions (legacy)
    if (event.isRestricted && event.allowedUsers && event.allowedUsers.length > 0 && (!event.allowedUserTypes || event.allowedUserTypes.length === 0)) {
      if (!event.allowedUsers.includes(userId)) {
        return res.status(403).json({ msg: 'You are not allowed to register for this event' });
      }
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({ user: userId, event: eventId });
    if (existingRegistration) {
      return res.status(400).json({ msg: 'Already registered for this event' });
    }

    // Create registration
    const registration = new Registration({
      user: userId,
      event: eventId,
      role: req.user.userType.toLowerCase(),
    });

    await registration.save();

    // Update registered count
    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: 1 } });

    res.json({ msg: 'Successfully registered for event' });
  } catch (err) {
    console.error("❌ Error cancelling registration:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

// 💳 Pay for an event (Student, Staff, TA, or Professor)
exports.payForEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    const { paymentMethod } = req.body; // 'wallet' or 'card'

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Check if event has a price
    const eventPrice = event.price || 0;
    if (eventPrice <= 0) {
      return res.status(400).json({
        success: false,
        msg: "This event is free and does not require payment"
      });
    }

    // Find registration
    let registration = await Registration.findOne({
      user: userId,
      event: eventId
    });

    if (!registration) {
      // Check StudentRegistration
      const user = await User.findById(userId);
      if (user && user.email) {
        registration = await StudentRegistration.findOne({
          event: eventId,
          studentEmail: user.email.toLowerCase()
        });
      }
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        msg: "Registration not found. Please register for the event first."
      });
    }

    if (registration.paid) {
      return res.status(400).json({
        success: false,
        msg: "Payment already completed for this event"
      });
    }

    // Handle wallet payment
    if (paymentMethod === 'wallet') {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: "User not found"
        });
      }

      if (!user.walletBalance || user.walletBalance < eventPrice) {
        return res.status(400).json({
          success: false,
          msg: "Insufficient wallet balance",
          required: eventPrice,
          available: user.walletBalance || 0
        });
      }

      // Deduct from wallet
      user.walletBalance -= eventPrice;
      if (!user.walletTransactions) {
        user.walletTransactions = [];
      }
      user.walletTransactions.push({
        amount: -eventPrice,
        type: 'payment',
        description: `Payment for ${event.title}`,
        balanceAfter: user.walletBalance,
        reference: eventId.toString(),
        createdAt: new Date()
      });
      await user.save();

      // Create payment record
      const payment = new Payment({
        user: userId,
        event: eventId,
        amount: eventPrice,
        paymentMethod: 'wallet',
        status: 'success'
      });
      await payment.save();

      // Mark registration as paid
      registration.paid = true;
      await registration.save();

      // Send receipt email
      try {
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
        await sendReceiptEmail(
          user.email,
          userName,
          event.title,
          eventPrice,
          'wallet',
          new Date()
        );
      } catch (emailError) {
        console.error('❌ Failed to send receipt email:', emailError);
      }

      return res.status(200).json({
        success: true,
        msg: "Payment successful",
        paymentId: payment._id,
        walletBalance: user.walletBalance
      });
    }

    // Handle card payment (Stripe)
    if (paymentMethod === 'card') {
      if (!stripe) {
        return res.status(500).json({
          success: false,
          msg: "Card payments are not available. Please use wallet payment."
        });
      }

      // Create payment record
      const payment = new Payment({
        user: userId,
        event: eventId,
        amount: eventPrice,
        paymentMethod: 'card',
        status: 'pending'
      });
      await payment.save();

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'egp',
              product_data: {
                name: event.title,
                description: `Registration fee for ${event.title}`
              },
              unit_amount: Math.round(eventPrice * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventId}`,
        metadata: {
          paymentId: payment._id.toString(),
          userId: userId.toString(),
          eventId: eventId.toString()
        }
      });

      // Update payment with session ID
      payment.stripeSessionId = session.id;
      await payment.save();

      return res.status(200).json({
        success: true,
        msg: "Redirect to payment",
        sessionId: session.id,
        url: session.url
      });
    }

    return res.status(400).json({
      success: false,
      msg: "Invalid payment method. Use 'wallet' or 'card'"
    });

  } catch (err) {
    console.error("❌ Error processing payment:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

// 🚫 Cancel event registration and get refund
exports.cancelRegistration = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Find registration
    let registration = await Registration.findOne({
      user: userId,
      event: eventId
    });

    if (!registration) {
      const user = await User.findById(userId);
      if (user && user.email) {
        registration = await StudentRegistration.findOne({
          event: eventId,
          studentEmail: user.email.toLowerCase()
        });
      }
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        msg: "Registration not found"
      });
    }

    // Check if event has already started
    if (event.startDate && new Date(event.startDate) < new Date()) {
      return res.status(400).json({
        success: false,
        msg: "Cannot cancel registration for an event that has already started"
      });
    }

    // Find payment if exists
    const payment = await Payment.findOne({
      user: userId,
      event: eventId,
      status: 'success'
    });

    // Process refund if payment was made
    if (payment && payment.paid) {
      const eventPrice = event.price || 0;
      
      if (payment.paymentMethod === 'wallet' && eventPrice > 0) {
        // Refund to wallet
        const user = await User.findById(userId);
        if (user) {
          user.walletBalance = (user.walletBalance || 0) + eventPrice;
          if (!user.walletTransactions) {
            user.walletTransactions = [];
          }
          user.walletTransactions.push({
            amount: eventPrice,
            type: 'refund',
            description: `Refund for cancelled registration: ${event.title}`,
            balanceAfter: user.walletBalance,
            reference: eventId.toString(),
            createdAt: new Date()
          });
          await user.save();

          // Send refund email
          try {
            const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
            await sendRefundEmail(
              user.email,
              userName,
              event.title,
              eventPrice,
              new Date()
            );
          } catch (emailError) {
            console.error('❌ Failed to send refund email:', emailError);
          }
        }
      } else if (payment.paymentMethod === 'card' && eventPrice > 0) {
        // For card payments, mark for manual refund or process via Stripe
        // For now, just log it - manual refund may be required
        console.log(`⚠️ Card payment refund needed for payment: ${payment._id}, amount: ${eventPrice}`);
      }
    }

    // Delete registration
    if (registration.constructor.modelName === 'Registration') {
      await Registration.findByIdAndDelete(registration._id);
    } else {
      await StudentRegistration.findByIdAndDelete(registration._id);
    }

    // Update event registered count
    await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } });

    res.status(200).json({
      success: true,
      msg: "Registration cancelled successfully",
      refunded: payment && payment.paid && (payment.paymentMethod === 'wallet')
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

// ⭐ Submit a rating for an event (1-5 stars) - uses Event.ratings array
exports.submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;
    const userType = req.user.userType;
    const userEmail = req.user.email;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        msg: "Rating must be between 1 and 5"
      });
    }

    // Verify event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Check if user has attended/registered for this event
    const allowedUserTypes = ['Student', 'Staff', 'TA', 'Professor'];
    if (allowedUserTypes.includes(userType)) {
      // Check Registration model
      const registration = await Registration.findOne({
        event: id,
        user: userId,
        status: { $in: ['approved', 'pending'] }
      });

      // Check StudentRegistration model
      let studentRegistration = null;
      if (userEmail) {
        studentRegistration = await StudentRegistration.findOne({
          event: id,
          studentEmail: userEmail.toLowerCase(),
          status: { $in: ['approved', 'pending'] }
        });
      }

      // User must be registered in at least one of the registration systems
      if (!registration && !studentRegistration) {
        return res.status(403).json({
          success: false,
          msg: "You can only rate events you have attended/registered for"
        });
      }
    }

    // Check if user already rated this event
    const existingRatingIndex = event.ratings.findIndex(r => 
      r.user && r.user.toString() === userId.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      event.ratings[existingRatingIndex].rating = rating;
      event.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      // Add new rating to Event.ratings array
      event.ratings.push({
        user: userId,
        rating: rating,
        createdAt: new Date()
      });
    }

    await event.save();

    res.status(201).json({
      success: true,
      message: existingRatingIndex !== -1 ? "Rating updated successfully" : "Rating submitted successfully",
      rating: {
        rating: rating,
        user: userId
      }
    });
  } catch (err) {
    console.error("❌ Error submitting rating:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

// 💬 Submit a comment on an event
exports.submitComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const userType = req.user.userType;
    const userEmail = req.user.email;

    // Validate input
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        msg: "Comment text is required"
      });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        msg: "Comment text cannot exceed 1000 characters"
      });
    }

    // Verify event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Check if user has attended/registered for this event
    // For Student/Staff/TA/Professor, they must be registered to comment
    const allowedUserTypes = ['Student', 'Staff', 'TA', 'Professor'];
    if (allowedUserTypes.includes(userType)) {
      // Check Registration model (for general event registrations)
      const registration = await Registration.findOne({
        event: id,
        user: userId,
        status: { $in: ['approved', 'pending'] }
      });

      // Check StudentRegistration model (for workshop/trip registrations)
      let studentRegistration = null;
      if (userEmail) {
        studentRegistration = await StudentRegistration.findOne({
          event: id,
          studentEmail: userEmail.toLowerCase(),
          status: { $in: ['approved', 'pending'] }
        });
      }

      // User must be registered in at least one of the registration systems
      if (!registration && !studentRegistration) {
        return res.status(403).json({
          success: false,
          msg: "You can only comment on events you have attended/registered for"
        });
      }
    }

    // Add comment to event
    event.comments.push({
      user: userId,
      text: text.trim(),
      createdAt: new Date()
    });

    await event.save();

    // Populate user info for response
    await event.populate('comments.user', 'firstName lastName email userType');
    const newComment = event.comments[event.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment submitted successfully",
      comment: {
        _id: newComment._id,
        text: newComment.text,
        user: {
          _id: newComment.user._id,
          firstName: newComment.user.firstName,
          lastName: newComment.user.lastName,
          email: newComment.user.email,
          userType: newComment.user.userType
        },
        createdAt: newComment.createdAt
      }
    });
  } catch (err) {
    console.error("❌ Error submitting comment:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

// 🗑️ Delete a comment from an event
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user._id;
    const userType = req.user.userType;
    // Accept reason from body or query parameter
    const reason = req.body?.reason || req.query?.reason;

    // Verify event exists
    const event = await Event.findById(id).populate('comments.user', 'firstName lastName email userType');
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Find the comment
    const comment = event.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        msg: "Comment not found"
      });
    }

    // Check permissions: owner or admin/event_office
    const commentUserId = comment.user._id ? comment.user._id.toString() : comment.user.toString();
    const isOwner = commentUserId === userId.toString();
    // Check for admin (case-insensitive) - also check req.user.role from JWT token
    const userTypeLower = (userType || '').toLowerCase();
    const roleLower = (req.user.role || '').toLowerCase();
    const isAdmin = userTypeLower === 'admin' ||
      roleLower === 'admin' ||
      userType === 'event_office' ||
      userType === 'Event Office' ||
      userType === 'Events Office' ||
      roleLower === 'event_office';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        msg: "You can only delete your own comments or be an admin/event office to delete any comment"
      });
    }

    // Store comment info before deletion for email
    let commentUser = null;
    if (comment.user && typeof comment.user === 'object' && comment.user.email) {
      commentUser = comment.user;
    } else if (comment.user) {
      commentUser = await User.findById(comment.user).select('firstName lastName email userType');
    }

    const commentText = comment.text;
    const eventTitle = event.title;
    const isInappropriate = reason === 'inappropriate' || reason === 'Inappropriate';

    // Delete the comment
    event.comments.pull(commentId);
    await event.save();

    // Send warning email if deleted for being inappropriate and user is not the owner
    if (isInappropriate && !isOwner && commentUser && commentUser.email) {
      try {
        const userName = commentUser.firstName
          ? `${commentUser.firstName} ${commentUser.lastName || ''}`.trim()
          : commentUser.email;

        // Only send email to Student, Staff, Events Office, TA, or Professor
        const allowedUserTypes = ['Student', 'Staff', 'event_office', 'Event Office', 'Events Office', 'TA', 'Professor'];
        if (allowedUserTypes.includes(commentUser.userType)) {
          const emailResult = await sendCommentWarningEmail(
            commentUser.email,
            userName,
            eventTitle,
            commentText
          );

          if (emailResult.sent) {
            console.log('✅ Comment warning email sent successfully to:', commentUser.email);
          } else {
            console.error('❌ Comment warning email not sent:', emailResult.error || emailResult.reason);
          }
        }
      } catch (emailError) {
        console.error('❌ Exception while sending comment warning email:', emailError);
        // Don't fail the deletion if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      deletedCommentId: commentId
    });
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

exports.getEventRatingsAndComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const event = await Event.findById(id).populate('comments.user', 'firstName lastName email userType');
    if (!event) {
      return res.status(404).json({
        success: false,
        msg: "Event not found"
      });
    }

    // Calculate average rating
    let averageRating = 0;
    let ratingCount = 0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (event.ratings && event.ratings.length > 0) {
      ratingCount = event.ratings.length;
      const sum = event.ratings.reduce((acc, r) => {
        ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
        return acc + r.rating;
      }, 0);
      averageRating = (sum / ratingCount).toFixed(2);
    }

    // Format comments with user information
    const comments = (event.comments || []).map(comment => ({
      _id: comment._id,
      text: comment.text,
      user: {
        _id: comment.user?._id || comment.user,
        firstName: comment.user?.firstName || '',
        lastName: comment.user?.lastName || '',
        email: comment.user?.email || '',
        userType: comment.user?.userType || ''
      },
      createdAt: comment.createdAt
    }));

    res.status(200).json({
      success: true,
      message: "Ratings and comments retrieved successfully",
      eventId: id,
      ratings: {
        average: parseFloat(averageRating),
        count: ratingCount,
        distribution: ratingDistribution
      },
      comments: comments
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

// 🗑️ Cleanup endpoint to delete invalid/empty events
exports.cleanupInvalidEvents = async (req, res) => {
  try {
    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];

    // Find events that should be deleted:
    // 1. Events with invalid types
    // 2. Events with empty/null title
    // 3. Events with empty/null location
    const invalidEvents = await Event.find({
      $or: [
        { type: { $nin: validTypes } },
        { title: { $in: [null, ''] } },
        { location: { $in: [null, ''] } },
        {
          $or: [
            { title: { $exists: false } },
            { location: { $exists: false } }
          ]
        }
      ]
    });

    const deletedCount = invalidEvents.length;

    // Delete invalid events
    if (invalidEvents.length > 0) {
      const eventIds = invalidEvents.map(e => e._id);
      await Event.deleteMany({ _id: { $in: eventIds } });

      // Also clean up related registrations
      await StudentRegistration.deleteMany({ event: { $in: eventIds } });
    }

    res.status(200).json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} invalid events.`,
      deletedCount
    });
  } catch (err) {
    console.error("❌ Error cleaning up invalid events:", err);
    res.status(500).json({
      success: false,
      msg: "Server error during cleanup",
      error: err.message
    });
  }
};

// Get past events that can be archived (Events Office/Admin only)
exports.getPastEventsForArchiving = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all events that have ended (including already archived ones)
    const pastEvents = await Event.find({
      endDate: { $lt: now, $exists: true, $ne: null }
    }).sort({ endDate: -1 });
    
    res.status(200).json({
      success: true,
      data: pastEvents,
      count: pastEvents.length,
      message: `${pastEvents.length} past events found`
    });
  } catch (err) {
    console.error("❌ Error fetching past events for archiving:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Archive specific events by IDs (Events Office/Admin only)
exports.archiveSelectedEvents = async (req, res) => {
  try {
    const { eventIds } = req.body;
    
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "eventIds array is required and cannot be empty"
      });
    }
    
    // Validate that all provided IDs are valid ObjectIds
    const validIds = eventIds.filter(id => {
      return require('mongoose').Types.ObjectId.isValid(id);
    });
    
    if (validIds.length !== eventIds.length) {
      return res.status(400).json({
        success: false,
        message: "All eventIds must be valid ObjectIds"
      });
    }
    
    const now = new Date();
    
    // First, identify which events are eligible for archiving (not already archived)
    const eligibleEvents = await Event.find({
      _id: { $in: validIds },
      endDate: { $lt: now, $exists: true, $ne: null },
      $or: [
        { archived: false },
        { archived: { $exists: false } }
      ]
    }).select('title type endDate');
    
    // Archive the eligible events
    const result = await Event.updateMany(
      {
        _id: { $in: eligibleEvents.map(e => e._id) },
        endDate: { $lt: now, $exists: true, $ne: null },
        $or: [
          { archived: false },
          { archived: { $exists: false } }
        ]
      },
      { archived: true }
    );
    
    res.status(200).json({
      success: true,
      message: `Successfully archived ${result.modifiedCount} events`,
      archivedCount: result.modifiedCount,
      archivedEvents: eligibleEvents
    });
  } catch (err) {
    console.error("❌ Error archiving selected events:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get archived events (Events Office/Admin only)
exports.getArchivedEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { archived: true };
    if (type) {
      query.type = type;
    }
    
    const archivedEvents = await Event.find(query)
      .sort({ endDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: archivedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("❌ Error fetching archived events:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ⭐ Get user's favorite events
exports.getFavoriteEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteEvents');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: 'Favorite events fetched successfully',
      events: user.favoriteEvents || []
    });
  } catch (err) {
    console.error("❌ Error fetching favorite events:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ⭐ Add event to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Get user and check if event is already in favorites
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if already in favorites
    if (user.favoriteEvents && user.favoriteEvents.includes(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Event is already in favorites"
      });
    }

    // Add to favorites
    if (!user.favoriteEvents) {
      user.favoriteEvents = [];
    }
    user.favoriteEvents.push(eventId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Event added to favorites successfully'
    });
  } catch (err) {
    console.error("❌ Error adding event to favorites:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ⭐ Remove event from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if event is in favorites
    if (!user.favoriteEvents || !user.favoriteEvents.includes(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Event is not in favorites"
      });
    }

    // Remove from favorites
    user.favoriteEvents = user.favoriteEvents.filter(
      favId => favId.toString() !== eventId.toString()
    );
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Event removed from favorites successfully'
    });
  } catch (err) {
    console.error("❌ Error removing event from favorites:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
