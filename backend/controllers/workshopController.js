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

module.exports = {
  getAllWorkshops,
  getMyWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  approveWorkshop,
  rejectWorkshop,
  requestEdits
};
