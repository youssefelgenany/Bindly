const Event = require('../models/eventModel');

// Get a single bazaar by ID
exports.getBazaarById = async (req, res) => {
  try {
    const bazaar = await Event.findById(req.params.id);
    
    if (!bazaar) {
      return res.status(404).json({ message: 'Bazaar not found' });
    }

    // Check if it's actually a bazaar
    if (bazaar.type !== 'bazaar') {
      return res.status(400).json({ message: 'This is not a bazaar event' });
    }

    res.json(bazaar);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bazaar', error: error.message });
  }
};

// Get all bazaars (for users to browse)
exports.getAllBazaars = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { type: 'bazaar' }; // Only get bazaar events

    if (q) {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }

    const bazaars = await Event.find(filter).sort({ startDate: 1 });

    // For each bazaar, also get related booth events
    const bazaarsWithBooths = await Promise.all(
      bazaars.map(async (bazaar) => {
        // Find booth events that are related to this bazaar (same location and overlapping dates)
        const boothEvents = await Event.find({
          type: 'booth',
          location: bazaar.location,
          startDate: { $gte: bazaar.startDate },
          endDate: { $lte: bazaar.endDate },
          status: 'approved'
        }).select('title description startDate endDate location capacity price');

        // If no real booths found, add mock booths for demonstration
        let booths = boothEvents;

        if (booths.length === 0) {
          booths = [
            {
              _id: `mock-booth-1-${bazaar._id}`,
              title: 'Premium Booth A',
              description: 'Large premium booth with excellent visibility and foot traffic. Perfect for established vendors.',
              startDate: bazaar.startDate,
              endDate: bazaar.endDate,
              location: bazaar.location,
              capacity: 50,
              price: 200
            },
            {
              _id: `mock-booth-2-${bazaar._id}`,
              title: 'Standard Booth B',
              description: 'Standard sized booth perfect for most vendors. Good balance of space and cost.',
              startDate: bazaar.startDate,
              endDate: bazaar.endDate,
              location: bazaar.location,
              capacity: 30,
              price: 150
            },
            {
              _id: `mock-booth-3-${bazaar._id}`,
              title: 'Economy Booth C',
              description: 'Budget-friendly booth option for small vendors and startups.',
              startDate: bazaar.startDate,
              endDate: bazaar.endDate,
              location: bazaar.location,
              capacity: 20,
              price: 100
            },
            {
              _id: `mock-booth-4-${bazaar._id}`,
              title: 'Corner Booth D',
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
          ...bazaar.toObject(),
          booths: booths
        };
      })
    );

    res.json(bazaarsWithBooths);
  } catch (err) {
    console.error("❌ Error fetching bazaars:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Register a user for a bazaar
exports.registerForBazaar = async (req, res) => {
  try {
    const bazaar = await Event.findById(req.params.id);
    if (!bazaar) return res.status(404).json({ msg: "Bazaar not found" });

    // Check if it's actually a bazaar
    if (bazaar.type !== 'bazaar') {
      return res.status(400).json({ msg: "This is not a bazaar event" });
    }

    // Check if registration deadline passed
    if (bazaar.registrationDeadline && new Date() > new Date(bazaar.registrationDeadline)) {
      return res.status(400).json({ msg: "Registration deadline has passed" });
    }

    // For now, we'll just return success since bazaars don't have capacity limits
    // In a real implementation, you might want to track registrations separately
    res.status(201).json({ msg: "Successfully registered for bazaar", bazaar: bazaar.title });
  } catch (err) {
    console.error("❌ Error registering for bazaar:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create bazaar (31)
exports.createBazaar = async (req, res) => {
  try {
    const { name, startDate, endDate, location, description, registrationDeadline } = req.body;

    const { allowedUserTypes } = req.body;
    const newBazaar = new Event({
      title: name, // Map name to title for Event model
      type: 'bazaar', // Set type as bazaar
      startDate,
      endDate,
      registrationDeadline, // Save registration deadline
      location,
      description,
      createdBy: req.user._id, // Track who created it
      status: 'approved', // Event office creates approved events
      // User type restrictions
      isRestricted: allowedUserTypes && allowedUserTypes.length > 0,
      allowedUserTypes: allowedUserTypes && allowedUserTypes.length > 0 ? allowedUserTypes : []
    });

    await newBazaar.save();
    res.status(201).json({ message: 'Bazaar created successfully', bazaar: newBazaar });

  } catch (error) {
    res.status(500).json({ message: 'Error creating bazaar', error: error.message });
  }
};

// Edit bazaar (32)
exports.editBazaar = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const bazaar = await Event.findById(id);
    if (!bazaar) {
      return res.status(404).json({ message: 'Bazaar not found' });
    }

    // Check if it's actually a bazaar
    if (bazaar.type !== 'bazaar') {
      return res.status(400).json({ message: 'This is not a bazaar event' });
    }

    if (new Date() >= new Date(bazaar.startDate)) {
      return res.status(400).json({ message: 'Cannot edit a bazaar that has already started' });
    }

    // Map name to title if provided
    if (updates.name) {
      updates.title = updates.name;
      delete updates.name;
    }

    Object.assign(bazaar, updates);
    await bazaar.save();

    res.json({ message: 'Bazaar updated successfully', bazaar });
  } catch (error) {
    res.status(500).json({ message: 'Error updating bazaar', error: error.message });
  }
};