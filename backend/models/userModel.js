const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
   firstName: {
    type: String,
    required: function() {
      return ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true
  },
  lastName: {
    type: String,
    required: function() {
      return ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true
  },
   name: {
    type: String,
    required: function() {
      return ['admin', 'event_office'].includes(this.userType);
    }
  },
  userType: {
    type: String,
    required: true,
    enum: ['Student', 'Staff', 'TA', 'Professor', 'Vendor','event_office','admin']
  },
  // For GUC users (Student, Staff, TA, Professor)
  gucId: {
    type: String,
    required: function() {
      return ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true
  },
  // For vendors
  companyName: {
    type: String,
    required: function() {
      return this.userType === 'Vendor';
    },
    trim: true
  },
  vendorLogoPath: {
    type: String,
    required: function() {
      return this.userType === 'Vendor';
    },
    default: null
  },
  vendorTaxCardPath: {
    type: String,
    required: function() {
      return this.userType === 'Vendor';
    },
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
   status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Validate GUC email format (case-insensitive) without mutating stored email
userSchema.pre('save', function(next) {
  if (['Student', 'Staff', 'TA', 'Professor'].includes(this.userType)) {
    const gucEmailRegex = /^[a-z0-9._%+-]+@student\.guc\.edu\.eg$|^[a-z0-9._%+-]+@guc\.edu\.eg$/;
    const emailForValidation = typeof this.email === 'string' ? this.email.toLowerCase() : this.email;
    if (!gucEmailRegex.test(emailForValidation)) {
      return next(new Error('GUC users must use a valid GUC email address (@student.guc.edu.eg or @guc.edu.eg)'));
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
