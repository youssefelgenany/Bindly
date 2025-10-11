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
    <p>Welcome to Bindly!</p>
    <p>Please verify your email to activate your account:</p>
    <p><a href="${verifyUrl}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify my email</a></p>
    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p>${verifyUrl}</p>
  `;

  console.log('[Bindly] Verification link for', toEmail, '=>', verifyUrl);
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.warn('[Bindly] SMTP not configured; email not sent.');
    return { sent: false, verifyUrl };
  }

  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || 'no-reply@bindly.app',
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
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
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
    if (!email || !password || !firstName || !lastName || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: email, password, firstName, lastName, userType' 
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
      firstName, 
      lastName, 
      userType,
      isVerified: true // All users are verified immediately
    };

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
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      userType: newUser.userType,
      gucId: newUser.gucId,
      companyName: newUser.companyName,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt
    };

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email, 
        userType: newUser.userType 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const responseBody = {
      success: true,
      message: 'User created successfully',
      user: userResponse,
      token
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
   
    const user = await User.findOne({ email }) || await Admin.findOne({ email });
    console.log("🔍 Found user:", user);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Email verification disabled for Students; allow login regardless

    const isPasswordValid = await user.comparePassword(password);
    console.log("passvalid?", isPasswordValid);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password ' });

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      gucId: user.gucId,
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

// ==================== EXPORT ====================
module.exports = {
  signup,
  login,
  signupValidation,
  verifyEmail,
  smtpStatus,
  sendTestEmail,
  resendVerification
};
