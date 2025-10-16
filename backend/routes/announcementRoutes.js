const express = require("express");
const router = express.Router();
const {
  getMyAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require("../controllers/announcementController");

const { protect, permit } = require("../middleware/authMiddleware");

// ================== ANNOUNCEMENT ROUTES ==================

// 📢 Get announcements for professor's events
router.get("/my/announcements", protect, permit("Professor"), getMyAnnouncements);

// 📢 Create a new announcement
router.post("/", protect, permit("Professor", "Admin", "Event Office"), createAnnouncement);

// 📢 Update an announcement
router.put("/:id", protect, permit("Professor", "Admin", "Event Office"), updateAnnouncement);

// 📢 Delete an announcement
router.delete("/:id", protect, permit("Professor", "Admin", "Event Office"), deleteAnnouncement);

module.exports = router;

