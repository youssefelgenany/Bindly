const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getMyRegistrations
} = require("../controllers/eventController");

const { protect, permit } = require("../middleware/authMiddleware");

// ================== EVENT ROUTES ==================

// 🎯 Create a new event (Event Office or Admin only)
router.post(
  "/",
  protect,
  permit("event_office", "admin"),
  createEvent
);

// 📅 Get all events (everyone logged in)
router.get("/", protect, getAllEvents);

// 🔍 Get a specific event by its ID
router.get("/:id", protect, getEventById);

// ✏️ Update event details (Event Office or Admin)
router.put(
  "/:id",
  protect,
  permit("event_office", "admin"),
  updateEvent
);

// ❌ Delete an event (Event Office or Admin)
router.delete(
  "/:id",
  protect,
  permit("event_office", "admin"),
  deleteEvent
);

// 📝 Register for an event (Student, Staff, TA, or Professor)
router.post(
  "/:id/register",
  protect,
  permit("student", "staff", "ta", "professor"),
  registerForEvent
);

// 👤 Get logged-in user’s event registrations
router.get("/my/registrations", protect, getMyRegistrations);

module.exports = router;
