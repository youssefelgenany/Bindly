const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'staff', 'TA', 'professor', 'vendor'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'approved',
  },
  paid: {
    type: Boolean,
    default: false
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  qrCode: {
    type: String, // Base64 encoded QR code image
    default: null
  },
  qrCodeData: {
    type: String, // The data encoded in the QR code (e.g., registration ID, user info)
    default: null
  },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
