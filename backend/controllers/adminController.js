const crypto = require("crypto");
const User = require("../models/userModel");
const { sendVerificationEmail } = require("../Utils/mailer");

// Admin assigns correct role (staff/TA/professor) and sends email
exports.assignRoleAndSendVerification = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role)
      return res.status(400).json({ msg: "userId and role are required" });

    const allowed = ["staff", "ta", "professor"];
    if (!allowed.includes(role))
      return res.status(400).json({ msg: "Invalid role for this endpoint" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Update role + generate verification token
    user.role = role;
    user.verificationToken = crypto.randomBytes(24).toString("hex");
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken, user.name);

    res.json({ msg: "Role assigned and verification email sent successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // exclude password field
    res.status(200).json({
      success: true,
      message: 'All users fetched successfully',
      users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'Vendor', 'Event Office', 'Admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user type (role)
    user.userType = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update user status (activate/deactivate)
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user status
    user.status = isActive ? 'active' : 'blocked';
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Change admin password
exports.changePassword = async (req, res) => {
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

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
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
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all vendors for admin management
exports.getAllVendors = async (req, res) => {
  try {
    const { q, status } = req.query;
    console.log('🔍 Admin requesting vendors with query:', { q, status });
    
    const filter = { userType: 'Vendor' };

    if (q) {
      filter.$or = [
        { firstName: new RegExp(q, "i") },
        { lastName: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { companyName: new RegExp(q, "i") },
      ];
    }
    
    if (status && status !== 'all') {
      if (status === 'verified') {
        filter.isVerified = true;
      } else if (status === 'pending') {
        filter.isVerified = false;
      } else if (status === 'active') {
        filter.status = 'active';
      } else if (status === 'blocked') {
        filter.status = 'blocked';
      }
    }

    console.log('🔍 Filter applied:', filter);

    const vendors = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 });

    console.log('📊 Found vendors:', vendors.length);

    res.status(200).json({
      success: true,
      message: 'Vendors fetched successfully',
      vendors
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
};

// Update vendor verification status
exports.updateVendorVerification = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isVerified must be a boolean value",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.isVerified = isVerified;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${isVerified ? 'verified' : 'unverified'} successfully`,
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        companyName: vendor.companyName,
        isVerified: vendor.isVerified,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error("Error updating vendor verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor verification",
      error: error.message,
    });
  }
};

// Update vendor status (active/blocked)
exports.updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'blocked'",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = status;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${status === 'active' ? 'activated' : 'blocked'} successfully`,
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        companyName: vendor.companyName,
        isVerified: vendor.isVerified,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error("Error updating vendor status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor status",
      error: error.message,
    });
  }
};