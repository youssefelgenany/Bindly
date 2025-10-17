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
  // For booth requests, we'll handle separately in controller
  booth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event", // points to Event when type='booth'
  },
  // Denormalized event info for easy rendering without populate
  eventName: { type: String },
  eventType: { type: String, enum: ['bazaar', 'booth'] },
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
  // Optional message or notes from the vendor
  message: {
    type: String,
  },
  // Status for the Events Office/Admin to update
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  // Automatically track when the request was submitted
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("VendorRequest", vendorRequestSchema);