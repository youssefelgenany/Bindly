const express = require("express");
const router = express.Router();
const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers, updateUserRole, updateUserStatus, changePassword, updateProfile, getAllVendors, updateVendorVerification, updateVendorStatus, assignRoleAndSendVerification } = require('../controllers/adminController');
const { createAdminOrEventOffice, deleteAdminOrEventOffice } = require('../controllers/adminAccountsController');

// Admin routes
router.get('/users', protect, permit('admin'), getAllUsers);
router.put('/users/:userId/role', protect, permit('admin'), updateUserRole);
router.patch('/users/:userId/status', protect, permit('admin'), updateUserStatus);
router.post('/create', protect, permit('admin'), createAdminOrEventOffice);
router.delete('/delete/:id', protect, permit('admin'), deleteAdminOrEventOffice);
router.post('/assign-role', protect, permit('admin'), assignRoleAndSendVerification);

// Gym routes
router.post("/gym-sessions", protect, permit("event_office"), createGymSession);
router.get("/gym-schedule/month", protect, permit("student","staff","ta","professor","event_office"), viewGymScheduleMonth);

module.exports = router;