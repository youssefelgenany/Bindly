const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Admin = require("../models/AdminModel");

// Admin creates new admin/event office accounts
exports.createAdminOrEventOffice = async (req, res) => {
  console.log("🔹 Body received:", req.body);
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const requestingUser = req.user; // The admin making the request

    console.log('🔍 Creating admin account:', { firstName, lastName, email, role });
    console.log('🔄 NEW VERSION - Admin accounts will be UNVERIFIED and BLOCKED');
    console.log('🔍 Requesting user:', { id: requestingUser._id, userType: requestingUser.userType });

    if (!firstName || !lastName || !email || !password || !role)
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firstName, lastName, email, password, role"
      });

    // Validate role
    if (!["Admin", "Event Office", "admin", "event_office"].includes(role))
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be Admin or Event Office"
      });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({
      success: false,
      message: "Email already exists"
    });

    // Map human role to schema enum and satisfy required fields
    const mappedUserType = (role === 'Admin' || role === 'admin') ? 'Admin' : 'event_office';

    // Build payload; for admin/event_office the schema requires `name`
    const fullName = `${firstName} ${lastName}`.trim();
    const payload = {
      name: fullName || role,
      email,
      password,
      userType: mappedUserType,
      isVerified: true, // All admin and event office accounts are auto-verified
      status: 'active' // All admin and event office accounts are auto-activated
    };

    const newUser = await User.create(payload);

    console.log('✅ Admin account created successfully:', newUser._id);
    console.log('📋 Account details:', {
      email: newUser.email,
      userType: newUser.userType,
      isVerified: newUser.isVerified,
      status: newUser.status
    });
    console.log('🔍 Verification Status:', newUser.isVerified ? 'VERIFIED' : 'UNVERIFIED');
    console.log('🔍 Account Status:', newUser.status);
    console.log('✅ EXPECTED: isVerified should be TRUE, status should be ACTIVE');

    res.status(201).json({
      success: true,
      message: "Admin account created successfully and is ready to use.",
      user: {
        id: newUser._id,
        name: newUser.name,
        firstName: firstName,
        lastName: lastName,
        email: newUser.email,
        userType: newUser.userType,
        isVerified: newUser.isVerified,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Error creating admin account:', err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Admin deletes admin or event office accounts
exports.deleteAdminOrEventOffice = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({
      success: false,
      message: "User not found"
    });

    if (!["admin", "event_office"].includes(user.userType.toLowerCase()))
      return res.status(400).json({ msg: "Not an admin/event office account" });

    await user.deleteOne();
    res.status(200).json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
