
const Admin = require('../models/AdminModel');

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded.userId must match what you sign in your login
    // Try to find user in User model first
    let user = await User.findById(decoded.userId).select('-password');
    
    // If not found in User model, try Admin model
    if (!user) {
      user = await Admin.findById(decoded.userId).select('-password');
    }
    
    if (!user) return res.status(401).json({ msg: 'User not found' });

    // normalize the shape used everywhere
    req.user = {
      _id: user._id,
      userType: user.userType || user.role,   // Use userType if available, otherwise use role
      role: decoded.role,        // Include role from JWT token
      email: user.email
    };
    next();
  } catch (e) {
    console.error('auth error:', e);
    res.status(401).json({ msg: 'Invalid/expired token' });
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
