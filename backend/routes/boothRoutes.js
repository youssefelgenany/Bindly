const express = require('express');
const router = express.Router();
const { 
    getAllBooths, 
    getBoothById, 
    createBooth, 
    updateBooth, 
    deleteBooth 
} = require('../controllers/boothController');
const { protect, permit } = require('../middleware/authMiddleware');

// Public routes (accessible to all authenticated users)
router.get('/', protect, getAllBooths);
router.get('/:id', protect, getBoothById);

// Admin-only routes
router.post('/', protect, permit('admin'), createBooth);
router.put('/:id', protect, permit('admin'), updateBooth);
router.delete('/:id', protect, permit('admin'), deleteBooth);

module.exports = router;
