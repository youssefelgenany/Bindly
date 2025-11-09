const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getAllEventsForStudents,
  getAllEventsForAdmin,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getMyRegistrations,
  getMyEvents,
  getEventRegistrations,
  createConference,
  submitRating,
  getEventRatings,
  getUserRating,
  submitComment,
  getEventComments,
  deleteComment
} = require("../controllers/eventController");

const { protect, permit } = require("../middleware/authMiddleware");

// ================== EVENT ROUTES ==================

// 🎯 Create a new event (Event Office, Admin, or Professor)
router.post(
  "/",
  protect,
  permit("event_office", "admin", "Professor"),
  createEvent
);

// 📅 Get all events (everyone logged in)
router.get("/", protect, getAllEvents);

// 📅 Get all events for students and staff with vendor details
router.get("/student", protect, permit("Student", "Staff", "TA", "Professor", "Event Office", "Events Office", "event_office"), getAllEventsForStudents);

// 📅 Get all events for admin management (including pending)
router.get("/admin/all", protect, permit("admin"), getAllEventsForAdmin);

// 👤 Get logged-in user's event registrations
router.get("/my/registrations", protect, getMyRegistrations);

// 🎓 Get events created by the logged-in professor
router.get("/my/events", protect, permit("Professor"), getMyEvents);

// 👥 Get registrations for a specific event (for event creators)
router.get("/:id/registrations", protect, getEventRegistrations);

// 💬 Comment routes (must come before /:id route)
// Get all comments for an event
router.get(
  "/:id/comments",
  protect,
  getEventComments
);

// 🔍 Get a specific event by its ID
router.get("/:id", protect, getEventById);

// ✏️ Update event details (Event Office, Admin, or Professor)
router.put(
  "/:id",
  protect,
  permit("event_office", "admin", "Professor"),
  updateEvent
);

// ❌ Delete an event (Event Office, Admin, or Professor)
router.delete(
  "/:id",
  protect,
  permit("event_office", "admin", "Professor"),
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
  permit("event_office", "admin"),
  createConference
);

// ⭐ Rating routes
// Submit or update a rating for an event (Student, Staff, TA, Professor)
router.post(
  "/:id/rating",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  submitRating
);

// Get all ratings for an event
router.get(
  "/:id/ratings",
  protect,
  getEventRatings
);

// Get current user's rating for an event
router.get(
  "/:id/my-rating",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  getUserRating
);

// 💬 Comment routes
// Submit a comment on an event (Student, Staff, TA, Professor)
router.post(
  "/:id/comments",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  submitComment
);

// Delete a comment (owner or admin)
router.delete(
  "/:id/comments/:commentId",
  protect,
  deleteComment
);

module.exports = router;
