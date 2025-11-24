const express = require("express");
const router = express.Router();

const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers, updateUserRole, updateUserStatus, changePassword, updateProfile, getAllVendors, updateVendorVerification, updateVendorStatus, updateUserVerification, sendVerificationEmail, getAttendeesReport, getSalesReport, assignRoleAndSendVerification, blockUser, unblockUser } = require('../controllers/adminController');
const { createAdminOrEventOffice, deleteAdminOrEventOffice } = require('../controllers/adminAccountsController');

// Admin routes
router.get('/users', protect, permit('admin'), getAllUsers);
router.put('/users/:userId/role', protect, permit('admin'), updateUserRole);
router.patch('/users/:userId/status', protect, permit('admin'), updateUserStatus);
router.post('/users/:userId/block', protect, permit('admin'), blockUser);
router.post('/users/:userId/unblock', protect, permit('admin'), unblockUser);
router.put('/users/:userId/verification', protect, permit('admin'), (req, res, next) => {
  console.log('🚀 User verification route hit:', req.params.userId, req.body);
  next();
}, updateUserVerification);
router.post('/users/:userId/send-verification-email', protect, permit('admin'), sendVerificationEmail);
router.post('/users/assign-role-and-verify', protect, permit('admin'), assignRoleAndSendVerification);

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

// Gym routes
router.post("/gym-sessions", protect, permit("event_office"), createGymSession);
router.get("/gym-schedule/month", protect, permit("student", "staff", "ta", "professor", "event_office"), viewGymScheduleMonth);

// Events Office/Admin report routes
router.get("/reports/attendees", protect, permit("event_office", "admin"), getAttendeesReport);
router.get("/reports/sales", protect, permit("event_office", "admin"), getSalesReport);

module.exports = router;
