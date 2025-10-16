const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getAllEventsForAdmin,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getMyRegistrations,
  getMyEvents,
  getEventRegistrations,
  createConference
} = require("../controllers/eventController");

const { protect, permit } = require("../middleware/authMiddleware");

// ================== EVENT ROUTES ==================

// 🎯 Create a new event (Event Office, Admin, or Professor)
router.post(
  "/",
  protect,
  permit("Event Office", "Admin", "Professor"),
  createEvent
);

// 📅 Get all events (everyone logged in)
router.get("/", protect, getAllEvents);

// 📅 Get all events for admin management (including pending)
router.get("/admin/all", protect, permit("Admin"), getAllEventsForAdmin);

// 👤 Get logged-in user's event registrations
router.get("/my/registrations", protect, getMyRegistrations);

// 🎓 Get events created by the logged-in professor
router.get("/my/events", protect, permit("Professor"), getMyEvents);

// 👥 Get registrations for a specific event (for event creators)
router.get("/:id/registrations", protect, getEventRegistrations);

// 🔍 Get a specific event by its ID
router.get("/:id", protect, getEventById);

// ✏️ Update event details (Event Office, Admin, or Professor)
router.put(
  "/:id",
  protect,
  permit("Event Office", "Admin", "Professor"),
  updateEvent
);

// ❌ Delete an event (Event Office, Admin, or Professor)
router.delete(
  "/:id",
  protect,
  permit("Event Office", "Admin", "Professor"),
  deleteEvent
);

// 📝 Register for an event (Student, Staff, TA, or Professor)
router.post(
  "/:id/register",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  registerForEvent
);

// Route to create a conference (protected, e.g. admin/event office only)
router.post(
  "/conference",
  protect,
  createConference
);

module.exports = router;
