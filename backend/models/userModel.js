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
      // Required for Student, Staff, TA, Professor (even if userType is null during signup)
      // We check if userType exists and is in the list, or if it's null (pending role assignment)
      return this.userType && ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true,
    default: null
  },
  lastName: {
    type: String,
    required: function() {
      // Required for Student, Staff, TA, Professor (even if userType is null during signup)
      return this.userType && ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true,
    default: null
  },
   name: {
    type: String,
    required: function() {
      return ['Admin', 'event_office'].includes(this.userType);
    }
  },
  userType: {
    type: String,
    required: false, // Not required for Staff/TA/Professor during signup - admin will assign it
    enum: ['Student', 'Staff', 'TA', 'Professor', 'Vendor','event_office','Admin'],
    default: null
  },
  // For GUC users (Student, Staff, TA, Professor)
  gucId: {
    type: String,
    required: function() {
      // Required for Student, Staff, TA, Professor (even if userType is null during signup)
      return this.userType && ['Student', 'Staff', 'TA', 'Professor'].includes(this.userType);
    },
    trim: true,
    default: null
  },
  // Department field for GUC users
  department: {
    type: String,
    trim: true
  },
  // Profile picture for all users
  profilePicturePath: {
    type: String,
    default: null
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
    default: 'active' // Default to active - status should not be affected by signup
  },
  // Favorite events list for students/TA/professor/staff
  favoriteEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  // Wallet balance for payments
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // Wallet transaction history
  walletTransactions: [{
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['topup', 'payment', 'refund'],
      required: true
    },
    description: String,
    balanceAfter: Number,
    reference: String, // Payment ID or registration ID
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
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

// Normalize email to lowercase before saving (case-insensitive)
userSchema.pre('save', function(next) {
  if (this.email && typeof this.email === 'string') {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

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

// Auto-set verification for newly created accounts by type
// Status is not affected by signup - it defaults to 'active' in schema
userSchema.pre('save', function(next) {
  try {
    if (this.isNew) {
      if (this.userType === 'Student') {
        // Students: unverified until email verification
        // Only set if not already explicitly set (to allow manual override)
        if (this.isVerified === undefined) {
          this.isVerified = false;
        }
        // Status not set here - uses default from schema
      } else if (['TA', 'Staff', 'Professor'].includes(this.userType)) {
        // TA/Staff/Professor: unverified until admin assigns role and they verify email
        this.isVerified = false;
        // Status not set here - uses default from schema
      } else if (this.userType === 'Vendor') {
        // Vendors: verified and active
        this.isVerified = true;
        // Status not set here - uses default from schema
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

// Delete all related registrations when a user is deleted
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const userId = this._id;
    const userEmail = this.email?.toLowerCase();
    
    console.log('🗑️ Pre-delete hook: Deleting user:', userId, 'email:', userEmail);
    
    // Use the cleanup utility function
    const { cleanupUserRegistrations } = require('../utils/cleanupUserRegistrations');
    await cleanupUserRegistrations(userId, userEmail);
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-delete hook deleting related registrations:', error);
    // Don't block user deletion if registration cleanup fails
    next();
  }
});

// Also handle findOneAndDelete and findByIdAndDelete (used by scripts and direct queries)
userSchema.pre('findOneAndDelete', async function(next) {
  try {
    const user = await this.model.findOne(this.getQuery());
    if (user) {
      const userId = user._id;
      const userEmail = user.email?.toLowerCase();
      
      console.log('🗑️ Pre-findOneAndDelete hook: Deleting user:', userId, 'email:', userEmail);
      
      // Use the cleanup utility function
      const { cleanupUserRegistrations } = require('../utils/cleanupUserRegistrations');
      await cleanupUserRegistrations(userId, userEmail);
    }
    next();
  } catch (error) {
    console.error('❌ Error in pre-findOneAndDelete hook deleting related registrations:', error);
    // Don't block user deletion if registration cleanup fails
    next();
  }
});

// Note: findByIdAndDelete internally uses findOneAndDelete, so the findOneAndDelete hook above will handle it

module.exports = mongoose.model('User', userSchema);
