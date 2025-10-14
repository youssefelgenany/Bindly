const express = require("express");
const router = express.Router();
const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers } = require('../controllers/adminController');
const { createAdminOrEventOffice, deleteAdminOrEventOffice, } = require('../controllers/adminAccountsController');
const {assignRoleAndSendVerification} = require('../controllers/adminController');
const { getAllUsers, updateUserRole, updateUserStatus, changePassword, updateProfile, getAllVendors, updateVendorVerification, updateVendorStatus } = require('../controllers/adminController');


// Admin routes
router.get('/users', protect, permit('Admin'), getAllUsers);
router.put('/users/:userId/role', protect, permit('Admin'), updateUserRole);
router.patch('/users/:userId/status', protect, permit('Admin'), updateUserStatus);

// Everyone (student/staff/ta/professor/event_office) views schedule (Req 80)
router.get("/month", protect, permit("student","staff","ta","professor","event_office"), viewGymScheduleMonth);
router.get('/users', protect, permit('admin'), getAllUsers);
router.post('/create', protect, permit('admin'), createAdminOrEventOffice);
router.delete('/delete/:id', protect, permit('admin'), deleteAdminOrEventOffice);
router.post('/assign-role', protect, permit('admin'), assignRoleAndSendVerification);
module.exports = router;
