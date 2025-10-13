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
    if (exists) return res.status(400).json({ msg: "Email already exists" });

    //const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password,
      userType: userType.toLowerCase(),
      isVerified: true, // auto-verified
    });

    res.json({ msg: "Account created successfully", id: newUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Admin deletes admin or event office accounts
exports.deleteAdminOrEventOffice = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!["admin", "event_office"].includes(user.userType.toLowerCase()))
      return res.status(400).json({ msg: "Not an admin/event office account" });

    await user.deleteOne();
    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
