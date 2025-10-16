const User = require('../models/userModel.js');
const Bazaar = require('../models/bazaarModel.js'); // Assuming bazaarModel exists
const Booth = require('../models/boothModel.js');
const VendorRequest = require('../models/vendorRequest.js');

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

    let event;
    if (eventType === 'bazaar') {
      event = await Bazaar.findById(eventId);
      if (!event) return res.status(404).json({ message: 'Invalid bazaar' });
    } else if (eventType === 'booth') {
      event = await Booth.findById(eventId);
      if (!event) return res.status(404).json({ message: 'Invalid booth' });
      if (!durationWeeks || !boothLocation || durationWeeks < 1 || durationWeeks > 4) {
        return res.status(400).json({ message: 'Valid duration (1-4 weeks) and location required for booth' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid event type' });
    }

    const existingRequest = await VendorRequest.findOne({ vendor: vendorId, $or: [{ bazaar: eventId }, { booth: eventId }] });
    if (existingRequest) return res.status(400).json({ message: 'Already applied' });

    const request = new VendorRequest({
      vendor: vendorId,
      [eventType === 'bazaar' ? 'bazaar' : 'booth']: eventId,
      attendees,
      boothSize,
      durationWeeks: eventType === 'booth' ? durationWeeks : undefined,
      boothLocation: eventType === 'booth' ? boothLocation : undefined,
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