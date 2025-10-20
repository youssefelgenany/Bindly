const nodemailer = require("nodemailer");
const Email = require("../models/EmailModel");

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
  
  const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/verify-email?token=${token}`;
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Development Mode: Storing email in database instead of sending');
    
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
          userType: 'Staff/TA/Professor', // This will be updated based on actual user type
          email: to
        }
      });
      
      await emailRecord.save();
      console.log('✅ Email stored in database for development');
      console.log('🔗 Verification URL:', verifyUrl);
      console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
      
      return; // Success - email stored in database
    } catch (error) {
      console.error('❌ Error storing email in database:', error);
      // Fallback to console logging
      console.log('🔗 VERIFICATION LINK (Fallback):');
      console.log('   User:', name);
      console.log('   Email:', to);
      console.log('   Verification URL:', verifyUrl);
      console.log('   Token:', token);
      return;
    }
  }
  const loginRedirect = process.env.APP_LOGIN_URL || "http://localhost:3000/login";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Account Verification Required</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your account has been created and your role has been verified by an administrator. To complete your registration, please click the verification link below:</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Verify My Account
        </a>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>Note:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #d32f2f; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>After verification, you'll be redirected to the login page where you can sign in to your account.</p>
        <p>This verification link will expire in 24 hours.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
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
      from: "Bindly <salmaahmed1504@gmail.com>",
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

