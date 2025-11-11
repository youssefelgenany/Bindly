const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
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
    required: true,
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

// Add index to prevent duplicate registrations for the same event
studentRegistrationSchema.index({ event: 1, studentEmail: 1 }, { unique: true });

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);
