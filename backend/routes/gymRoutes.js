const express = require("express");
const router = express.Router();
const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");

// Event Office creates gym sessions (Req 84)
router.post("/", protect, permit("event_office", "admin"), createGymSession);

// Everyone (student/staff/ta/professor/event_office) views schedule (Req 80)
router.get("/month", protect, permit("Student", "Staff", "TA", "Professor", "event_office", "admin"), viewGymScheduleMonth);

module.exports = router;
