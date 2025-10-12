const express = require('express');
const router = express.Router();
const {
  createProfessor,
  getAllProfessors,
  getProfessorById
} = require('../controllers/professorController');

// Create professor
router.post('/', createProfessor);

// Get all professors
router.get('/', getAllProfessors);

// Get professor by ID
router.get('/:id', getProfessorById);

module.exports = router;