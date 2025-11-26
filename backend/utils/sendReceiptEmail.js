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

async function sendReceiptEmail(email, name, eventTitle, amount, paymentMethod, date, receiptDetails = {}) {
  const formattedAmount = Number(amount).toFixed(2);
  const paymentMethodDisplay = paymentMethod === 'wallet' ? 'Wallet Balance' : 'Credit/Debit Card';
  const formattedDate = new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build details HTML if receiptDetails provided
  let detailsHTML = '';
  if (receiptDetails && Object.keys(receiptDetails).length > 0) {
    // Format location name
    let locationDisplay = 'TBD';
    if (receiptDetails.boothLocation) {
      locationDisplay = receiptDetails.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Calculate duration details
    let durationDisplay = 'N/A';
    if (receiptDetails.durationWeeks) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + receiptDetails.durationWeeks * 7 * 24 * 60 * 60 * 1000);
      const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      durationDisplay = `${receiptDetails.durationWeeks} week${receiptDetails.durationWeeks !== 1 ? 's' : ''} (${startStr} - ${endStr})`;
    }

    // Event type mapping
    const eventTypeMap = {
      'bazaar': 'Bazaar',
      'booth': 'Booth',
      'standaloneBooth': 'Standalone Booth',
      'platformBooth': 'Platform Booth'
    };
    const eventTypeDisplay = eventTypeMap[receiptDetails.eventType] || receiptDetails.eventType;

    detailsHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
        <h3 style="color: white; margin-top: 0; margin-bottom: 15px; font-size: 16px;">📍 Event Details</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 0 0 5px 0; font-size: 12px; opacity: 0.9;">Event Type</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${eventTypeDisplay}</p>
          </div>
          
          <div>
            <p style="margin: 0 0 5px 0; font-size: 12px; opacity: 0.9;">Booth Size</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${receiptDetails.boothSize || 'Standard'}</p>
          </div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
        <h3 style="color: white; margin-top: 0; margin-bottom: 15px; font-size: 16px;">⏱️ Duration</h3>
        <p style="margin: 0; font-size: 14px; font-weight: bold; line-height: 1.6;">${durationDisplay}</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
        <h3 style="color: white; margin-top: 0; margin-bottom: 15px; font-size: 16px;">📌 Location</h3>
        <p style="margin: 0; font-size: 14px; font-weight: bold; line-height: 1.6;">${locationDisplay}</p>
      </div>
    `;
  } const html = `
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

      ${detailsHTML}

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 20px;">
        <p style="margin: 0; color: #155724;">
          <strong>✓ Payment Confirmed</strong><br>
          Your participation fee has been paid successfully. We look forward to seeing you at the event!
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
  console.log('📧 [Email Debug] Checking SMTP configuration...');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST ? '✓ Set' : '✗ Missing');
  console.log('   SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');
  console.log('   SMTP_PORT:', process.env.SMTP_PORT || 587);

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
  console.log('   To Email:', email);
  console.log('   Subject: Payment Receipt -', eventTitle);

  try {
    console.log('🔐 Verifying SMTP transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Payment Receipt - ${eventTitle}`,
      html: html
    };

    console.log('📤 Sending mail with options:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment receipt email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   Subject:', mailOptions.subject);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send payment receipt email:');
    console.error('   Error Message:', error.message);
    console.error('   Error Code:', error.code);
    if (error.response) {
      console.error('   Error Response:', error.response);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendReceiptEmail };

