const mongoose = require('mongoose');

const boothPollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    vendorRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorRequest',
      required: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    optionIndex: {
      type: Number,
      required: true,
      min: 0
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  }
});

// Index for efficient vote lookups (not unique to allow vote changes)
boothPollSchema.index({ 'votes.user': 1, _id: 1 });

module.exports = mongoose.model('BoothPoll', boothPollSchema);