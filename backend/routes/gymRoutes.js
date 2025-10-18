const express = require("express");
const router = express.Router();
const { createGymSession, viewGymScheduleMonth } = require("../controllers/gymController");
const { protect, permit } = require("../middleware/authMiddleware");

// keep the old root if you want (alias)
router.post("/", protect, permit("event_office", "Event Office","Events Office", "admin"), createGymSession);

// new: explicit sessions endpoint (matches frontend/gymApi usage)
router.post("/sessions", protect, permit("event_office", "Event Office","Events Office", "admin"), createGymSession);

// list sessions — alias so frontend can GET /sessions
router.get("/sessions", protect, viewGymScheduleMonth);

// existing monthly endpoint
router.get("/month", protect, permit("Student", "Staff", "TA", "Professor", "event_office","Event Office","Events Office", "admin"), viewGymScheduleMonth);

module.exports = router;
