const express = require('express');
const router = express.Router();
const {
  getProfessorDashboardStats,
  getProfessorNotifications,
  getAdminDashboardStats,
  getRecentActivity
} = require('../controllers/dashboardController');
const { protect, permit } = require('../middleware/authMiddleware');

// Professor dashboard routes
router.get('/professor/stats', protect, permit('Professor'), getProfessorDashboardStats);
router.get('/professor/notifications', protect, permit('Professor'), getProfessorNotifications);

// Admin dashboard routes
router.get('/admin/stats', protect, permit('Admin'), getAdminDashboardStats);
router.get('/admin/activity', protect, permit('Admin'), getRecentActivity);

module.exports = router;

