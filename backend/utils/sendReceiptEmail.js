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

async function sendReceiptEmail(email, name, eventTitle, amount, paymentMethod, date) {
  const formattedAmount = Number(amount).toFixed(2);
  const paymentMethodDisplay = paymentMethod === 'wallet' ? 'Wallet Balance' : 'Credit/Debit Card';
  const formattedDate = new Date(date).toLocaleString('en-US', {
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
        <h2 style="color: #333; margin-top: 0;">Payment Receipt</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for your payment. Your transaction has been completed successfully.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Event</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${eventTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Amount Paid</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; color: #27ae60;">${formattedAmount} EGP</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Payment Method</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${paymentMethodDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Payment Date</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${formattedDate}</td>
        </tr>
      </table>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 20px;">
        <p style="margin: 0; color: #155724;">
          <strong>✓ Payment Confirmed</strong><br>
          Your registration is now confirmed. We look forward to seeing you at the event!
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>If you have any questions, please contact the event organizers.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Payment Receipt - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', email);
    console.log('   Name:', name);
    console.log('   Event:', eventTitle);
    console.log('   Amount:', formattedAmount, 'EGP');
    console.log('   Method:', paymentMethodDisplay);
    console.log('   Date:', formattedDate);
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return { sent: false, reason: 'SMTP not configured' };
  }

  console.log('📧 Attempting to send payment receipt email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', email);
  console.log('   Subject: Payment Receipt -', eventTitle);

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Payment Receipt - ${eventTitle}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment receipt email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send payment receipt email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    console.error('   Full Error:', error);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendReceiptEmail };

