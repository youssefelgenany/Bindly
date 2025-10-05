const Bazaar = require ('../models/bazaarModel');

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