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
      <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">📍 Event Details</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6B7280;">Event Type</p>
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1D3557;">${eventTypeDisplay}</p>
          </div>
          
          <div>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6B7280;">Booth Size</p>
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1D3557;">${receiptDetails.boothSize || 'Standard'}</p>
          </div>
        </div>
      </div>

      <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">⏱️ Duration</h3>
        <p style="margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; color: #1D3557;">${durationDisplay}</p>
      </div>

      <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">📌 Location</h3>
        <p style="margin: 0; font-size: 14px; font-weight: 600; line-height: 1.6; color: #1D3557;">${locationDisplay}</p>
      </div>
    `;
  }
  
  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f6f7f8;">
      <!-- Header -->
      <div style="background-color: #1D3557; padding: 30px 20px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Bindly</h1>
        <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0; font-size: 14px;">GUC Events Platform</p>
      </div>
      
      <!-- Content Container -->
      <div style="background-color: #FFFFFF; margin: 20px; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <!-- Success Box -->
        <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1D3557; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">✓ Payment Receipt</h2>
          <p style="color: #1D3557; margin: 8px 0; font-size: 14px; line-height: 1.6;">Hi ${name || 'there'},</p>
          <p style="color: #1D3557; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">Thank you for your payment. Your transaction has been completed successfully.</p>
        </div>

        <!-- Payment Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Event</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Amount Paid</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #457B9D; font-size: 16px; font-weight: 700; border: none;">${formattedAmount} EGP</td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Payment Method</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${paymentMethodDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Payment Date</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${formattedDate}</td>
          </tr>
        </table>

        ${detailsHTML}

        <!-- Confirmation Notice -->
        <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 18px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0; color: #1D3557; font-size: 14px; line-height: 1.6;">
            <strong style="font-size: 15px; color: #1D3557;">✓ Payment Confirmed</strong><br>
            Your participation fee has been paid successfully. We look forward to seeing you at the event!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f6f7f8; color: #666; font-size: 14px; line-height: 1.6;">
          <p style="margin: 0 0 15px 0;">If you have any questions, please contact the event organizers.</p>
          <p style="margin: 20px 0 0 0; color: #1D3557;">
            Best regards,<br>
            <strong style="color: #1D3557; font-size: 15px;">The Bindly Team</strong>
          </p>
        </div>
      </div>
      
      <!-- Bottom Spacer -->
      <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Bindly. All rights reserved.</p>
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

