const User = require("../models/userModel");

// When user clicks verification link
exports.verifyByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid link");

    const user = await User.findOne({
      verificationToken: token,
      verificationExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).send("Link invalid or expired");

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    await user.save();

    const redirectUrl = process.env.APP_LOGIN_URL || "http://localhost:3000/login";
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
