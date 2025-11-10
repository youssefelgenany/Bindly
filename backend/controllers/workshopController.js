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

const mongoose = require('mongoose');
// Professor: view participants for their own workshop
const getWorkshopParticipants = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view participants' });
    }

    const workshopId = req.params.id;
    const professorId = req.user._id;
    
    console.log('Professor ID from JWT:', professorId);
    console.log('Requested Workshop ID:', workshopId);
    // Verify the workshop belongs to this professor
    const workshop = await Workshop.findOne({
      _id: new mongoose.Types.ObjectId(workshopId),
      professorId: new mongoose.Types.ObjectId(req.user._id)
    });

    if (!workshop) {
      console.log('Workshop not found or professor mismatch');
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }

    // Get participants
    const participants = await StudentRegistration.find({ workshopId: workshop._id  });

    // Calculate remaining spots
    const remainingSpots = workshop.capacity - participants.length;

    // Format response
    res.json({
      workshopSummary: {
        title: workshop.title,
        capacity: workshop.capacity,
        currentRegistrations: participants.length,
        remainingSpots: remainingSpots < 0 ? 0 : remainingSpots
      },
      participants: participants.map(p => ({
        name: p.studentName,
        studentId: p.studentId,
        email: p.studentEmail,
        status: p.status,
        registrationDate: p.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching participants:', err.message);
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
