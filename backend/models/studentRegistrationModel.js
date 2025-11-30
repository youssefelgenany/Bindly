const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for backwards compatibility
    index: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
  },
  studentId: {
    type: String,
    required: true,
    trim: true,
  },
  studentEmail: {
    type: String,
    required: false, // Made optional, will be kept for backwards compatibility
    trim: true,
    lowercase: true,
  },
  eventType: {
    type: String,
    enum: ['workshop', 'trip'],
    required: true,
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
  // Additional fields for trips
  emergencyContact: {
    name: String,
    phone: String,
  },
  dietaryRequirements: String,
  medicalConditions: String
}, { timestamps: true });

// Add index to prevent duplicate registrations for the same event by userId
studentRegistrationSchema.index({ event: 1, student: 1 }, { unique: true, sparse: true });
// Keep old index for backwards compatibility (will be removed in future)
studentRegistrationSchema.index({ event: 1, studentEmail: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);
