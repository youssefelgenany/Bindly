const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  signupValidation,
  verifyEmail,
  smtpStatus,
  sendTestEmail,
  resendVerification
} = require('../controllers/authController');

// ==================== AUTH ROUTES ====================

// 📝 User signup (with multer for file uploads)
const { uploadVendorFiles } = require('../middleware/uploadMiddleware');
router.post('/signup', uploadVendorFiles, signup);

// 🔑 User login
router.post('/login', login);

// 📧 Email verification (clicked from email)
router.get('/verify-email', verifyEmail);

// 🔁 Resend verification email (for unverified students)
router.post('/resend-verification', resendVerification);

// 🛠️ Dev-only diagnostic routes (optional)
router.get('/smtp-status', smtpStatus);
router.get('/send-test-email', sendTestEmail);

// Simple test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!', timestamp: new Date().toISOString() });
});

// Simple test signup (without validation)
router.post('/test-signup', async (req, res) => {
  try {
    console.log('Test signup received:', req.body);
    res.json({ 
      success: true, 
      message: 'Test signup received successfully',
      receivedData: req.body 
    });
  } catch (error) {
    console.error('Test signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test signup failed',
      error: error.message 
    });
  }
});

// Simplified signup for debugging
router.post('/simple-signup', async (req, res) => {
  try {
    console.log('Simple signup received:', req.body);
    
    const { email, password, firstName, lastName, userType, gucId } = req.body;
    
    // Basic validation
    if (!email || !password || !firstName || !lastName || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if user exists
    const User = require('../models/userModel');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create user
    const userData = {
      email,
      password,
      firstName,
      lastName,
      userType,
      isVerified: true
    };
    
    if (gucId) {
      userData.gucId = gucId;
    }
    
    const newUser = new User(userData);
    await newUser.save();
    
    console.log('User created successfully:', newUser._id);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        isVerified: newUser.isVerified
      }
    });
    
  } catch (error) {
    console.error('Simple signup error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: 'Simple signup failed',
      error: error.message
    });
  }
});

module.exports = router;
