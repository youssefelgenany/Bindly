const mongoose = require("mongoose");
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
      // Build type-specific search conditions
      const searchConditions = [
        { title: nameRegex },
        { name: nameRegex },
        { description: nameRegex },
        { location: nameRegex },
        { 'creator.firstName': nameRegex },
        { 'creator.lastName': nameRegex },
      ];

      // For workshops: add professor name search
      if (!type || type === 'workshop' || type === 'workshops') {
        searchConditions.push({ professors: nameRegex });
        searchConditions.push({ faculty: nameRegex });
      }

      // For conferences: add website and agenda search
      if (!type || type === 'conference' || type === 'confrence') {
        searchConditions.push({ website: nameRegex });
        searchConditions.push({ agenda: nameRegex });
      }

      // For trips: add price search (as string)
      if (!type || type === 'trip' || type === 'trips') {
        searchConditions.push({ price: { $exists: true } }); // Will be filtered later if needed
      }

      pipeline.push({
        $match: {
          $or: searchConditions
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
        ratings: 1,
        comments: 1,
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
      // Calculate rating statistics
      const ratingCount = e.ratings ? e.ratings.length : 0;
      const averageRating = ratingCount > 0
        ? parseFloat((e.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2))
        : 0;

      // Calculate comment count
      const commentCount = e.comments ? e.comments.length : 0;

      const baseEvent = {
        ...e,
        creatorName: e.createdBy ? `${e.createdBy.firstName || ''} ${e.createdBy.lastName || ''}`.trim() : null,
        creatorRole: e.createdBy ? (e.createdBy.userType || null) : null,
        creatorFirstName: e.createdBy?.firstName || null,
        creatorLastName: e.createdBy?.lastName || null,
        averageRating,
        ratingCount,
        commentCount
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

    // Filter bazaars and booths by vendor names if search term is provided
    let filteredEvents = eventsWithVendors;
    if (search && (!type || type === 'bazaar' || type === 'bazaars' || type === 'booth' || type === 'booths')) {
      const searchLower = search.toLowerCase();
      filteredEvents = eventsWithVendors.filter(e => {
        // If it's not a bazaar or booth, keep it (already filtered by basic search)
        if (e.type !== 'bazaar' && e.type !== 'booth') return true;
        
        // For bazaars and booths, check if any vendor matches the search
        const vendorMatches = e.vendors && e.vendors.some(vendor => {
          const vendorName = (vendor.companyName || vendor.name || vendor.contactName || '').toLowerCase();
          return vendorName.includes(searchLower);
        });
        
        // Also check basic event fields (already matched in pipeline, but keep for consistency)
        const eventMatches = 
          (e.title && e.title.toLowerCase().includes(searchLower)) ||
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.location && e.location.toLowerCase().includes(searchLower));
        
        return vendorMatches || eventMatches;
      });
    }

    // Ensure events are sorted by startDate (nearest first) after filtering
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB; // Ascending order (nearest date first)
    });

    res.json(filteredEvents);
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
            { creatorFullName: new RegExp(q, "i") },
            // For conferences: search in website and agenda
            ...(type === 'conference' || !type ? [
              { website: new RegExp(q, "i") },
              { agenda: new RegExp(q, "i") }
            ] : [])
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
          ratings: 1,
          comments: 1,
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
        
        // Calculate rating statistics
        const ratingCount = event.ratings ? event.ratings.length : 0;
        const averageRating = ratingCount > 0
          ? parseFloat((event.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2))
          : 0;

        // Calculate comment count
        const commentCount = event.comments ? event.comments.length : 0;

        return {
          ...event,
          vendors,
          creatorName: event.createdBy ? `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim() : null,
          creatorRole: event.createdBy ? (event.createdBy.userType || null) : null,
          creatorFirstName: event.createdBy?.firstName || null,
          creatorLastName: event.createdBy?.lastName || null,
          averageRating,
          ratingCount,
          commentCount
        };
      })
    );

    // Filter bazaars and booths by vendor names if search term is provided
    let filteredEvents = eventsWithVendors;
    if (q && (type === 'bazaar' || type === 'booth' || !type)) {
      const searchLower = q.toLowerCase();
      filteredEvents = eventsWithVendors.filter(e => {
        // If it's not a bazaar or booth, keep it (already filtered by basic search)
        if (e.type !== 'bazaar' && e.type !== 'booth') return true;
        
        // For bazaars and booths, check if any vendor matches the search
        const vendorMatches = e.vendors && e.vendors.some(vendor => {
          const vendorName = (vendor.companyName || '').toLowerCase();
          return vendorName.includes(searchLower);
        });
        
        // Also check basic event fields (already matched in pipeline, but keep for consistency)
        const eventMatches = 
          (e.title && e.title.toLowerCase().includes(searchLower)) ||
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.location && e.location.toLowerCase().includes(searchLower));
        
        return vendorMatches || eventMatches;
      });
    }

    // Ensure events are sorted by startDate (nearest first) after filtering
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB; // Ascending order (nearest date first)
    });

    res.json({
      success: true,
      events: filteredEvents
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
      const searchConditions = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];

      // For workshops: add professor name and faculty search
      if (!type || type === 'workshop' || type === 'workshops') {
        searchConditions.push({ professors: new RegExp(q, "i") });
        searchConditions.push({ faculty: new RegExp(q, "i") });
      }

      // For conferences: add website and agenda search
      if (!type || type === 'conference' || type === 'confrence') {
        searchConditions.push({ website: new RegExp(q, "i") });
        searchConditions.push({ agenda: new RegExp(q, "i") });
      }

      filter.$or = searchConditions;
    }
    if (type && type !== 'all') {
      const typeMap = {
        workshops: 'workshop',
        trips: 'trip',
        bazaars: 'bazaar',
        booths: 'booth',
        confrence: 'conference',
        conference: 'conference'
      };
      filter.type = typeMap[type] || type;
    }
    if (status && status !== 'all') filter.status = status;

    console.log('🔍 Filter applied:', filter);

    const events = await Event.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: 1 }); // Sort by startDate ascending (nearest date first)

    console.log('📊 Found events:', events.length);
    console.log('📊 Events data:', events);

    // Add vendor information for workshops and booths
    const eventsWithVendors = await Promise.all(events.map(async (event) => {
      const baseEvent = event.toObject();
      
      // Calculate rating statistics
      const ratingCount = baseEvent.ratings ? baseEvent.ratings.length : 0;
      const averageRating = ratingCount > 0
        ? parseFloat((baseEvent.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2))
        : 0;
      baseEvent.averageRating = averageRating;
      baseEvent.ratingCount = ratingCount;
      
      // Calculate comment count
      const commentCount = baseEvent.comments ? baseEvent.comments.length : 0;
      baseEvent.commentCount = commentCount;
      
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

    // Filter bazaars and booths by vendor names if search term is provided
    let filteredEvents = eventsWithVendors;
    if (q && (type === 'bazaar' || type === 'bazaars' || type === 'booth' || type === 'booths' || !type)) {
      const searchLower = q.toLowerCase();
      filteredEvents = eventsWithVendors.filter(e => {
        // If it's not a bazaar or booth, keep it (already filtered by basic search)
        if (e.type !== 'bazaar' && e.type !== 'booth') return true;
        
        // For bazaars and booths, check if any vendor matches the search
        const vendorMatches = e.vendors && e.vendors.some(vendor => {
          const vendorName = (vendor.companyName || vendor.contactName || '').toLowerCase();
          return vendorName.includes(searchLower);
        });
        
        // Also check basic event fields (already matched in filter, but keep for consistency)
        const eventMatches = 
          (e.title && e.title.toLowerCase().includes(searchLower)) ||
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.location && e.location.toLowerCase().includes(searchLower));
        
        return vendorMatches || eventMatches;
      });
    }

    // Ensure events are sorted by startDate (nearest first) after filtering
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB; // Ascending order (nearest date first)
    });

    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      events: filteredEvents
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
    const event = await Event.findById(req.params.id)
      .populate('ratings.user', 'firstName lastName email userType')
      .populate('comments.user', 'firstName lastName email userType');
    
    if (!event) return res.status(404).json({ msg: "Event not found" });
    
    // Calculate rating statistics
    const ratingCount = event.ratings ? event.ratings.length : 0;
    const averageRating = ratingCount > 0
      ? parseFloat((event.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2))
      : 0;
    
    // Calculate comment count
    const commentCount = event.comments ? event.comments.length : 0;
    
    // Format comments with user info
    const formattedComments = event.comments ? event.comments.map(comment => ({
      _id: comment._id,
      user: {
        _id: comment.user._id,
        name: `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim(),
        email: comment.user.email,
        userType: comment.user.userType
      },
      text: comment.text,
      createdAt: comment.createdAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
    
    const eventObj = event.toObject();
    eventObj.averageRating = averageRating;
    eventObj.ratingCount = ratingCount;
    eventObj.commentCount = commentCount;
    eventObj.comments = formattedComments;
    
    res.json(eventObj);
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
      .sort({ startDate: 1 }); // Sort by startDate ascending (nearest date first)

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

// ⭐ Submit or update a rating for an event
exports.submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;

    console.log('⭐ Submit rating request:', {
      eventId: id,
      userId: userId,
      body: req.body,
      rating: rating,
      ratingType: typeof rating
    });

    // Validate rating
    if (rating === undefined || rating === null) {
      console.log('❌ Rating is missing');
      return res.status(400).json({ 
        success: false,
        msg: "Rating is required. Please provide 'rating' field in request body (1-5)." 
      });
    }

    // Convert to number if it's a string
    const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Number(rating);

    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      console.log('❌ Invalid rating value:', rating);
      return res.status(400).json({ 
        success: false,
        msg: "Rating must be a number between 1 and 5" 
      });
    }

    // Validate event ID format
    if (!id || typeof id !== 'string') {
      console.log('❌ Event ID is missing or not a string:', id);
      return res.status(400).json({ 
        success: false,
        msg: "Event ID is required and must be a string" 
      });
    }

    if (id.length !== 24) {
      console.log('❌ Invalid event ID length:', id.length, 'Expected: 24');
      return res.status(400).json({ 
        success: false,
        msg: `Invalid event ID format. Expected 24 characters, got ${id.length}. Please use a valid MongoDB ObjectId.` 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ Invalid event ID format:', id);
      return res.status(400).json({ 
        success: false,
        msg: "Invalid event ID format. Please use a valid MongoDB ObjectId (24 hexadecimal characters)." 
      });
    }

    // Check if event exists
    let event;
    try {
      event = await Event.findById(id);
    } catch (findError) {
      console.error('❌ Error finding event:', findError);
      return res.status(400).json({ 
        success: false,
        msg: "Invalid event ID format",
        error: findError.message 
      });
    }

    if (!event) {
      console.log('❌ Event not found:', id);
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Initialize ratings array if it doesn't exist
    if (!event.ratings) {
      event.ratings = [];
    }

    // Check if user has already rated this event
    const existingRatingIndex = event.ratings.findIndex(
      r => r.user && r.user.toString() === userId.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      event.ratings[existingRatingIndex].rating = ratingNum;
      event.ratings[existingRatingIndex].createdAt = new Date();
      console.log('✅ Updating existing rating');
    } else {
      // Add new rating
      event.ratings.push({
        user: userId,
        rating: ratingNum,
        createdAt: new Date()
      });
      console.log('✅ Adding new rating');
    }

    await event.save();

    // Calculate average rating
    const averageRating = event.ratings.length > 0
      ? (event.ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / event.ratings.length).toFixed(2)
      : 0;

    const savedRating = event.ratings[existingRatingIndex !== -1 ? existingRatingIndex : event.ratings.length - 1];

    console.log('✅ Rating submitted successfully');

    res.status(200).json({
      success: true,
      msg: existingRatingIndex !== -1 ? "Rating updated successfully" : "Rating submitted successfully",
      rating: {
        user: userId,
        rating: ratingNum,
        createdAt: savedRating.createdAt
      },
      averageRating: parseFloat(averageRating),
      totalRatings: event.ratings.length
    });
  } catch (err) {
    console.error("❌ Error submitting rating:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      success: false,
      msg: "Server error",
      error: err.message 
    });
  }
};

// ⭐ Get all ratings for an event
exports.getEventRatings = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('ratings.user', 'firstName lastName email userType')
      .select('ratings');

    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Calculate average rating
    const averageRating = event.ratings.length > 0
      ? (event.ratings.reduce((sum, r) => sum + r.rating, 0) / event.ratings.length).toFixed(2)
      : 0;

    // Format ratings with user info
    const formattedRatings = event.ratings.map(r => ({
      _id: r._id,
      user: {
        _id: r.user._id,
        name: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
        email: r.user.email,
        userType: r.user.userType
      },
      rating: r.rating,
      createdAt: r.createdAt
    }));

    res.status(200).json({
      success: true,
      ratings: formattedRatings,
      averageRating: parseFloat(averageRating),
      totalRatings: event.ratings.length
    });
  } catch (err) {
    console.error("❌ Error fetching event ratings:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// ⭐ Get current user's rating for an event
exports.getUserRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id).select('ratings');

    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    const userRating = event.ratings.find(
      r => r.user.toString() === userId.toString()
    );

    if (!userRating) {
      return res.status(200).json({
        success: true,
        hasRated: false,
        rating: null
      });
    }

    res.status(200).json({
      success: true,
      hasRated: true,
      rating: {
        _id: userRating._id,
        rating: userRating.rating,
        createdAt: userRating.createdAt
      }
    });
  } catch (err) {
    console.error("❌ Error fetching user rating:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// 💬 Submit a comment on an event
exports.submitComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    console.log('💬 Submit comment request:', {
      eventId: id,
      userId: userId,
      body: req.body,
      text: text,
      textType: typeof text
    });

    // Validate comment text
    if (text === undefined || text === null) {
      console.log('❌ Comment text is missing');
      return res.status(400).json({ 
        success: false,
        msg: "Comment text is required. Please provide 'text' field in request body." 
      });
    }

    if (typeof text !== 'string') {
      console.log('❌ Comment text is not a string:', typeof text);
      return res.status(400).json({ 
        success: false,
        msg: "Comment text must be a string" 
      });
    }

    if (text.trim().length === 0) {
      console.log('❌ Comment text is empty');
      return res.status(400).json({ 
        success: false,
        msg: "Comment text cannot be empty" 
      });
    }

    if (text.trim().length > 1000) {
      console.log('❌ Comment text is too long:', text.trim().length);
      return res.status(400).json({ 
        success: false,
        msg: "Comment must be 1000 characters or less" 
      });
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      console.log('❌ Event not found:', id);
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Initialize comments array if it doesn't exist
    if (!event.comments) {
      event.comments = [];
    }

    // Add new comment
    const newComment = {
      user: userId,
      text: text.trim(),
      createdAt: new Date()
    };

    event.comments.push(newComment);
    await event.save();

    // Populate user info for the response
    await event.populate('comments.user', 'firstName lastName email userType');

    const addedComment = event.comments[event.comments.length - 1];

    console.log('✅ Comment submitted successfully');

    res.status(201).json({
      success: true,
      msg: "Comment submitted successfully",
      comment: {
        _id: addedComment._id,
        user: {
          _id: addedComment.user._id,
          name: `${addedComment.user.firstName || ''} ${addedComment.user.lastName || ''}`.trim(),
          email: addedComment.user.email,
          userType: addedComment.user.userType
        },
        text: addedComment.text,
        createdAt: addedComment.createdAt
      },
      totalComments: event.comments.length
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

// 💬 Get all comments for an event
exports.getEventComments = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('comments.user', 'firstName lastName email userType')
      .select('comments');

    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Format comments with user info
    const formattedComments = event.comments.map(comment => ({
      _id: comment._id,
      user: {
        _id: comment.user._id,
        name: `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim(),
        email: comment.user.email,
        userType: comment.user.userType
      },
      text: comment.text,
      createdAt: comment.createdAt
    }));

    // Sort comments by creation date (newest first)
    formattedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      comments: formattedComments,
      totalComments: event.comments.length
    });
  } catch (err) {
    console.error("❌ Error fetching event comments:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};

// 💬 Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        msg: "Event not found" 
      });
    }

    // Find the comment
    const commentIndex = event.comments.findIndex(
      c => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ 
        success: false,
        msg: "Comment not found" 
      });
    }

    const comment = event.comments[commentIndex];

    // Check if user owns the comment or is admin/event office
    const isOwner = comment.user.toString() === userId.toString();
    const isAdmin = req.user.userType === 'Admin' || req.user.userType === 'event_office' || req.user.userType === 'Event Office';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        msg: "You can only delete your own comments" 
      });
    }

    // Remove the comment
    event.comments.splice(commentIndex, 1);
    await event.save();

    res.status(200).json({
      success: true,
      msg: "Comment deleted successfully",
      totalComments: event.comments.length
    });
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    res.status(500).json({ 
      success: false,
      msg: "Server error" 
    });
  }
};