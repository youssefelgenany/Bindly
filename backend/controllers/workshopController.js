// controllers/workshopController.js
const Workshop = require('../models/Workshop');

// Events Office: list all workshops
const getAllWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ createdAt: -1 });
    res.json(workshops);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Professor: list *my* workshops
const getMyWorkshops = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view their workshops' });
    }
    const workshops = await Workshop.find({ professorId: req.user._id }).sort({ createdAt: -1 });
    res.json(workshops);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Professor: create workshop
const createWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can create workshops' });
    }

    const workshop = new Workshop({
      ...req.body,
      professorId: req.user._id,   // from JWT
      status: 'pending'
    });
    await workshop.save();
    res.status(201).json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to create workshop', details: e.message });
  }
};

// Professor: update own workshop
const updateWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can update workshops' });
    }

    const workshop = await Workshop.findOneAndUpdate(
      { _id: req.params.id, professorId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!workshop) return res.status(404).json({ error: 'Workshop not found or not authorized' });
    res.json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to update workshop' });
  }
};

// Professor: delete own workshop
const deleteWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can delete workshops' });
    }

    const workshop = await Workshop.findOneAndDelete({
      _id: req.params.id,
      professorId: req.user._id
    });

    if (!workshop) return res.status(404).json({ error: 'Workshop not found or not authorized' });
    res.json({ message: 'Workshop deleted successfully', deletedWorkshop: workshop });
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete workshop' });
  }
};

// Events Office/Admin: approve
const approveWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '', editRequests: '' },
      { new: true }
    );
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to approve workshop' });
  }
};

// Events Office/Admin: reject
const rejectWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.rejectionReason || '', editRequests: '' },
      { new: true }
    );
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to reject workshop' });
  }
};

// Events Office/Admin: request edits
const requestEdits = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { status: 'needs_edits', editRequests: req.body.editRequests || '', rejectionReason: '' },
      { new: true }
    );
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to request edits' });
  }
};
const StudentRegistration = require('../models/studentRegistrationModel');


// Professor: view participants for their own workshop
const getWorkshopParticipants = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view participants' });
    }

    const workshopId = req.params.id;
    
    // First try to find in Workshop model
    let workshop = await Workshop.findOne({
      _id: workshopId,
      professorId: req.user._id
    });
    
    // If not found in Workshop model, try Event model (workshops can be in either)
    if (!workshop) {
      const Event = require('../models/eventModel');
      const eventWorkshop = await Event.findOne({
        _id: workshopId,
        type: 'workshop',
        createdBy: req.user._id
      });
      
      if (eventWorkshop) {
        // Get participants from StudentRegistration (which references Event model)
        const participants = await StudentRegistration.find({ 
          event: workshopId,
          eventType: 'workshop'
        }).sort({ registeredAt: -1 });

        const remainingSpots = Math.max(0, (eventWorkshop.capacity || 0) - participants.length);

        return res.json({
          success: true,
          workshopSummary: {
            id: eventWorkshop._id,
            title: eventWorkshop.title,
            capacity: eventWorkshop.capacity,
            currentRegistrations: participants.length,
            remainingSpots: remainingSpots
          },
          participants: participants.map(p => ({
            id: p._id,
            name: p.studentName,
            studentId: p.studentId,
            email: p.studentEmail,
            status: p.status,
            registrationDate: p.registeredAt || p.createdAt
          })),
          count: participants.length
        });
      }
      
      // If still not found, return error
      console.log('Workshop not found or professor mismatch. Workshop ID:', workshopId, 'Professor ID:', req.user._id);
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }

    // Workshop found in Workshop model
    // Note: StudentRegistration references Event model, not Workshop model
    // So if workshop is in Workshop model, there may not be registrations
    // Try to find by workshop name or return empty list
    const participants = await StudentRegistration.find({ 
      eventType: 'workshop'
    }).sort({ registeredAt: -1 });

    // Filter by workshop name if possible (this is a workaround since Workshop and Event are separate)
    // For now, return empty participants list with a note
    const remainingSpots = Math.max(0, (workshop.capacity || 0) - 0);

    res.json({
      success: true,
      workshopSummary: {
        id: workshop._id,
        title: workshop.workshopName || workshop.title,
        capacity: workshop.capacity,
        currentRegistrations: 0,
        remainingSpots: remainingSpots,
        note: 'This workshop uses the Workshop model. Registrations may be in the Event model system.'
      },
      participants: [],
      count: 0
    });
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({ error: 'Failed to fetch participants', details: err.message });
  }
};


module.exports = {
  getAllWorkshops,
  getMyWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  approveWorkshop,
  rejectWorkshop,
  requestEdits,
  getWorkshopParticipants
};
