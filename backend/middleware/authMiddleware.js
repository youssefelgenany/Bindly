const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/AdminModel');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('🔐 Auth Header:', authHeader);

    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log("token",token); 

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    console.log("secret",process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log("decoded",decoded);
    let account = await User.findById(decoded.id).select('-password');
    if (!account) account = await Admin.findById(decoded.id).select('-password');

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = account;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const permit = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { protect, permit };
