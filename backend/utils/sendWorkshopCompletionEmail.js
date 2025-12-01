const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { generateCertificate } = require('./generateCertificate');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWorkshopCompletionEmail(email, name, workshopTitle, endDate, location, userType = 'Student') {
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
        <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">🎉 Congratulations on Completing the Workshop!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Congratulations! You have successfully completed the workshop. We hope you found it valuable and enriching.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Workshop</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${workshopTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Completion Date</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${formattedDate}</td>
        </tr>
        ${location ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Location</td>
          <td style="padding: 12px; border: 1px solid #e9ecef;">${location}</td>
        </tr>
        ` : ''}
      </table>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 20px;">
        <p style="margin: 0; color: #155724;">
          <strong>✓ Workshop Completed</strong><br>
          Thank you for your participation and commitment. We appreciate your dedication to learning and professional development.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>We hope this workshop has provided you with valuable insights and skills that you can apply in your academic and professional journey.</p>
        <p>Keep an eye out for more exciting workshops and events on the Bindly platform!</p>
        <p style="margin-top: 20px;">
          Best regards,<br>
          <strong>The Bindly Team</strong>
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Workshop Completion Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', email);
    console.log('   Name:', name);
    console.log('   Workshop:', workshopTitle);
    console.log('   Completion Date:', formattedDate);
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return { sent: false, reason: 'SMTP not configured' };
  }

  console.log('📧 Attempting to send workshop completion email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', email);
  console.log('   Subject: Congratulations on Completing -', workshopTitle);
  console.log('   User Type:', userType);

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <salmaahmed1504@gmail.com>`,
      to: email,
      subject: `🎉 Congratulations on Completing - ${workshopTitle}`,
      html: html,
      attachments: []
    };

    // Generate and attach certificate for TAs, Staff, Students, and Professors
    const eligibleForCertificate = ['TA', 'Staff', 'Student', 'Professor'].includes(userType);
    if (eligibleForCertificate) {
      try {
        console.log(`📜 Generating certificate for ${userType}:`, name);
        
        // Create certificates directory if it doesn't exist
        const certsDir = path.join(__dirname, '../certificates');
        if (!fs.existsSync(certsDir)) {
          fs.mkdirSync(certsDir, { recursive: true });
        }

        // Generate unique filename
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedWorkshop = workshopTitle.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = Date.now();
        const certFileName = `certificate_${sanitizedName}_${sanitizedWorkshop}_${timestamp}.pdf`;
        const certPath = path.join(certsDir, certFileName);

        // Generate certificate
        await generateCertificate(name, workshopTitle, new Date(endDate), certPath);

        // Attach certificate to email
        mailOptions.attachments.push({
          filename: `Certificate_${workshopTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          path: certPath
        });

        console.log('✅ Certificate generated and attached');

        // Update email HTML to mention certificate
        const updatedHtml = html.replace(
          '<p>Congratulations! You have successfully completed the workshop. We hope you found it valuable and enriching.</p>',
          `<p>Congratulations! You have successfully completed the workshop. We hope you found it valuable and enriching.</p>
          <p style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3; margin: 15px 0;">
            <strong>📜 Certificate of Attendance</strong><br>
            Your certificate of attendance has been attached to this email. Please find it in the attachments.
          </p>`
        );
        mailOptions.html = updatedHtml;

      } catch (certError) {
        console.error('⚠️  Failed to generate certificate, sending email without it:', certError.message);
        // Continue without certificate if generation fails
      }
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Workshop completion email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    
    // Clean up certificate file after sending (optional - you might want to keep them)
    if (mailOptions.attachments.length > 0 && mailOptions.attachments[0].path) {
      const certPath = mailOptions.attachments[0].path;
      // Delete after a delay to ensure email is sent
      setTimeout(() => {
        if (fs.existsSync(certPath)) {
          fs.unlinkSync(certPath);
          console.log('🗑️  Certificate file cleaned up:', certPath);
        }
      }, 5000);
    }
    
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send workshop completion email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    return { sent: false, error: error.message, code: error.code };
  }
}

module.exports = { sendWorkshopCompletionEmail };

