const nodemailer = require("nodemailer");
const Email = require("../models/EmailModel");

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 2),
  maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
  rateDelta: Number(process.env.SMTP_RATE_DELTA || 1000),
  rateLimit: Number(process.env.SMTP_RATE_LIMIT || 5),
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(to, token, name) {
  console.log('📧 sendVerificationEmail called with:', { to, token, name });
  
  // Prefer publicly reachable base URLs to avoid spam filters flagging localhost links
  const backendUrl =
    process.env.VERIFICATION_BASE_URL ||
    process.env.PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    "https://bindly.app";
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_LOGIN_URL?.replace('/login', '') || "http://localhost:3000";
  const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;
  const loginRedirect = `${frontendUrl}/login`;
  
  const sentAt = new Date().toUTCString();

  const textBody = [
    `Hi ${name || "there"},`,
    "",
    "Thanks for registering with Bindly. Please verify your email to activate your account:",
    verifyUrl,
    "",
    "This link expires in 24 hours. If you did not request this, you can safely ignore this email.",
    "",
    `Sent at: ${sentAt}`,
    `Bindly • ${frontendUrl.replace(/^https?:\/\//, '')}`
  ].join('\n');

  const html = `
    <p>Hi ${name || "there"},</p>
    <p>Thanks for registering with <strong>Bindly</strong>. Please verify your email to activate your account:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>This link expires in 24 hours. If you did not request this, you can safely ignore this email.</p>
    <p>Sent at: ${sentAt}</p>
    <p>Bindly • ${frontendUrl.replace(/^https?:\/\//, '')}</p>
  `;
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Verification Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', to);
    console.log('   Name:', name);
    console.log('   Verification URL:', verifyUrl);
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    
    // Store email in database for development
    try {
      const emailRecord = new Email({
        to: to,
        subject: "GUC Events — Verify your account",
        html: html,
        verificationToken: token,
        verificationUrl: verifyUrl,
        userInfo: {
          name: name,
          userType: 'Staff/TA/Professor',
          email: to
        }
      });
      
      await emailRecord.save();
      console.log('✅ Email stored in database for development');
      console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
    } catch (error) {
      console.error('❌ Error storing email in database:', error);
    }
    
    return { sent: false, reason: 'SMTP not configured', verificationUrl: verifyUrl };
  }
  
  console.log('📧 Attempting to send verification email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', to);
  console.log('   Subject: GUC Events — Verify your account');

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
      to,
      subject: "GUC Events — Verify your account",
      text: textBody,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', to);
    console.log('   Verification URL:', verifyUrl);
    
    // If using Mailtrap (testing service), also log the verification link
    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('mailtrap')) {
      console.log('🔗 MAILTRAP TESTING - Verification link logged:');
      console.log('   User:', name);
      console.log('   Email:', to);
      console.log('   Verification URL:', verifyUrl);
      console.log('   Token:', token);
      console.log('   ⚠️  Mailtrap is a testing service - check Mailtrap inbox for the email');
    }
    
    return { sent: true, messageId: info.messageId, verificationUrl: verifyUrl };
  } catch (error) {
    console.error('❌ Failed to send verification email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    console.error('   Full Error:', error);
    return { sent: false, error: error.message, code: error.code, verificationUrl: verifyUrl };
  }
}

module.exports = { sendVerificationEmail };

