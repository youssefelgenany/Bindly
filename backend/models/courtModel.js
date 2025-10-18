const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['basketball', 'tennis', 'volleyball', 'badminton', 'squash', 'football', 'other'],
    default: 'other'
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  equipment: [{
    type: String,
    trim: true,
  }],
  amenities: [{
    type: String,
    trim: true,
  }],
  availability: {
    monday: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' },
      isAvailable: { type: Boolean, default: true }
    },
    tuesday: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' },
      isAvailable: { type: Boolean, default: true }
    },
    wednesday: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' },
      isAvailable: { type: Boolean, default: true }
    },
    thursday: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' },
      isAvailable: { type: Boolean, default: true }
    },
    friday: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' },
      isAvailable: { type: Boolean, default: true }
    },
    saturday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '20:00' },
      isAvailable: { type: Boolean, default: true }
    },
    sunday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '20:00' },
      isAvailable: { type: Boolean, default: true }
    }
  },
  hourlyRate: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'closed'],
    default: 'active'
  },
  image: {
    type: String,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true
});

// Index for better query performance
courtSchema.index({ type: 1, status: 1 });
courtSchema.index({ location: 1 });

module.exports = mongoose.model('Court', courtSchema);
