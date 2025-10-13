const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Admin = require("../models/AdminModel");

// Admin creates new admin/event office accounts
exports.createAdminOrEventOffice = async (req, res) => {
   console.log("🔹 Body received:", req.body);
  try {
    const { name, email, password, userType } = req.body;

    if (!name || !email || !password || !userType)
      return res.status(400).json({ msg: "Missing required fields" });

    if (!["admin", "event_office"].includes(userType.toLowerCase()))
      return res.status(400).json({ msg: "userType must be admin or event_office" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ 
      success: false,
      message: "Email already exists" 
    });

    //const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      userType: userType.toLowerCase(),
      isVerified: true, // auto-verified
    });

    res.status(201).json({ 
      success: true,
      message: "Account created successfully", 
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        userType: newUser.userType,
        isVerified: newUser.isVerified,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error(err);
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
