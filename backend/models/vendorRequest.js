import mongoose from "mongoose";

const vendorRequestSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  bazaar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bazaar",
    required: true,
  },
  // Up to 5 individuals attending the booth
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
    required: true,
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

const VendorRequest = mongoose.model("VendorRequest", vendorRequestSchema);
export default VendorRequest;
