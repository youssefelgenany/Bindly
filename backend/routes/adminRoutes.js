const express = require("express");
const router = express.Router();

const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers, updateUserRole, updateUserStatus, changePassword, updateProfile, getAllVendors, updateVendorVerification, updateVendorStatus, updateUserVerification } = require('../controllers/adminController');
const { createAdminOrEventOffice, deleteAdminOrEventOffice } = require('../controllers/adminAccountsController');

// Admin routes
router.get('/users', protect, permit('admin'), getAllUsers);
router.put('/users/:userId/role', protect, permit('admin'), updateUserRole);
router.patch('/users/:userId/status', protect, permit('admin'), updateUserStatus);
router.put('/users/:userId/verification', protect, permit('admin'), (req, res, next) => {
  console.log('🚀 User verification route hit:', req.params.userId, req.body);
  next();
}, updateUserVerification);

// Admin account management routes
router.post('/accounts', protect, permit('admin'), createAdminOrEventOffice);
router.delete('/accounts/:id', protect, permit('admin'), deleteAdminOrEventOffice);

// Admin password change
router.put('/change-password', protect, permit('admin'), changePassword);

// Admin profile update
router.put('/profile', protect, permit('admin'), updateProfile);

// Vendor management routes
router.get('/vendors', protect, permit('admin'), getAllVendors);
router.put('/vendors/:vendorId/verification', protect, permit('admin'), (req, res, next) => {
  console.log('🚀 Vendor verification route hit:', req.params.vendorId, req.body);
  next();
}, updateVendorVerification);
router.put('/vendors/:vendorId/status', protect, permit('admin'), (req, res, next) => {
  console.log('🚀 Vendor status route hit:', req.params.vendorId, req.body);
  next();
}, updateVendorStatus);

module.exports = router;
