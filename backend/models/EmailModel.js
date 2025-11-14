const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  verificationToken: {
    type: String,
    required: false
  },
  verificationUrl: {
    type: String,
    required: false
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  userInfo: {
    name: String,
    userType: String,
    email: String
  }
});

module.exports = mongoose.model('Email', emailSchema);
