const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['bazaar', 'trip', 'workshop', 'conference', 'booth'],
    required: true,
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
  completionEmailSent: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'approved',
  },
  archived: {
    type: Boolean,
    default: false,
  },
  isRestricted: {
    type: Boolean,
    default: false,
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  allowedUserTypes: [{
    type: String,
    enum: ['Student', 'Professor', 'Staff', 'TA', 'Admin', 'Event Office'],
  }],
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
    type: [String],
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
  },
  // Ratings system
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Comments system
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Virtual for average rating
eventSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) {
    return 0;
  }
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  return (sum / this.ratings.length).toFixed(2);
});

// Virtual for rating count
eventSchema.virtual('ratingCount').get(function() {
  return this.ratings ? this.ratings.length : 0;
});

// Virtual for comment count
eventSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Ensure virtuals are included in JSON
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

// Index to prevent duplicate ratings from same user
eventSchema.index({ 'ratings.user': 1 });

module.exports = mongoose.model('Event', eventSchema);
