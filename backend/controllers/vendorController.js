const User = require('../models/userModel.js');
const Bazaar = require('../models/bazaarModel.js'); // Assuming bazaarModel exists
const Booth = require('../models/boothModel.js');
const VendorRequest = require('../models/vendorRequest.js');
const events = require('../models/eventModel.js');
// View upcoming bazaars/booths
module.exports.viewUpcomingEvents = async (req, res) => {
  try {
    const { type } = req.query;
    if (!['bazaar', 'booth'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    const now = new Date();
    let events;
    if (type === 'bazaar') {
      events = await Bazaar.find({
        startDate: { $gt: now },
        registrationDeadline: { $gt: now },
      }).select('name startDate endDate location description _id');
    } else { // booth
      events = await Booth.find({
        startDate: { $gt: now },
        registrationDeadline: { $gt: now },
      }).select('name startDate endDate location description _id durationWeeks boothLocation');
    }
    res.json(events);
  } catch (error) {
    console.error('Server error in viewUpcomingEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Apply to bazaar or booth
module.exports.applyToEvent = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const vendorId = req.user._id || req.user.id;
    const { eventId, attendees, boothSize, durationWeeks, boothLocation, message, eventType } = req.body;

    // Validate vendor role
    const vendor = await User.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.userType !== 'Vendor') return res.status(403).json({ message: 'Unauthorized' });

    // Attendees validated by frontend selection (max 5), no error message needed
    if (attendees.length > 5) return res.status(400).json({ message: 'Max 5 attendees exceeded' });

    // Fetch event from 'events' collection based on type
    const event = await events.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Invalid event' });
    if (event.type !== 'bazaar' && event.type !== 'booth') {
      return res.status(400).json({ message: 'Event type must be bazaar or booth' });
    }

    // Validate specific requirements based on event type
    if (event.type === 'bazaar' && !boothSize) {
      return res.status(400).json({ message: 'Booth size required for bazaar' });
    }
    if (event.type === 'booth') {
      if (!durationWeeks || !boothLocation || durationWeeks < 1 || durationWeeks > 4) {
        return res.status(400).json({ message: 'Valid duration (1-4 weeks) and location required for booth' });
      }
    }

    const existingRequest = await VendorRequest.findOne({ vendor: vendorId, $or: [{ bazaar: eventId }, { booth: eventId }] });
    if (existingRequest) {
      // Update existing application instead of rejecting duplicates
      existingRequest.attendees = attendees;
      existingRequest.boothSize = boothSize;
      if (eventType === 'booth') {
        existingRequest.durationWeeks = durationWeeks;
        existingRequest.boothLocation = boothLocation;
      }
      if (typeof message === 'string') existingRequest.message = message;
      await existingRequest.save();
      return res.status(200).json({ message: 'Application updated' });
    }

    const request = new VendorRequest({
      vendor: vendorId,
      [event.type === 'bazaar' ? 'bazaar' : 'booth']: eventId,
      attendees,
      boothSize: event.type === 'bazaar' ? boothSize : undefined,
      durationWeeks: event.type === 'booth' ? durationWeeks : undefined,
      boothLocation: event.type === 'booth' ? boothLocation : undefined,
      message,
    });
    await request.save();
    res.status(201).json({ message: 'Application submitted' });
  } catch (error) {
    console.error('Server error in applyToEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports.getParticipants = async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!['bazaar', 'booth'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const filter = type === 'bazaar' ? { bazaar: id } : { booth: id };
    filter.status = 'accepted';

    const requests = await VendorRequest.find(filter)
      .populate('vendor', 'companyName firstName lastName email')
      .select('vendor attendees boothSize createdAt');

    const participants = requests.map(r => ({
      id: r._id,
      companyName: r.vendor?.companyName || `${r.vendor?.firstName || ''} ${r.vendor?.lastName || ''}`.trim(),
      email: r.vendor?.email || '',
      attendees: r.attendees || [],
      boothSize: r.boothSize || null,
      joinedAt: r.createdAt
    }));

    return res.json({ success: true, participants });
  } catch (error) {
    console.error('Server error in getParticipants:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};