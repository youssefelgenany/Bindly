const nodemailer = require('nodemailer');
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

async function sendCommentWarningEmail(email, name, eventTitle, commentText) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h2 style="color: #856404; margin-top: 0;">⚠️ Comment Removed - Policy Violation</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We wanted to inform you that one of your comments has been removed from our platform for violating our community guidelines.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Event</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${eventTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Removed Comment</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-style: italic; color: #666;">${commentText ? (commentText.length > 100 ? commentText.substring(0, 100) + '...' : commentText) : 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Reason</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #d32f2f;">Inappropriate Content</td>
        </tr>
      </table>

      <div style="background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; margin-bottom: 20px;">
        <p style="margin: 0; color: #721c24;">
          <strong>⚠️ Important Notice</strong><br>
          Please ensure that all your future comments comply with our community guidelines. Repeated violations may result in further action, including account restrictions.
        </p>
      </div>

      <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460; margin-bottom: 20px;">
        <p style="margin: 0; color: #0c5460;">
          <strong>Community Guidelines:</strong><br>
          • Be respectful and courteous to all members<br>
          • Avoid offensive, discriminatory, or inappropriate language<br>
          • Keep comments relevant to the event<br>
          • Do not spam or post repetitive content
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>If you believe this removal was made in error, please contact our support team.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Comment Warning Email - Dev Mode] Storing email in database instead of sending');
    
    // Store email in database for development
    try {
      const emailRecord = new Email({
        to: email,
        subject: "Comment Removed - Policy Violation Warning",
        html: html,
        userInfo: {
          name: name,
          email: email,
          eventTitle: eventTitle
        }
      });
      
      await emailRecord.save();
      console.log('✅ Comment warning email stored in database for development');
      console.log('   To:', email);
      console.log('   Name:', name);
      console.log('   Event:', eventTitle);
      console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
      return { sent: true, stored: true };
    } catch (error) {
      console.error('❌ Error storing comment warning email in database:', error);
      console.log('📧 COMMENT WARNING EMAIL (Fallback):');
      console.log('   To:', email);
      console.log('   Name:', name);
      console.log('   Event:', eventTitle);
      return { sent: false, stored: false, error: error.message };
    }
  }

  console.log('📧 Attempting to send comment warning email...');
  console.log('   To:', email);
  console.log('   Subject: Comment Removed - Policy Violation Warning');

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Comment Removed - Policy Violation Warning - ${eventTitle}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Comment warning email sent successfully!');
    console.log('   Message ID:', info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send comment warning email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendCommentWarningEmail };


