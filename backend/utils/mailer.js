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
  
  // Use FRONTEND_URL for the verification endpoint redirect, or BACKEND_URL as fallback
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_LOGIN_URL?.replace('/login', '') || "http://localhost:3000";
  const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;
  const loginRedirect = `${frontendUrl}/login`;
  
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
    
    return { sent: false, reason: 'SMTP not configured' };
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
    
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send verification email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    console.error('   Full Error:', error);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendVerificationEmail };

