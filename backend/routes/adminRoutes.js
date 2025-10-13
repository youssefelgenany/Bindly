const express = require("express");
const router = express.Router();
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers, updateUserRole, updateUserStatus, changePassword, updateProfile, getAllVendors, updateVendorVerification, updateVendorStatus } = require('../controllers/adminController');
const { createAdminOrEventOffice, deleteAdminOrEventOffice } = require('../controllers/adminAccountsController');

// Admin routes
router.get('/users', protect, permit('Admin'), getAllUsers);
router.put('/users/:userId/role', protect, permit('Admin'), updateUserRole);
router.patch('/users/:userId/status', protect, permit('Admin'), updateUserStatus);

// Admin account management routes
router.post('/accounts', protect, permit('Admin'), createAdminOrEventOffice);
router.delete('/accounts/:id', protect, permit('Admin'), deleteAdminOrEventOffice);

// Admin password change
router.put('/change-password', protect, permit('Admin'), changePassword);

// Admin profile update
router.put('/profile', protect, permit('Admin'), updateProfile);

// Vendor management routes
router.get('/vendors', protect, permit('Admin'), getAllVendors);
router.put('/vendors/:vendorId/verification', protect, permit('Admin'), updateVendorVerification);
router.put('/vendors/:vendorId/status', protect, permit('Admin'), updateVendorStatus);




module.exports = router;