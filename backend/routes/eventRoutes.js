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
  getWalletTransactions,
  getEventRatingsAndComments,
  cleanupInvalidEvents,
  getSalesReport
} = require("../controllers/eventController");
const { verifyPayment } = require("../controllers/paymentVerificationController");
const { sendWorkshopCompletionEmails } = require("../controllers/workshopCompletionController");
const { getWorkshopParticipants } = require("../controllers/workshopController");

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

// 📈 Get sales report for events (Admin, Event Office)
router.get(
  "/sales/report",
  protect,
  permit("admin", "event_office", "Event Office", "Events Office"),
  getSalesReport
);

// 📧 Send completion emails for workshops that ended today (Admin, Event Office)
router.post(
  "/workshops/send-completion-emails",
  protect,
  permit("admin", "event_office"),
  sendWorkshopCompletionEmails
);

// 👤 Get logged-in user's event registrations
router.get("/my/registrations", protect, getMyRegistrations);

// 🎓 Get events created by the logged-in professor
router.get("/my/events", protect, permit("Professor"), getMyEvents);

// 🎓 Get workshops created by the logged-in professor
router.get("/my/workshops", protect, permit("Professor"), getMyWorkshops);

// 🎓 Get participants for a specific workshop (for professors who created it)
router.get("/workshops/:workshopId/participants", protect, permit("Professor"), getWorkshopParticipants);

// ⭐ Get user's favorite events (must be before /:id routes)
router.get(
  "/favorites",
  protect,
  permit("Student", "Staff", "TA", "Professor"),
  getFavoriteEvents
);

// 👥 Get registrations for a specific event (for event creators)
router.get("/:id/registrations", protect, getEventRegistrations);

// 📊 Get ratings and comments for an event (all authenticated users can view)
router.get("/:id/ratings", protect, getEventRatingsAndComments);
router.get("/:id/comments", protect, getEventRatingsAndComments);
router.get("/:id/feedback", protect, getEventRatingsAndComments);

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

// 🗑️ Cleanup invalid/empty events (Admin only)
router.delete(
  "/cleanup",
  protect,
  permit("admin", "event_office"),
  cleanupInvalidEvents
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
