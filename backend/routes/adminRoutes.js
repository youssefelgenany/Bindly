const express = require("express");
const router = express.Router();
const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");
const { getAllUsers } = require('../controllers/adminController');

// Event Office creates gym sessions (Req 84)
router.post("/", protect, permit("event_office"), createGymSession);

// Everyone (student/staff/ta/professor/event_office) views schedule (Req 80)
router.get("/month", protect, permit("student","staff","ta","professor","event_office"), viewGymScheduleMonth);
router.get('/users', protect, permit('admin'), getAllUsers);
module.exports = router;