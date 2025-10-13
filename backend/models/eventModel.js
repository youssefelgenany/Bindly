const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['bazaar', 'trip', 'sports', 'seminar', 'workshop', 'other'],
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
  location: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    default: 100,
  },
  registeredCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'approved',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  agenda: String, 
  website: String,
  budget: Number, 
  fundingSource: {
    type: String,
    enum: ['external', 'GUC'],
    default: 'GUC'
  },
  extraResources: String 
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
