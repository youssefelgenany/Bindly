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
  const sentAt = new Date().toUTCString();

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Comment Removed - Policy Violation Warning</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F6FB;font-family:'Manrope','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6FB;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#FFFFFF;border-radius:24px;border:1px solid #E3E8F4;box-shadow:0 18px 45px rgba(16,24,40,0.12);overflow:hidden;">
            <tr>
              <td style="padding:32px;background:linear-gradient(120deg,#EF4444,#DC2626);color:#FFFFFF;">
                <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.02em;">Bindly</p>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">GUC Events Platform</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 32px;">
                <div style="display:flex;justify-content:center;">
                  <div style="width:64px;height:64px;border-radius:20px;background-color:#FEE2E2;border:2px solid #FECACA;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </div>
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;text-align:center;">Action Required</p>
                <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1D3557;text-align:center;letter-spacing:-0.01em;">Comment Removed - Policy Violation</p>
                <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
                  Hi ${name || "there"}, we wanted to inform you that one of your comments has been removed from our platform for violating our community guidelines.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #E2E8F0;border-radius:18px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1D3557;">Event</p>
                      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;">${eventTitle}</p>
                      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1D3557;">Removed Comment</p>
                      <p style="margin:0 0 16px;font-size:14px;color:#6B7280;font-style:italic;line-height:1.6;background-color:#F9FAFB;padding:12px;border-radius:8px;">${commentText ? (commentText.length > 200 ? commentText.substring(0, 200) + '...' : commentText) : 'N/A'}</p>
                      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#EF4444;">Reason</p>
                      <p style="margin:0;font-size:15px;color:#DC2626;font-weight:500;">Inappropriate Content</p>
                    </td>
                  </tr>
                </table>
                <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:16px;padding:18px 20px;margin:6px 0 24px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#991B1B;">⚠️ Important Notice</p>
                  <p style="margin:0;font-size:13px;color:#991B1B;line-height:1.6;">
                    Please ensure that all your future comments comply with our community guidelines. Repeated violations may result in further action, including account restrictions.
                  </p>
                </div>
                <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:16px;padding:18px 20px;margin:6px 0 24px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1E40AF;">Community Guidelines</p>
                  <ul style="margin:0;padding-left:20px;color:#1E40AF;font-size:13px;line-height:1.8;">
                    <li>Be respectful and courteous to all members</li>
                    <li>Avoid offensive, discriminatory, or inappropriate language</li>
                    <li>Keep comments relevant to the event</li>
                    <li>Do not spam or post repetitive content</li>
                  </ul>
                </div>
                <p style="margin:0 0 10px;font-size:13px;color:#6B7280;">
                  If you believe this removal was made in error, please contact our support team.
                </p>
                <p style="margin:0;font-size:13px;color:#6B7280;">
                  Best regards,<br />
                  <strong>The Bindly Team</strong>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;">
            Sent at ${sentAt}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const textBody = [
    `Hi ${name || 'there'},`,
    "",
    "We wanted to inform you that one of your comments has been removed from our platform for violating our community guidelines.",
    "",
    `Event: ${eventTitle}`,
    `Removed Comment: ${commentText ? (commentText.length > 200 ? commentText.substring(0, 200) + '...' : commentText) : 'N/A'}`,
    `Reason: Inappropriate Content`,
    "",
    "⚠️ Important Notice:",
    "Please ensure that all your future comments comply with our community guidelines. Repeated violations may result in further action, including account restrictions.",
    "",
    "Community Guidelines:",
    "• Be respectful and courteous to all members",
    "• Avoid offensive, discriminatory, or inappropriate language",
    "• Keep comments relevant to the event",
    "• Do not spam or post repetitive content",
    "",
    "If you believe this removal was made in error, please contact our support team.",
    "",
    "Best regards,",
    "The Bindly Team",
    "",
    `Sent at: ${sentAt}`
  ].join('\n');

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
      text: textBody,
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
