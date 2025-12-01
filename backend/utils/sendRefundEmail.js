const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendRefundEmail(email, name, eventTitle, amount, refundDate) {
  const formattedAmount = Number(amount).toFixed(2);
  const formattedDate = new Date(refundDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Registration Cancelled - Refund Processed</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your registration cancellation has been processed and your refund has been credited to your wallet.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Event</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${eventTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Refund Amount</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; color: #27ae60;">${formattedAmount} EGP</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Refund Date</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Refund Method</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">Wallet Credit</td>
        </tr>
      </table>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 20px;">
        <p style="margin: 0; color: #155724;">
          <strong>✓ Refund Confirmed</strong><br>
          The refund amount has been credited to your wallet balance. You can use this balance for future event registrations.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>If you have any questions about this refund, please contact the event organizers.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Refund Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', email);
    console.log('   Name:', name);
    console.log('   Event:', eventTitle);
    console.log('   Refund Amount:', formattedAmount, 'EGP');
    console.log('   Date:', formattedDate);
    return { sent: false, reason: 'SMTP not configured' };
  }

  console.log('📧 Attempting to send refund email...');
  console.log('   To:', email);
  console.log('   Subject: Registration Cancelled - Refund Processed');

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <salmaahmed1504@gmail.com>`,
      to: email,
      subject: `Registration Cancelled - Refund Processed - ${eventTitle}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Refund email sent successfully!');
    console.log('   Message ID:', info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send refund email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendRefundEmail };

