const mongoose = require('mongoose');

const gymSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['cardio', 'strength', 'yoga', 'pilates', 'other']
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  instructor: {
    type: String,
    trim: true,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GymSession', gymSessionSchema);
