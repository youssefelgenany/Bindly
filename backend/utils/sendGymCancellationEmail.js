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

async function sendGymCancellationEmail(email, name, sessionType, sessionDate, sessionTime, location) {
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f6f7f8;">
      <div style="background-color: #1D3557; padding: 30px 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Bindly</h1>
        <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0; font-size: 14px;">GUC Events Platform</p>
      </div>
      
      <div style="padding: 0 20px 20px 20px;">
      
      <div style="background: #FFFFFF; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef;">
        <h2 style="color: #1D3557; margin-top: 0; font-size: 20px; font-weight: 600;">Gym Session Cancelled</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We regret to inform you that a gym session you registered for has been cancelled.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Session Type</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${sessionType}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Date</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Time</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${sessionTime}</td>
        </tr>
        ${location ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Location</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${location}</td>
        </tr>
        ` : ''}
      </table>

      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Session Cancelled</strong><br>
          Your registration for this gym session has been automatically cancelled. We apologize for any inconvenience this may cause.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>You can browse other available gym sessions on the Bindly platform.</p>
        <p>If you have any questions, please contact the gym administration.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Gym Cancellation Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', email);
    console.log('   Name:', name);
    console.log('   Session Type:', sessionType);
    console.log('   Date:', formattedDate);
    console.log('   Time:', sessionTime);
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return { sent: false, reason: 'SMTP not configured' };
  }

  console.log('📧 Attempting to send gym session cancellation email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', email);
  console.log('   Subject: Gym Session Cancelled -', sessionType);

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <eyadomara202@gmail.com>`,
      to: email,
      subject: `Gym Session Cancelled - ${sessionType}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Gym session cancellation email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send gym session cancellation email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendGymCancellationEmail };

