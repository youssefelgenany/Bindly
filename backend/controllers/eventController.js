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
      status: "approved" // Automatically approve for admins/event office
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

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    Object.assign(event, updates);
    await event.save();

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
