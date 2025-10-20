const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['bazaar', 'trip', 'sports', 'seminar', 'workshop', 'conference', 'booth', 'standaloneBooth', 'other'],
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
  },
  // Standalone booth specific fields
  boothNumber: {
    type: Number,
    required: function() { return this.type === 'standaloneBooth'; },
    min: 1,
    max: 12
  },
  boothSize: {
    type: String,
    enum: ['2x2', '4x4'],
    required: function() { return this.type === 'standaloneBooth'; }
  },
  amenities: [{
    type: String,
    enum: ['power-outlet', 'wifi', 'storage', 'display-screen', 'refrigeration', 'lighting']
  }],
  boothStatus: {
    type: String,
    enum: ['free', 'taken'],
    default: 'free',
    required: function() { return this.type === 'standaloneBooth'; }
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type === 'standaloneBooth' && this.boothStatus === 'taken'; }
  },
  occupancyEndDate: {
    type: Date,
    required: function() { return this.type === 'standaloneBooth' && this.boothStatus === 'taken'; }
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
