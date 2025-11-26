const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['workshop_approved', 'workshop_rejected', 'workshop_edits_requested', 'workshop_submission', 'event_announcement', 'system', 'event_reminder', 'workshop_reminder', 'trip_reminder', 'gym_session_reminder', 'conference_reminder'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedWorkshop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    default: null
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  relatedGymSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymSession',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// After saving a notification, attempt to emit it over Socket.IO to the recipient room
notificationSchema.post('save', function(doc) {
  try {
    const socketService = require('../services/socket');
    const io = socketService.getIO && socketService.getIO();
    if (io && doc && doc.recipient) {
      const room = doc.recipient.toString();
      io.to(room).emit('new_notification', doc);
    }
  } catch (e) {
    // Don't block on errors here
    console.error('Error emitting notification over socket:', e.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

