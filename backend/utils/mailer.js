const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
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
  
  const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/verify?token=${token}`;
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP not configured. Missing environment variables:');
    console.error('   SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing');
    console.error('   SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
    console.error('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
    
    // For development/testing: log the verification link instead of sending email
    console.log('🔗 VERIFICATION LINK (Email not configured):');
    console.log('   User:', name);
    console.log('   Email:', to);
    console.log('   Verification URL:', verifyUrl);
    console.log('   Token:', token);
    console.log('   ⚠️  Please set up SMTP configuration to send actual emails');
    
    return; // Don't throw error, just log the link for testing
  }
  const loginRedirect = process.env.APP_LOGIN_URL || "http://localhost:3000/login";
  const html = `
    <p>Hi ${name || ""},</p>
    <p>Your role has been verified. Click the link below to activate your account:</p>
    <a href="${verifyUrl}">Verify My Account</a>
    <p>If this doesn't work, copy and paste this link:</p>
    <p>${verifyUrl}</p>
    <p>You'll be redirected to: ${loginRedirect}</p>
  `;
  
  console.log('📧 Sending email with config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "GUC Events — Verify your account"
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: "GUC Events — Verify your account",
      html,
    });
    console.log('✅ Email sent successfully to:', to);
    
    // If using Mailtrap (testing service), also log the verification link
    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('mailtrap')) {
      console.log('🔗 MAILTRAP TESTING - Verification link logged:');
      console.log('   User:', name);
      console.log('   Email:', to);
      console.log('   Verification URL:', verifyUrl);
      console.log('   Token:', token);
      console.log('   ⚠️  Mailtrap is a testing service - check Mailtrap inbox for the email');
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

module.exports = { sendVerificationEmail };

