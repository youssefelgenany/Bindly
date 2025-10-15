const crypto = require("crypto");
const User = require("../models/userModel");
const { sendVerificationEmail } = require("../Utils/mailer");

// Admin assigns correct role (staff/TA/professor) and sends email


exports.assignRoleAndSendVerification = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role)
      return res.status(400).json({ msg: "userId and role are required" });

    // Must match your schema's enum values exactly
    const allowedRoles = ["Staff", "TA", "Professor"];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ msg: "Invalid role for this endpoint" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Update userType + generate verification token
    user.userType = role;
    user.verificationToken = crypto.randomBytes(24).toString("hex");
    user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email (use first + last name if available)
    const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.name;
    await sendVerificationEmail(user.email, user.verificationToken, name);

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
    const { isActive, confirmationPassword } = req.body;

    console.log('🔍 Updating user status:', userId);
    console.log('🔍 Is Active:', isActive);
    console.log('🔍 Request body:', req.body);

    if (typeof isActive !== 'boolean') {
      console.log('❌ Invalid isActive type:', typeof isActive);
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('📊 Current user:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      currentStatus: user.status
    });

    // Require password confirmation when modifying Admin/Event Office accounts
    if (user.userType === 'Admin' || user.userType === 'Event Office') {
      if (!confirmationPassword || typeof confirmationPassword !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'confirmationPassword is required to modify admin accounts'
        });
      }
      if (confirmationPassword !== '123456') {
        return res.status(401).json({
          success: false,
          message: 'Invalid confirmation password'
        });
      }
    }

    // Update user status
    user.status = isActive ? 'active' : 'blocked';
    
    console.log('📊 New status:', user.status);
    
    await user.save();
    
    console.log('✅ User status updated successfully');

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
    console.error('❌ Error updating user status:', err);
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
    
    console.log('🔍 Updating vendor verification:', vendorId);
    console.log('🔍 Is Verified:', isVerified);

    if (typeof isVerified !== 'boolean') {
      console.log('❌ Invalid isVerified type:', typeof isVerified);
      return res.status(400).json({
        success: false,
        message: "isVerified must be a boolean value",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    console.log('📊 Current verification status:', vendor.isVerified);
    vendor.isVerified = isVerified;
    await vendor.save();
    console.log('✅ Vendor verification updated successfully');

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
    console.error("❌ Error updating vendor verification:", error);
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
    
    console.log('🔍 Updating vendor status:', vendorId);
    console.log('🔍 New Status:', status);

    if (!['active', 'blocked'].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'blocked'",
      });
    }

    const vendor = await User.findOne({ _id: vendorId, userType: 'Vendor' });
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    console.log('📊 Current status:', vendor.status);
    vendor.status = status;
    await vendor.save();
    console.log('✅ Vendor status updated successfully');

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
    console.error("❌ Error updating vendor status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vendor status",
      error: error.message,
    });
  }
};

// Update user verification status
exports.updateUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified, confirmationPassword } = req.body;
    
    console.log('🔍 Updating user verification:', userId);
    console.log('🔍 Is Verified:', isVerified);

    if (typeof isVerified !== 'boolean') {
      console.log('❌ Invalid isVerified type:', typeof isVerified);
      return res.status(400).json({
        success: false,
        message: "isVerified must be a boolean value",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Require password confirmation when modifying Admin/Event Office verification
    if (user.userType === 'Admin' || user.userType === 'Event Office') {
      if (!confirmationPassword || typeof confirmationPassword !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'confirmationPassword is required to modify admin accounts'
        });
      }
      if (confirmationPassword !== '123456') {
        return res.status(401).json({
          success: false,
          message: 'Invalid confirmation password'
        });
      }
    }

    console.log('📊 Current verification status:', user.isVerified);
    user.isVerified = isVerified;
    await user.save();
    console.log('✅ User verification updated successfully');

    res.status(200).json({
      success: true,
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("❌ Error updating user verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user verification",
      error: error.message,
    });
  }
};