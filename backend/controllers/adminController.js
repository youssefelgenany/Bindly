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
