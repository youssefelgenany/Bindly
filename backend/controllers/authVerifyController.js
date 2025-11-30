const User = require("../models/userModel");

// When user clicks verification link
exports.verifyByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid link");

    // Check if token exists and is not expired
    const user = await User.findOne({
      verificationToken: token,
      verificationExpiresAt: { $gt: new Date() },
    });
    
    if (!user) {
      // Check if token exists but is expired
      const expiredUser = await User.findOne({ verificationToken: token });
      if (expiredUser) {
        console.warn('⚠️ verifyByToken: Token expired for user:', expiredUser.email);
        return res.status(400).send("Verification link has expired. Please request a new verification email.");
      }
      console.warn('⚠️ verifyByToken: Invalid token');
      return res.status(400).send("Link invalid or expired");
    }

    console.log(`🔐 verifyByToken: Found user ${user.email} (isVerified=${user.isVerified}) - verifying now`);

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;

    await user.save();
    console.log(`✅ verifyByToken: User ${user.email} verified`);

    const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${redirectUrl}/login`);
  } catch (err) {
    console.error('❌ verifyByToken error:', err);
    res.status(500).send("Server error");
  }
};
