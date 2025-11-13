const mongoose = require('mongoose');

const gymRegistrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gymSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymSession',
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'staff', 'TA', 'professor'],
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'cancelled'],
    default: 'registered',
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Prevent duplicate registrations
gymRegistrationSchema.index({ user: 1, gymSession: 1 }, { unique: true });

module.exports = mongoose.model('GymRegistration', gymRegistrationSchema);

