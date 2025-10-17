const Event = require('../models/eventModel');

// Create a new Trip (33)
exports.createTrip = async (req, res) => {
  try {
    console.log('🔹 Trip creation request received:', req.body);
    console.log('🔹 User making request:', req.user);
    
    const { name, location, price, startDate, endDate, description, capacity, registrationDeadline } = req.body;

    // Validate required fields
    if (!name || !location || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, location, startDate, endDate' 
      });
    }

    const newTrip = new Event({
      title: name, // Map name to title for Event model
      type: 'trip', // Set type as trip
      location,
      price,
      startDate,
      endDate,
      description,
      capacity,
      registrationDeadline,
      createdBy: req.user._id, // Track who created it
      status: 'approved' // Event office creates approved events
    });

    console.log('🔹 Creating trip with data:', newTrip);
    await newTrip.save();
    console.log('✅ Trip created successfully:', newTrip._id);
    
    res.status(201).json({ message: 'Trip created successfully', trip: newTrip });
  } catch (error) {
    console.error('❌ Error creating trip:', error);
    res.status(500).json({ message: 'Error creating trip', error: error.message });
  }
};

// Edit Trip (34)
exports.editTrip = async (req, res) => {
  try {
    console.log('🔹 Trip update request received:', req.body);
    console.log('🔹 Trip ID:', req.params.id);
    console.log('🔹 User making request:', req.user);
    
    const { id } = req.params;
    const updates = req.body;

    const trip = await Event.findById(id);
    if (!trip) {
      console.log('❌ Trip not found with ID:', id);
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    console.log('🔍 Found trip:', { id: trip._id, type: trip.type, title: trip.title });
    
    // Check if it's actually a trip
    if (trip.type !== 'trip') {
      console.log('❌ Not a trip event, type is:', trip.type);
      return res.status(400).json({ message: 'This is not a trip event' });
    }

    if (new Date() >= new Date(trip.startDate)) {
      console.log('❌ Trip has already started');
      return res.status(400).json({ message: 'Cannot edit a trip that has already started' });
    }

    // Map name to title if provided
    if (updates.name) {
      updates.title = updates.name;
      delete updates.name;
    }

    console.log('🔹 Updates to apply:', updates);
    Object.assign(trip, updates);
    await trip.save();
    console.log('✅ Trip updated successfully:', trip._id);

    res.json({ message: 'Trip updated successfully', trip });
  } catch (error) {
    console.error('❌ Error updating trip:', error);
    res.status(500).json({ message: 'Error updating trip', error: error.message });
  }
};
