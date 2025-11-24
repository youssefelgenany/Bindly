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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h2 style="color: #856404; margin-top: 0;">⚠️ Gym Session Updated</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We wanted to inform you that a gym session you registered for has been updated. Please review the changes below:</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Session Type</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${sessionType ? sessionType.charAt(0).toUpperCase() + sessionType.slice(1) : 'Gym Session'}</td>
        </tr>
        ${changes.map(change => `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">${change.label || 'Change'}</td>
          <td style="padding: 12px; border: 1px solid #e9ecef; color: #d32f2f;">${change.before} → ${change.after}</td>
        </tr>
        `).join('')}
        ${newDate ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Updated Date</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${formatDate(newDate)}</td>
        </tr>
        ` : ''}
        ${newTime ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Updated Time</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${formatTime(newTime)}</td>
        </tr>
        ` : ''}
        ${newLocation ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Location</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${newLocation}</td>
        </tr>
        ` : ''}
      </table>

      <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460; margin-bottom: 20px;">
        <p style="margin: 0; color: #0c5460;">
          <strong>📅 Important:</strong><br>
          Please make note of the updated session details. If you have any questions or concerns, please contact the events office.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>If you are no longer able to attend due to these changes, you can cancel your registration from your account.</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
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

