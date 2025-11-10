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
  getMyWorkshops,
  getEventRegistrations,
  createConference,
  addToFavorites,
  removeFromFavorites,
  getFavoriteEvents,
  payForEvent,
  cancelRegistration,
  getWalletTransactions
} = require("../controllers/eventController");
const { verifyPayment } = require("../controllers/paymentVerificationController");

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

// 🎓 Get workshops created by the logged-in professor
router.get("/my/workshops", protect, permit("Professor"), getMyWorkshops);

// ⭐ Get user's favorite events (must be before /:id routes)
router.get(
  "/favorites",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  getFavoriteEvents
);

// 👥 Get registrations for a specific event (for event creators)
router.get("/:id/registrations", protect, getEventRegistrations);

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

// 💳 Pay for an event (Student, Staff, TA, or Professor)
router.post(
  "/:id/pay",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  payForEvent
);

// ✅ Confirm Stripe payment success (callback after redirect - public route)
router.get(
  "/payment-success",
  require("../controllers/stripeSuccessController")
);

// 🔍 Manual payment verification endpoint (for testing/debugging)
router.get(
  "/verify-payment",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  verifyPayment
);

// 🚫 Cancel event registration and get refund
router.post(
  "/:id/cancel",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  cancelRegistration
);

// 💰 Get wallet transactions
router.get(
  "/wallet/transactions",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  getWalletTransactions
);

// Route to create a conference (protected, e.g. admin/event office only)
router.post(
  "/conference",
  protect,
  permit("event_office", "admin"),
  createConference
);

// ⭐ Add event to favorites
router.post(
  "/:id/favorite",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  addToFavorites
);

// Remove event from favorites
router.delete(
  "/:id/favorite",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  removeFromFavorites
);

module.exports = router;
