const mongoose = require('mongoose');

const vendorVoteSchema = new mongoose.Schema({
  vendorRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorRequest',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'staff', 'TA', 'professor'],
    required: true,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Prevent duplicate votes - one vote per user per vendor request
vendorVoteSchema.index({ vendorRequest: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('VendorVote', vendorVoteSchema);

