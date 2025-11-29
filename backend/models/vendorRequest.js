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
      'sports-area', 'parking', 'main-gate', 'main-entrance', 'platform', 'exam-halls'
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
  // Paths to uploaded individual IDs documents (one per attendee)
  individualIdsPaths: {
    type: [String],
    default: []
  },
  // Vendor QR code (for vendor check-in)
  qrCode: {
    type: String, // Base64 encoded QR code image
    required: false
  },
  qrCodeData: {
    type: String, // JSON string encoded in QR code
    required: false
  },
  // Attendee QR codes for platform booths (array of objects with attendee info and QR code)
  attendeeQRCodes: [{
    attendeeName: { type: String },
    attendeeEmail: { type: String },
    qrCode: { type: String }, // Base64 encoded QR code image
    qrCodeData: { type: String } // JSON string encoded in QR code
  }],
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