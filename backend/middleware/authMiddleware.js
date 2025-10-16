const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/AdminModel');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('🔐 Auth Header:', authHeader);

    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log("token", token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    console.log("secret", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded", decoded);

    let account = await User.findById(decoded.userId).select('-password');
    if (!account) account = await Admin.findById(decoded.userId).select('-password');

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = account;
    next();
  } catch (error) {
    console.error("❌ JWT verification failed:", error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Normalize role strings for comparison (case-insensitive, unify spacing/underscores)
function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Middleware to check if user has specific role (case-insensitive, tolerant)
const permit = (...roles) => {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.userType);
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
};

// Alias for compatibility


module.exports = {
  protect,
  permit
};
