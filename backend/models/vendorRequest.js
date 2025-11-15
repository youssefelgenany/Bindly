const mongoose = require("mongoose");

const vendorRequestSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bazaar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event", // points to Event when type='bazaar'
  },
  // For booth requests, can reference either Event or Booth
  booth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event", // points to Event when type='booth' (for bazaar booths)
  },
  // For standalone booth requests
  standaloneBooth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booth", // points to Booth when type='booth' (for standalone booths)
  },
  // Denormalized event info for easy rendering without populate
  eventName: { type: String },
  eventType: { type: String, enum: ['bazaar', 'booth', 'standaloneBooth', 'platformBooth'] },
  attendees: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
  ],
  // Booth size selection: 2x2 or 4x4
  boothSize: {
    type: String,
    enum: ["2x2", "4x4"],
    required: false,
  },
  // Duration of booth setup (for booth applications)
  durationWeeks: {
    type: Number,
    min: 1,
    max: 4,
    required: false,
  },
  // Location of booth setup (for booth applications) - must be from predefined platform locations
  boothLocation: {
    type: String,
    required: false,
    enum: [
      'main-entrance', 'food-court', 'central-plaza', 'student-center',
      'library-area', 'gym-entrance', 'parking-lot', 'garden-section',
      'auditorium-hall', 'cafeteria-area'
    ]
  },
  // Platform booth specific fields
  boothId: {
    type: String,
    required: false,
  },
  startDate: {
    type: Date,
    required: false,
  },
  // Optional message or notes from the vendor
  message: {
    type: String,
  },
  // Path to uploaded individual IDs document (PDF or image)
  individualIdsPath: {
    type: String,
    default: null
  },
  // Payment information
  participationFee: {
    type: Number,
    default: null,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "overdue", "cancelled"],
    default: null
  },
  paymentDeadline: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  // Status for the Events Office/Admin to update, or vendor can cancel if not paid
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled"],
    default: "pending",
  },
  // Automatically track when the request was submitted
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("VendorRequest", vendorRequestSchema);