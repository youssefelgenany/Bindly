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

async function sendGymEditEmail(
  email,
  name,
  sessionType,
  oldDate,
  oldTime,
  newDate,
  newTime,
  oldLocation,
  newLocation,
  additionalChanges = []
) {
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    if (typeof timeString === 'string' && timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const changes = [];

  const pushChange = (label, before, after) => {
    const formattedBefore = before === undefined || before === null || before === ''
      ? 'Not specified'
      : before;
    const formattedAfter = after === undefined || after === null || after === ''
      ? 'Not specified'
      : after;

    if (formattedBefore === formattedAfter) {
      return;
    }

    changes.push({
      label: label || 'Change',
      before: formattedBefore,
      after: formattedAfter
    });
  };

  if (oldDate && newDate && new Date(oldDate).getTime() !== new Date(newDate).getTime()) {
    pushChange('Date', formatDate(oldDate), formatDate(newDate));
  }
  if (oldTime && newTime && oldTime !== newTime) {
    pushChange('Time', formatTime(oldTime), formatTime(newTime));
  }
  if (oldLocation && newLocation && oldLocation !== newLocation) {
    pushChange('Location', oldLocation, newLocation);
  }

  if (Array.isArray(additionalChanges) && additionalChanges.length > 0) {
    additionalChanges.forEach(change => {
      if (!change) return;
      pushChange(
        change.label,
        change.before,
        change.after
      );
    });
  }

  if (changes.length === 0) {
    // No significant changes, don't send email
    return { sent: false, reason: 'No significant changes detected' };
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
        <!-- Alert Box -->
        <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1D3557; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">⚠️ Gym Session Updated</h2>
          <p style="color: #1D3557; margin: 8px 0; font-size: 14px; line-height: 1.6;">Hi ${name || 'there'},</p>
          <p style="color: #1D3557; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">We wanted to inform you that a gym session you registered for has been updated. Please review the changes below:</p>
        </div>

        <!-- Session Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Session Type</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${sessionType ? sessionType.charAt(0).toUpperCase() + sessionType.slice(1) : 'Gym Session'}</td>
          </tr>
          ${changes.map(change => `
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">${change.label || 'Change'}</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">
              <span style="text-decoration: line-through; color: #999; margin-right: 8px;">${change.before}</span>
              <span style="color: #457B9D; font-weight: 600;">→ ${change.after}</span>
            </td>
          </tr>
          `).join('')}
          ${newDate ? `
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Updated Date</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${formatDate(newDate)}</td>
          </tr>
          ` : ''}
          ${newTime ? `
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Updated Time</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${formatTime(newTime)}</td>
          </tr>
          ` : ''}
          ${newLocation ? `
          <tr>
            <td style="padding: 14px 16px; background: #1D3557; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none;">Location</td>
            <td style="padding: 14px 16px; background: #f6f7f8; color: #1D3557; font-size: 14px; border: none;">${newLocation}</td>
          </tr>
          ` : ''}
        </table>

        <!-- Important Notice -->
        <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 18px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0; color: #1D3557; font-size: 14px; line-height: 1.6;">
            <strong style="font-size: 15px; color: #1D3557;">📅 Important:</strong><br>
            Please make note of the updated session details. If you have any questions or concerns, please contact the events office.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f6f7f8; color: #666; font-size: 14px; line-height: 1.6;">
          <p style="margin: 0 0 15px 0;">If you are no longer able to attend due to these changes, you can cancel your registration from your account.</p>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Gym Edit Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', email);
    console.log('   Name:', name);
    console.log('   Session:', sessionType);
    console.log('   Changes:', changes.map(change => `${change.label}: ${change.before} → ${change.after}`).join('; '));
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return { sent: false, reason: 'SMTP not configured' };
  }

  console.log('📧 Attempting to send gym session edit email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', email);
  console.log('   Subject: Gym Session Updated -', sessionType);

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Gym Session Updated - ${sessionType ? sessionType.charAt(0).toUpperCase() + sessionType.slice(1) : 'Gym Session'}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Gym session edit email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send gym session edit email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendGymEditEmail };

