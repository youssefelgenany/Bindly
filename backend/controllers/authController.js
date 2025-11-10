const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/AdminModel');



// ==================== EMAIL TRANSPORT ====================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Boolean(process.env.SMTP_SECURE === 'true'),
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

async function sendVerificationEmail(toEmail, token) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verifyUrl = `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Welcome to Bindly!</h2>
        <p>Please verify your email to activate your account:</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Verify My Email
        </a>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>Note:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #d32f2f; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>After verification, you'll be able to access all features of the Bindly platform.</p>
        <p>This verification link will expire in 24 hours.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
  `;

  console.log('[Bindly] Verification link for', toEmail, '=>', verifyUrl);
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.warn('[Bindly] SMTP not configured; email not sent.');
    return { sent: false, verifyUrl };
  }

  try {
    const mailOptions = {
      from: "Bindly <salmaahmed1504@gmail.com>",
      to: toEmail,
      subject: 'Verify your Bindly account',
      html
    };
    if (process.env.DEBUG_EMAIL_BCC_SELF === 'true' && process.env.SMTP_USER) {
      mailOptions.bcc = process.env.SMTP_USER;
    }
    const info = await transporter.sendMail(mailOptions);
    if (info && info.messageId) {
      console.log('[Bindly] Verification email messageId:', info.messageId);
    }
    return { sent: true, verifyUrl };
  } catch (e) {
    console.error('[Bindly] Error sending verification email:', e.message);
    return { sent: false, verifyUrl };
  }
}

// ==================== VALIDATION ====================
const signupValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .if(body('userType').not().equals('Vendor'))
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required for non-vendor users'),
  body('lastName')
    .if(body('userType').not().equals('Vendor'))
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required for non-vendor users'),
  body('userType').isIn(['Student', 'Staff', 'TA', 'Professor', 'Vendor'])
    .withMessage('User type must be one of: Student, Staff, TA, Professor, Vendor'),
  body('gucId')
    .if(body('userType').isIn(['Student', 'Staff', 'TA', 'Professor']))
    .trim()
    .isLength({ min: 1 })
    .withMessage('GUC ID is required for GUC users'),
  body('companyName')
    .if(body('userType').equals('Vendor'))
    .trim()
    .isLength({ min: 1 })
    .withMessage('Company name is required for vendors')
];

// ==================== SIGNUP ====================
const signup = async (req, res) => {
  try {
    console.log('Signup request received:', {
      body: req.body,
      files: req.files,
      contentType: req.headers['content-type'],
      bodyKeys: req.body ? Object.keys(req.body) : 'no body',
      bodyType: typeof req.body
    });

    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Request body is missing. Please ensure you are sending form data correctly.'
      });
    }

    const { email, password, firstName, lastName, userType, gucId, companyName } = req.body;

    // Basic validation
    if (!email || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: email, password, userType' 
      });
    }

    // First name and last name are only required for non-vendors
    if (userType !== 'Vendor' && (!firstName || !lastName)) {
      return res.status(400).json({ 
        success: false, 
        message: 'First name and last name are required for non-vendor users' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    // GUC email validation for academic users
    if (['Student', 'Staff', 'TA', 'Professor'].includes(userType)) {
      const gucEmailRegex = /^[a-z0-9._%+-]+@student\.guc\.edu\.eg$|^[a-z0-9._%+-]+@guc\.edu\.eg$/;
      if (!gucEmailRegex.test(String(email).toLowerCase())) {
        return res.status(400).json({ 
          success: false, 
          message: 'GUC users must use a valid GUC email address (@student.guc.edu.eg or @guc.edu.eg)' 
        });
      }
    }

    const userData = { 
      email, 
      password, 
      userType,
      isVerified: false, // All users need admin verification by default
      status: 'blocked' // All users start as blocked until verified
    };

    // Add first and last name only for non-vendors
    // Add firstName and lastName for non-vendor users
    if (userType !== 'Vendor') {
      userData.firstName = firstName;
      userData.lastName = lastName;
    }

    // Add GUC ID for academic users
    if (['Student', 'Staff', 'TA', 'Professor'].includes(userType)) {
      if (!gucId) {
        return res.status(400).json({ 
          success: false, 
          message: 'GUC ID is required for academic users' 
        });
      }
      userData.gucId = gucId;
    }

    // Add company name for vendors
    if (userType === 'Vendor') {
      if (!companyName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Company name is required for vendors' 
        });
      }
      userData.companyName = companyName;
      
      // Handle file uploads for vendors (simplified)
      const files = req.files || {};
      const logo = files.vendorLogo && files.vendorLogo[0];
      const tax = files.vendorTaxCard && files.vendorTaxCard[0];
      
      if (logo) {
        userData.vendorLogoPath = '/uploads/' + logo.filename;
      }
      if (tax) {
        userData.vendorTaxCardPath = '/uploads/' + tax.filename;
      }
    }

    const newUser = new User(userData);
    await newUser.save();

    console.log('User created successfully:', newUser._id);

    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      userType: newUser.userType,
      gucId: newUser.gucId,
      department: newUser.department,
      profilePicturePath: newUser.profilePicturePath,
      companyName: newUser.companyName,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt
    };

    // Only include first and last name for non-vendors
    // Add firstName and lastName for non-vendor users
    if (newUser.userType !== 'Vendor') {
      userResponse.firstName = newUser.firstName;
      userResponse.lastName = newUser.lastName;
    }

    // Generate JWT token for immediate login
    // Generate JWT token (will be returned only if user is verified and active)
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email, 
        userType: newUser.userType 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Determine response message based on user type
    const isReady = Boolean(newUser.isVerified && String(newUser.status) === 'active');
    let responseMessage = isReady
      ? 'Account created successfully.'
      : 'Account created successfully. Your account is pending admin verification. You will receive an email once verified.';

    const responseBody = {
      success: true,
      message: responseMessage,
      user: userResponse,
      token: isReady ? token : null,
      requiresVerification: !isReady
    };

    res.status(201).json(responseBody);

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message
    });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  console.log("🟢 Login route hit");
  

  try {
    
    const { email, password } = req.body;
   console.log("user",req.body);
    // Try to find user in User model first
    let user = await User.findOne({ email });
    console.log("user",user);
    console.log("secret",process.env.JWT_SECRET);
    // If not found in User model, try Admin model
    if (!user) {
      user = await Admin.findOne({ email });
    }
    
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Check verification status for ALL user types (including admin)
    if (!user.isVerified) {
      const userResponse = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name, // For admin accounts
        userType: user.userType,
        role: user.role || user.userType, // Include role for Admin model users, or userType for User model users
        gucId: user.gucId,
        companyName: user.companyName,
        isVerified: user.isVerified,
        status: user.status,
        createdAt: user.createdAt
      };
      
      // Different message for students (email verification) vs other users (admin verification)
      const message = user.userType === 'Student' 
        ? 'Please verify your email address to login. Check your inbox for the verification link.'
        : 'Your account is pending admin verification. You will receive an email once verified.';
      
      return res.status(403).json({ 
        success: false, 
        code: 'AWAITING_VERIFICATION',
        message: message,
        user: userResponse
      });
    }

    // Block login for inactive users (including admin)
    if (user.status !== 'active') {
      const userResponse = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name, // For admin accounts
        userType: user.userType,
        role: user.role || user.userType, // Include role for Admin model users, or userType for User model users
        gucId: user.gucId,
        companyName: user.companyName,
        isVerified: user.isVerified,
        status: user.status,
        createdAt: user.createdAt
      };
      
      return res.status(403).json({
        success: false,
        code: 'AWAITING_VERIFICATION',
        message: 'Your account is awaiting verification. Please wait for admin approval.',
        user: userResponse
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role || user.userType  },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name, // For admin accounts
      userType: user.userType,
      role: user.role || user.userType, // Include role for Admin model users, or userType for User model users
      gucId: user.gucId,
      department: user.department,
      profilePicturePath: user.profilePicturePath,
      companyName: user.companyName,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    res.json({ success: true, message: 'Login successful', user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ==================== VERIFY EMAIL ====================
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Invalid verification link');

    const user = await User.findOne({ verificationToken: token, verificationExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).send('Verification link is invalid or expired');

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    
    // Set status to active after verification for students and Staff/TA/Professor
    if (user.status === 'blocked') {
      if (user.userType === 'Student' || ['Staff', 'TA', 'Professor'].includes(user.userType)) {
        user.status = 'active';
      }
    }
    
    await user.save();

    const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/login';
    return res.redirect(loginUrl);
  } catch (e) {
    console.error('verifyEmail error:', e);
    return res.status(500).send('Internal server error');
  }
}

// ==================== SMTP STATUS ====================
async function smtpStatus(req, res) {
  try {
    if (process.env.ENABLE_DEV_EMAIL_ROUTES !== 'true') return res.status(404).end();
    await transporter.verify();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

// ==================== SEND TEST EMAIL ====================
async function sendTestEmail(req, res) {
  try {
    if (process.env.ENABLE_DEV_EMAIL_ROUTES !== 'true') return res.status(404).end();
    const to = req.query.to || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ ok: false, error: 'Provide ?to=email' });
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@bindly.app',
      to,
      subject: 'Bindly Test Email',
      text: 'This is a test email from Bindly backend.'
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

// ==================== RESEND VERIFICATION ====================
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.userType !== 'Student') return res.status(400).json({ success: false, message: 'Only students require verification' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

    if (!user.verificationToken || !user.verificationExpiresAt || user.verificationExpiresAt <= new Date()) {
      user.verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
    }

    await sendVerificationEmail(user.email, user.verificationToken);
    return res.json({ success: true, message: 'Verification email resent' });
  } catch (e) {
    console.error('resendVerification error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, gucId, department } = req.body;
    const userId = req.user._id;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Update user profile
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    
    // Update GUC ID if provided and user is a GUC user
    if (gucId && ['Student', 'Staff', 'TA', 'Professor'].includes(user.userType)) {
      user.gucId = gucId;
    }
    
    // Update department if provided
    if (department) {
      user.department = department;
    }
    
    // Handle profile picture upload
    if (req.file) {
      console.log('📸 Profile picture uploaded:', req.file.filename);
      user.profilePicturePath = '/uploads/' + req.file.filename;
    }
    
    console.log('🔍 Before save - user department:', user.department);
    await user.save();
    console.log('🔍 After save - user department:', user.department);

    console.log('✅ Profile updated successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        gucId: user.gucId,
        department: user.department,
        profilePicturePath: user.profilePicturePath,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Change user password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('✅ Password changed successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('❌ Error changing password:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== GET CURRENT USER ====================
const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by the protect middleware
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Current user fetched:', user.email);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        gucId: user.gucId,
        companyName: user.companyName,
        isVerified: user.isVerified,
        isActive: user.isActive,
        profilePicturePath: user.profilePicturePath,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('❌ Error fetching current user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== EXPORT ====================
module.exports = {
  signup,
  login,
  signupValidation,
  verifyEmail,
  smtpStatus,
  sendTestEmail,
  resendVerification,
  updateProfile,
  changePassword,
  getCurrentUser
};
