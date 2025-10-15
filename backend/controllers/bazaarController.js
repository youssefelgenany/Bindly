const Bazaar = require ('../models/bazaarModel');

// Get all bazaars (for users to browse)
exports.getAllBazaars = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }
    
    const bazaars = await Bazaar.find(filter).sort({ startDate: 1 });
    res.json(bazaars);
  } catch (err) {
    console.error("❌ Error fetching bazaars:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Register a user for a bazaar
exports.registerForBazaar = async (req, res) => {
  try {
    const bazaar = await Bazaar.findById(req.params.id);
    if (!bazaar) return res.status(404).json({ msg: "Bazaar not found" });

    // Check if registration deadline passed
    if (new Date() > new Date(bazaar.registrationDeadline)) {
      return res.status(400).json({ msg: "Registration deadline has passed" });
    }

    // For now, we'll just return success since bazaars don't have capacity limits
    // In a real implementation, you might want to track registrations separately
    res.status(201).json({ msg: "Successfully registered for bazaar", bazaar: bazaar.name });
  } catch (err) {
    console.error("❌ Error registering for bazaar:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create bazaar (31)
exports.createBazaar = async (req, res) => {
    try {
        const {name, startDate, endDate, location, description, registrationDeadline} = req.body;

        const newBazaar = new Bazaar({
            name,
            startDate,
            endDate,
            location,
            description,
            registrationDeadline
        }

        );

        await newBazaar.save();
        res.status(201).json({ message: ' Bazaar created successfully', bazaar: newBazaar });

    } catch (error) {
         res.status(500).json({ message: ' Error creating bazaar', error: error.message });
    }
};

// Edit bazaar (32)
exports.editBazaar = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const bazaar = await Bazaar.findById(id);
    if (!bazaar) {
      return res.status(404).json({ message: ' Bazaar not found' });
    }

    if (new Date() >= new Date(bazaar.startDate)) {
      return res.status(400).json({ message: ' Cannot edit a bazaar that has already started' });
    }

    Object.assign(bazaar, updates);
    await bazaar.save();

    res.json({ message: ' Bazaar updated successfully', bazaar });
  } catch (error) {
    res.status(500).json({ message: ' Error updating bazaar', error: error.message });
  }
};