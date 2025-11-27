const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/AdminModel');
const { sendVerificationEmail } = require('../utils/mailer');

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

    // Check for existing user with case-insensitive email search
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
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
      // Do not auto-verify users on signup. Users must click the verification
      // link sent to their email to be marked verified. This ensures login
      // fails for unverified accounts until email confirmation.
      isVerified: false,
      status: 'blocked'
    };

    // Students still get a verification token so we can email them a confirmation link
    if (userType === 'Student') {
      userData.verificationToken = crypto.randomBytes(32).toString('hex');
      userData.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      console.log('🔑 Generated verification token for student:', userData.verificationToken);
      console.log('📧 Email for token:', email);
    }

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
    console.log('📝 Saved user email:', newUser.email);
    if (newUser.verificationToken) {
      console.log('📝 Saved verification token:', newUser.verificationToken);
      console.log('📝 Token expires at:', newUser.verificationExpiresAt);
    }

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

    // Fire off the verification email for students so they still confirm their inbox
    if (newUser.userType === 'Student') {
      const studentName = `${newUser.firstName} ${newUser.lastName || ''}`.trim() || newUser.email;
      console.log('📧 Sending verification email to student:', newUser.email);
      console.log('🔑 Using verification token:', newUser.verificationToken);
      const emailResult = await sendVerificationEmail(newUser.email, newUser.verificationToken, studentName);
      responseBody.verificationEmailSent = emailResult.sent;
      responseBody.verificationLink = emailResult.verificationUrl || emailResult.verifyUrl || null;
      if (!emailResult.sent) {
        console.warn('Student verification email failed to send:', newUser.email);
      } else {
        console.log('✅ Verification email sent with token:', newUser.verificationToken);
      }
    }

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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    console.log("Login attempt for email:", email);

    // Try to find user in User model first (case-insensitive search)
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    console.log("User found in User model:", user ? 'Yes' : 'No');

    // If not found in User model, try Admin model
    if (!user) {
      user = await Admin.findOne({ email });
      console.log("User found in Admin model:", user ? 'Yes' : 'No');
    }

    if (!user) {
      console.log("No user found with email:", email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if user has comparePassword method
    if (!user.comparePassword || typeof user.comparePassword !== 'function') {
      console.error('User model does not have comparePassword method');
      return res.status(500).json({ success: false, message: 'Internal server error: User model issue' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log("Invalid password for email:", email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Helper function to safely build user response
    const buildUserResponse = (user) => {
      return {
        id: user._id,
        email: user.email || '',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        name: user.name || null, // For admin accounts
        userType: user.userType || user.role || null,
        role: user.role || user.userType || null,
        gucId: user.gucId || null,
        department: user.department || null,
        profilePicturePath: user.profilePicturePath || null,
        companyName: user.companyName || null,
        isVerified: user.isVerified !== undefined ? user.isVerified : false,
        status: user.status || 'blocked',
        createdAt: user.createdAt || new Date()
      };
    };

    // Check verification status for ALL user types (including admin)
    if (user.isVerified === false || user.isVerified === undefined) {
      const userResponse = buildUserResponse(user);

      // Different message for students (email verification) vs other users (admin verification)
      const message = user.userType === 'Student'
        ? 'Account pending verification. Kindly check your email.'
        : 'Your account is pending admin verification. You will receive an email once verified.';

      return res.status(403).json({
        success: false,
        code: 'AWAITING_VERIFICATION',
        message: message,
        user: userResponse
      });
    }

    // Block login for inactive users (including admin)
    if (user.status && user.status !== 'active') {
      const userResponse = buildUserResponse(user);
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_BLOCKED',
        message: `Your account is currently ${user.status}. Please contact an administrator for assistance.`,
        user: userResponse
      });
    }

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role || user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = buildUserResponse(user);

    console.log("Login successful for user:", user.email);
    res.json({ success: true, message: 'Login successful', user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during login'
    });
  }
};

// ==================== VERIFY EMAIL ====================
async function verifyEmail(req, res) {
  try {
    let { token } = req.query;
    const redirectParam = String(req.query.redirect || 'true').toLowerCase();
    const isJsonResponse = redirectParam === 'false' || redirectParam === '0';
    
    if (!token) {
      const errorMessage = 'Invalid verification link';
      if (isJsonResponse) {
        return res.status(400).json({ success: false, message: errorMessage });
      }
      return res.status(400).send(errorMessage);
    }
    
    // Ensure token is a string and trim any whitespace
    token = String(token).trim();
    console.log('🔍 verifyEmail called with token:', token);
    console.log('🔍 Token length:', token?.length);
    console.log('🔍 Token type:', typeof token);

    // Check if token exists and is not expired
    let user = await User.findOne({ verificationToken: token, verificationExpiresAt: { $gt: new Date() } });
    
    if (!user) {
      // Check if token exists but is expired
      const expiredUser = await User.findOne({ verificationToken: token });
      if (expiredUser) {
        console.warn('⚠️ verifyEmail: Token expired for user:', expiredUser.email);
        console.warn('⚠️ Token in DB:', expiredUser.verificationToken);
        console.warn('⚠️ Expires at:', expiredUser.verificationExpiresAt);
        const errorMessage = 'Verification link has expired. Please request a new verification email.';
        if (isJsonResponse) {
          return res.status(400).json({ success: false, message: errorMessage });
        }
        return res.status(400).send(errorMessage);
      }
      
      // Debug: Check all users with similar emails to see if there's a case mismatch
      const normalizedToken = token.toLowerCase();
      const userWithSimilarToken = await User.findOne({ 
        verificationToken: { $regex: new RegExp(normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      });
      if (userWithSimilarToken) {
        console.warn('⚠️ Found user with case-different token:', userWithSimilarToken.email);
        console.warn('⚠️ DB token:', userWithSimilarToken.verificationToken);
        console.warn('⚠️ Provided token:', token);
      }
      // Debug: List all unverified students to see what tokens exist
      const allUnverifiedStudents = await User.find({ 
        userType: 'Student', 
        isVerified: false,
        verificationToken: { $exists: true, $ne: null }
      }).select('email verificationToken verificationExpiresAt').limit(5);
      console.warn('⚠️ Recent unverified students:', allUnverifiedStudents.map(u => ({
        email: u.email,
        token: u.verificationToken?.substring(0, 20) + '...',
        expires: u.verificationExpiresAt
      })));
      
      // Check if there's a user with this email who might need a new verification email
      // Extract email from query if available, or check all recent unverified students
      const emailFromQuery = req.query.email;
      if (emailFromQuery) {
        const userByEmail = await User.findOne({ 
          email: { $regex: new RegExp(`^${emailFromQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          userType: 'Student'
        });
        if (userByEmail) {
          if (userByEmail.isVerified) {
            // User is already verified, return success instead of error
            console.log('✅ User already verified:', userByEmail.email);
            const determineFrontendOrigin = async () => {
              if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, '');
              const referer = req.get('Referer') || req.get('Origin');
              if (referer) {
                try {
                  const urlObj = new URL(referer);
                  return urlObj.origin;
                } catch (e) {}
              }
              return 'http://localhost:3000';
            };
            const frontendOrigin = await determineFrontendOrigin();
            const loginUrl = frontendOrigin + '/login';
            if (isJsonResponse) {
              return res.json({ success: true, message: 'Email already verified', alreadyVerified: true, loginUrl });
            }
            return res.redirect(loginUrl);
          } else {
            console.warn('⚠️ Found unverified student with this email:', userByEmail.email);
            console.warn('⚠️ Their current token:', userByEmail.verificationToken?.substring(0, 20) + '...');
            const errorMessage = 'This verification link is invalid or expired. Please sign up again to receive a new verification email.';
            if (isJsonResponse) {
              return res.status(400).json({ success: false, message: errorMessage });
            }
            return res.status(400).send(errorMessage);
          }
        }
      }
      
      console.warn('⚠️ verifyEmail: No user found matching token (invalid)');
      const errorMessage = 'Verification link is invalid or expired. Please sign up again to receive a new verification email.';
      if (isJsonResponse) {
        return res.status(400).json({ success: false, message: errorMessage });
      }
      return res.status(400).send(errorMessage);
    }

    console.log(`🔐 verifyEmail: Found user ${user.email} (isVerified=${user.isVerified}, status=${user.status}) - verifying now`);

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;

    // Set status to active after verification for students and Staff/TA/Professor
    if (user.status === 'blocked') {
      if (user.userType === 'Student' || ['Staff', 'TA', 'Professor'].includes(user.userType)) {
        user.status = 'active';
        console.log(`✅ verifyEmail: Setting status to 'active' for ${user.userType}`);
      }
    }

    await user.save();
    console.log(`✅ verifyEmail: User ${user.email} verified successfully (isVerified=${user.isVerified}, status=${user.status})`);

    // Determine the frontend login URL to redirect to.
    // Priority:
    // 1. process.env.FRONTEND_URL if provided
    // 2. Origin or Referer header from the incoming request (preserves port)
    // 3. Probe localhost:3001 then 3000 and use the first reachable
    // 4. Fallback to http://localhost:3000
    const determineFrontendOrigin = async () => {
      if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, '');

      const referer = req.get('Referer') || req.get('Origin');
      if (referer) {
        try {
          const urlObj = new URL(referer);
          return urlObj.origin;
        } catch (e) {
          // ignore and continue to probe
        }
      }

      // Probe common local dev ports so the redirect works whether frontend runs on 3001 or 3000
      const net = require('net');
      const probePort = (host, port, timeout = 200) => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          let done = false;
          socket.setTimeout(timeout);
          socket.on('connect', () => { done = true; socket.destroy(); resolve(true); });
          socket.on('timeout', () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
          socket.on('error', () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
          socket.connect(port, host);
        });
      };

      const portsToTry = [3001, 3000];
      for (const p of portsToTry) {
        try {
          // probe localhost and 127.0.0.1
          const okLocal = await probePort('127.0.0.1', p);
          if (okLocal) return `http://localhost:${p}`;
        } catch (e) {
          // ignore
        }
      }

      return 'http://localhost:3000';
    };

    const frontendOrigin = await determineFrontendOrigin();
    const loginUrl = frontendOrigin + '/login';
    console.log('✅ verifyEmail: User verified, redirect target:', loginUrl);

    // If the client requested no redirect (e.g., frontend calling via XHR),
    // return JSON indicating success and include the login URL. Otherwise,
    // perform the existing redirect so email clicks still work.
    if (isJsonResponse) {
      return res.json({ success: true, message: 'User verified', loginUrl });
    }

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
    
    // Allow resending for all user types that need verification (Student, Staff, TA, Professor)
    const requiresVerification = ['Student', 'Staff', 'TA', 'Professor'].includes(user.userType);
    if (!requiresVerification) {
      return res.status(400).json({ success: false, message: 'This user type does not require verification' });
    }
    
    if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

    // Generate new token if missing or expired
    if (!user.verificationToken || !user.verificationExpiresAt || user.verificationExpiresAt <= new Date()) {
      user.verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
    }

    // Get user name for email
    const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || user.email;
    
    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, user.verificationToken, userName);
    
    if (emailResult.sent) {
      console.log('✅ Verification email resent successfully to:', user.email);
      return res.json({ success: true, message: 'Verification email resent successfully' });
    } else {
      console.error('❌ Verification email not sent:', emailResult.reason || emailResult.error);
      return res.status(500).json({ 
        success: false, 
        message: emailResult.reason === 'SMTP not configured' 
          ? 'Email service is not configured. Please contact support.' 
          : 'Failed to send verification email. Please try again later.' 
      });
    }
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
        walletBalance: user.walletBalance || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
