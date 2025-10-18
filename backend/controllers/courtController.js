const Court = require('../models/courtModel');

// Get all courts for students
exports.getCourtsForStudents = async (req, res) => {
  try {
    console.log('🏀 Fetching courts for students...');
    console.log('🏀 Query params:', req.query);

    const { q, type, status } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Type filter
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    // Status filter (optional - if not provided, show all)
    if (status && status !== 'all') {
      filter.status = status;
    }

    console.log('🏀 Filter:', filter);

    let courts = await Court.find(filter)
      .populate('createdBy', 'firstName lastName email userType')
      .sort({ name: 1 })
      .lean();

    console.log('🏀 Found courts before search:', courts.length);

    // Apply search filter if provided
    if (q && q.trim()) {
      const searchQuery = new RegExp(q.trim(), 'i');
      courts = courts.filter(court =>
        searchQuery.test(court.name) ||
        searchQuery.test(court.location) ||
        searchQuery.test(court.type) ||
        searchQuery.test(court.description || '')
      );
      console.log('🏀 Found courts after search:', courts.length);
    }

    // Format the response
    const formattedCourts = courts.map(court => ({
      id: court._id,
      name: court.name,
      type: court.type,
      location: court.location,
      description: court.description,
      capacity: court.capacity,
      equipment: court.equipment || [],
      amenities: court.amenities || [],
      availability: court.availability,
      hourlyRate: court.hourlyRate,
      status: court.status,
      image: court.image,
      createdBy: court.createdBy ? {
        id: court.createdBy._id,
        name: `${court.createdBy.firstName || ''} ${court.createdBy.lastName || ''}`.trim(),
        email: court.createdBy.email,
        userType: court.createdBy.userType
      } : {
        id: null,
        name: 'System',
        email: 'system@bindly.app',
        userType: 'Admin'
      },
      createdAt: court.createdAt,
      updatedAt: court.updatedAt
    }));

    res.json({
      success: true,
      courts: formattedCourts,
      count: formattedCourts.length
    });
  } catch (error) {
    console.error('❌ Error fetching courts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching courts',
      error: error.message
    });
  }
};

// Get court by ID
exports.getCourtById = async (req, res) => {
  try {
    const { courtId } = req.params;

    const court = await Court.findById(courtId)
      .populate('createdBy', 'firstName lastName email userType')
      .lean();

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    const formattedCourt = {
      id: court._id,
      name: court.name,
      type: court.type,
      location: court.location,
      description: court.description,
      capacity: court.capacity,
      equipment: court.equipment || [],
      amenities: court.amenities || [],
      availability: court.availability,
      hourlyRate: court.hourlyRate,
      status: court.status,
      image: court.image,
      createdBy: court.createdBy ? {
        id: court.createdBy._id,
        name: `${court.createdBy.firstName || ''} ${court.createdBy.lastName || ''}`.trim(),
        email: court.createdBy.email,
        userType: court.createdBy.userType
      } : {
        id: null,
        name: 'System',
        email: 'system@bindly.app',
        userType: 'Admin'
      },
      createdAt: court.createdAt,
      updatedAt: court.updatedAt
    };

    res.json({
      success: true,
      court: formattedCourt
    });
  } catch (error) {
    console.error('❌ Error fetching court:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching court',
      error: error.message
    });
  }
};

// Get courts by type
exports.getCourtsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { q } = req.query;

    console.log('🏀 Fetching courts by type:', type);
    console.log('🏀 Search query:', q);

    let courts = await Court.find({ 
      type: type
    })
      .populate('createdBy', 'firstName lastName email userType')
      .sort({ name: 1 })
      .lean();

    console.log('🏀 Found courts of type', type + ':', courts.length);

    // Apply search filter if provided
    if (q && q.trim()) {
      const searchQuery = new RegExp(q.trim(), 'i');
      courts = courts.filter(court =>
        searchQuery.test(court.name) ||
        searchQuery.test(court.location) ||
        searchQuery.test(court.description || '')
      );
      console.log('🏀 Found courts after search:', courts.length);
    }

    const formattedCourts = courts.map(court => ({
      id: court._id,
      name: court.name,
      type: court.type,
      location: court.location,
      description: court.description,
      capacity: court.capacity,
      equipment: court.equipment || [],
      amenities: court.amenities || [],
      availability: court.availability,
      hourlyRate: court.hourlyRate,
      status: court.status,
      image: court.image,
      createdBy: court.createdBy ? {
        id: court.createdBy._id,
        name: `${court.createdBy.firstName || ''} ${court.createdBy.lastName || ''}`.trim(),
        email: court.createdBy.email,
        userType: court.createdBy.userType
      } : {
        id: null,
        name: 'System',
        email: 'system@bindly.app',
        userType: 'Admin'
      },
      createdAt: court.createdAt,
      updatedAt: court.updatedAt
    }));

    res.json({
      success: true,
      courts: formattedCourts,
      count: formattedCourts.length,
      type: type
    });
  } catch (error) {
    console.error('❌ Error fetching courts by type:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching courts',
      error: error.message
    });
  }
};
