const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['bazaar', 'trip', 'sports', 'seminar', 'workshop', 'conference', 'booth', 'other'],
    default: 'other',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  registrationDeadline: {
    type: Date,
    required: false, // Optional for non-bazaar events
  },
  location: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    default: 100,
  },
  price: {
    type: Number,
    required: false, // Optional for non-trip events
  },
  registeredCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'approved',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Conference fields
  agenda: String, 
  website: String,
  budget: Number, 
  fundingSource: {
    type: String,
    enum: ['external', 'GUC'],
    default: 'GUC'
  },
  extraResources: String,
  // Workshop-specific fields
  faculty: {
    type: String,
    required: false, // Faculty responsible for workshop
  },
  professors: {
    type: String,
    required: false, // Professor(s) conducting workshop
  },
  bannerFile: {
    type: String,
    required: false, // Path to uploaded banner/flyer
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
