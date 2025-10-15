const Event = require("../models/eventModel");
const Registration = require("../models/registrationModel");

// 🎯 Create a new event (Admin or Event Office)
exports.createEvent = async (req, res) => {
  try {
    const { title, description, type, startDate, endDate, location, capacity } = req.body;

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
      status: req.user.userType === "Professor" ? "pending" : "approved" // Professors submit for approval
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
      title,
      description,
      agenda,
      website,
      budget,
      fundingSource,
      extraResources,
      startDate,
      endDate,
      location,
      capacity
    } = req.body;

    if (!title || !startDate || !endDate || !location || !agenda || !website || !budget || !fundingSource) {
      return res.status(400).json({ msg: "Missing required conference fields" });
    }

    const newConference = new Event({
      title,
      description,
      type: "conference",
      agenda,
      website,
      budget,
      fundingSource,
      extraResources,
      startDate,
      endDate,
      location,
      capacity: capacity || 100,
      createdBy: req.user._id,
      status: "approved"
    });

    await newConference.save();
    res.status(201).json({ msg: "Conference created successfully", conference: newConference });
  } catch (err) {
    console.error("❌ Error creating conference:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 📅 Get all approved/upcoming events
exports.getAllEvents = async (req, res) => {
  try {
    const { q, type } = req.query;
    const filter = { status: "approved" };

    if (q) {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }
    if (type) filter.type = type;

    const events = await Event.find(filter).sort({ startDate: 1 });

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all events for admin management (including pending)
exports.getAllEventsForAdmin = async (req, res) => {
  try {
    const { q, type, status } = req.query;
    console.log('🔍 Admin requesting events with query:', { q, type, status });
    
    const filter = {};

    if (q) {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }
    if (type) filter.type = type;
    if (status && status !== 'all') filter.status = status;

    console.log('🔍 Filter applied:', filter);

    const events = await Event.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log('📊 Found events:', events.length);
    console.log('📊 Events data:', events);

    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      events
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
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Check if professor is trying to delete someone else's event
    if (req.user.userType === "Professor" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "You can only delete your own events" });
    }

    await event.deleteOne();
    res.json({ msg: "Event deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 📝 Register a user for an event
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Check if registration deadline passed or event full
    if (event.capacity && event.registeredCount >= event.capacity) {
      return res.status(400).json({ msg: "Event is full" });
    }

    const existing = await Registration.findOne({
      event: event._id,
      user: req.user._id
    });
    if (existing) {
      return res.status(400).json({ msg: "You are already registered for this event" });
    }

    const registration = new Registration({
      event: event._id,
      user: req.user._id,
      role: req.user.role,
      status: "approved"
    });

    await registration.save();

    // Increment count in Event
    event.registeredCount = (event.registeredCount || 0) + 1;
    await event.save();

    res.status(201).json({ msg: "Successfully registered for event", registration });
  } catch (err) {
    console.error("❌ Error registering for event:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// 👤 Get events the logged-in user is registered for
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate("event", "title startDate endDate location type")
      .sort({ createdAt: -1 });

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
