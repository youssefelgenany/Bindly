const Court = require('../models/courtModel');
const CourtBooking = require('../models/courtBookingModel');

// Get all courts with availability
exports.getAllCourts = async (req, res) => {
  try {
    const { type, date } = req.query;
    
    let query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const courts = await Court.find(query).sort({ name: 1 });
    
    // If date is provided, get availability for that date
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      for (let court of courts) {
        const bookings = await CourtBooking.find({
          court: court._id,
          bookingDate: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['confirmed', 'pending'] }
        }).sort({ startTime: 1 });
        
        court.availability = bookings;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Courts fetched successfully',
      courts
    });
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get court availability for a specific date
exports.getCourtAvailability = async (req, res) => {
  try {
    const { courtId, date } = req.params;
    
    if (!courtId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Court ID and date are required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    const bookings = await CourtBooking.find({
      court: courtId,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'pending'] }
    }).sort({ startTime: 1 });

    // Generate available time slots (9 AM to 10 PM, 1-hour slots)
    const availableSlots = [];
    const bookedTimes = bookings.map(b => ({ start: b.startTime, end: b.endTime }));
    
    for (let hour = 9; hour < 22; hour++) {
      const slotStart = `${hour.toString().padStart(2, '0')}:00`;
      const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const isBooked = bookedTimes.some(booking => {
        return (slotStart >= booking.start && slotStart < booking.end) ||
               (slotEnd > booking.start && slotEnd <= booking.end) ||
               (slotStart <= booking.start && slotEnd >= booking.end);
      });
      
      if (!isBooked) {
        availableSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: true
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Court availability fetched successfully',
      court: {
        id: court._id,
        name: court.name,
        type: court.type,
        location: court.location
      },
      date: targetDate.toISOString().split('T')[0],
      availableSlots,
      bookings
    });
  } catch (error) {
    console.error('Error fetching court availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Book a court
exports.bookCourt = async (req, res) => {
  try {
    const { courtId, bookingDate, startTime, endTime, purpose, participants, notes } = req.body;
    const userId = req.user._id;

    if (!courtId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Court ID, booking date, start time, and end time are required'
      });
    }

    // Check if court exists
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Check for time conflicts
    const targetDate = new Date(bookingDate);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const conflictingBooking = await CourtBooking.findOne({
      court: courtId,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Create booking
    const booking = new CourtBooking({
      court: courtId,
      user: userId,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      purpose,
      participants: participants || [],
      notes,
      status: 'pending'
    });

    await booking.save();
    await booking.populate('court', 'name type location');
    await booking.populate('user', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Court booking request submitted successfully',
      booking
    });
  } catch (error) {
    console.error('Error booking court:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user's court bookings
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, date } = req.query;

    let query = { user: userId };
    if (status) {
      query.status = status;
    }
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await CourtBooking.find(query)
      .populate('court', 'name type location')
      .sort({ bookingDate: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: 'Bookings fetched successfully',
      bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await CourtBooking.findOne({
      _id: bookingId,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Admin: Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { courtId, status, date } = req.query;

    let query = {};
    if (courtId) query.court = courtId;
    if (status) query.status = status;
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await CourtBooking.find(query)
      .populate('court', 'name type location')
      .populate('user', 'firstName lastName email userType')
      .sort({ bookingDate: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: 'All bookings fetched successfully',
      bookings
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Admin: Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await CourtBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    await booking.save();
    await booking.populate('court', 'name type location');
    await booking.populate('user', 'firstName lastName email userType');

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
