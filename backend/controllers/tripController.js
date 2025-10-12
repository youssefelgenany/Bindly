const Trip = require('../models/tripModel');

// Create a new Trip (33)
exports.createTrip = async (req, res) => {
  try {
    const { name, location, price, startDate, endDate, description, capacity, registrationDeadline } = req.body;

    const newTrip = new Trip({
      name,
      location,
      price,
      startDate,
      endDate,
      description,
      capacity,
      registrationDeadline
    });

    await newTrip.save();
    res.status(201).json({ message: ' Trip created successfully', trip: newTrip });
  } catch (error) {
    res.status(500).json({ message: ' Error creating trip', error: error.message });
  }
};

// Edit Trip (34)
exports.editTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: ' Trip not found' });
    }

    if (new Date() >= new Date(trip.startDate)) {
      return res.status(400).json({ message: ' Cannot edit a trip that has already started' });
    }

    Object.assign(trip, updates);
    await trip.save();

    res.json({ message: ' Trip updated successfully', trip });
  } catch (error) {
    res.status(500).json({ message: ' Error updating trip', error: error.message });
  }
};
