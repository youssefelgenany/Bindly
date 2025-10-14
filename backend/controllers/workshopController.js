const Workshop = require('../models/Workshop');
const Professor = require('../models/Professor');

// Get all workshops (Events Office)
const getAllWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Get professor's workshops
const getMyWorkshops = async (req, res) => {
  try {
    const professorId = req.headers['professor-id'];
    
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID header required' });
    }
    
    const workshops = await Workshop.find({ professorId }).sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Create workshop
const createWorkshop = async (req, res) => {
  try {
    const professorId = req.headers['professor-id'];
    
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID header required' });
    }
    
    // Verify professor exists
    const professor = await Professor.findById(professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    const workshopData = {
      ...req.body,
      professorId
    };
    
    const workshop = new Workshop(workshopData);
    await workshop.save();
    res.status(201).json(workshop);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create workshop' });
  }
};

// Update workshop
const updateWorkshop = async (req, res) => {
  try {
    const professorId = req.headers['professor-id'];
    
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID header required' });
    }
    
    const workshop = await Workshop.findOneAndUpdate(
      { _id: req.params.id, professorId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }
    
    res.json(workshop);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update workshop' });
  }
};

// Delete workshop
const deleteWorkshop = async (req, res) => {
  try {
    const professorId = req.headers['professor-id'];
    
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID header required' });
    }
    
    const workshop = await Workshop.findOneAndDelete({
      _id: req.params.id,
      professorId
    });
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }
    
    res.json({ message: 'Workshop deleted successfully', deletedWorkshop: workshop });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete workshop' });
  }
};

// Approve workshop (Events Office)
const approveWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        rejectionReason: '',
        editRequests: '',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    res.json(workshop);
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve workshop' });
  }
};

// Reject workshop (Events Office)
const rejectWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectionReason: req.body.rejectionReason,
        editRequests: '',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    res.json(workshop);
  } catch (error) {
    res.status(400).json({ error: 'Failed to reject workshop' });
  }
};

// Request edits (Events Office)
const requestEdits = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'needs_edits',
        editRequests: req.body.editRequests,
        rejectionReason: '',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    res.json(workshop);
  } catch (error) {
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