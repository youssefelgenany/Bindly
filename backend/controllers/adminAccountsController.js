const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

// Admin creates new admin/event office accounts
exports.createAdminOrEventOffice = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ msg: "Missing required fields" });

    if (!["admin", "event_office"].includes(role))
      return res.status(400).json({ msg: "Role must be admin or event_office" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      verified: true, // auto-verified since admin created it
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

    if (!["admin", "event_office"].includes(user.role))
      return res.status(400).json({ msg: "Not an admin/event office account" });

    await user.deleteOne();
    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

