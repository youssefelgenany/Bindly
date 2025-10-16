const Professor = require('../models/Professor');

// Create professor
const createProfessor = async (req, res) => {
  try {
    const professor = new Professor(req.body);
    await professor.save();
    res.status(201).json(professor);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: 'Failed to create professor' });
  }
};

// Get all professors
const getAllProfessors = async (req, res) => {
  try {
    const professors = await Professor.find();
    res.json(professors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
};

// Get professor by ID
const getProfessorById = async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    res.json(professor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch professor' });
  }
};

module.exports = {
  createProfessor,
  getAllProfessors,
  getProfessorById
};