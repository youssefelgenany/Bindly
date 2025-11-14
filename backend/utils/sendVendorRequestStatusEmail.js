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

/**
 * Send email notification to vendor about their request status
 * @param {Object} vendor - Vendor user object with email
 * @param {Object} request - The vendor request object
 * @param {String} status - The new status (accepted, rejected, cancelled, etc.)
 * @returns {Promise<Object>} Result object with sent/stored status
 */
async function sendVendorRequestStatusEmail(vendor, request, status) {
    try {
        if (!vendor || !vendor.email) {
            return { sent: false, stored: false, error: 'Vendor email not found' };
        }

        // Determine message based on status
        let statusMessage = '';
        let statusColor = '#666';
        let actionText = '';

        switch (status.toLowerCase()) {
            case 'accepted':
                statusMessage = 'Your vendor participation request has been ACCEPTED!';
                statusColor = '#27ae60';
                actionText = request.paymentDeadline
                    ? `Please note: A participation fee of ${request.participationFee || 'TBD'} EGP is due by ${new Date(request.paymentDeadline).toLocaleDateString()}.`
                    : 'Please await further instructions regarding the participation fee.';
                break;
            case 'rejected':
                statusMessage = 'Your vendor participation request has been REJECTED.';
                statusColor = '#d32f2f';
                actionText = 'If you have any questions, please contact the Events Office.';
                break;
            case 'cancelled':
                statusMessage = 'Your vendor participation request has been CANCELLED.';
                statusColor = '#f57c00';
                actionText = 'If you have any questions, please contact the Events Office.';
                break;
            case 'pending':
                statusMessage = 'Your vendor participation request is under review.';
                statusColor = '#1976d2';
                actionText = 'We will notify you once a decision has been made.';
                break;
            default:
                statusMessage = `Your vendor participation request status: ${status}`;
        }

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
          <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: ${statusColor}; margin-top: 0;">${statusMessage}</h2>
          <p>Hi ${vendor.name || 'there'},</p>
          <p>${actionText}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Event</td>
            <td style="padding: 12px; border: 1px solid #e9ecef;">${request.event?.title || request.eventId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Status</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: ${statusColor}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
          </tr>
          ${request.participationFee ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Participation Fee</td>
            <td style="padding: 12px; border: 1px solid #e9ecef;">${request.participationFee} EGP</td>
          </tr>
          ` : ''}
          ${request.paymentDeadline ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #f8f9fa;">Payment Deadline</td>
            <td style="padding: 12px; border: 1px solid #e9ecef;">${new Date(request.paymentDeadline).toLocaleDateString()}</td>
          </tr>
          ` : ''}
        </table>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">If you have any questions, please contact the Events Office at events@guc.edu.eg</p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Bindly - GUC Events Platform. All rights reserved.</p>
        </div>
      </div>
    `;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: vendor.email,
            subject: `Vendor Request Update: ${statusMessage.split('!')[0]}`,
            html
        };

        // Try to send email
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent successfully to ${vendor.email}:`, info.messageId);
                return { sent: true, stored: false };
            } catch (emailError) {
                console.warn(`⚠️ Could not send email to ${vendor.email}:`, emailError.message);
                // Email failed, but don't throw - the status update succeeded
                return { sent: false, stored: false, emailError: emailError.message };
            }
        } else {
            console.log('⚠️ Email service not configured (SMTP not set up)');
            return { sent: false, stored: false };
        }
    } catch (error) {
        console.error('❌ Error in sendVendorRequestStatusEmail:', error);
        return { sent: false, stored: false, error: error.message };
    }
}

module.exports = {
    sendVendorRequestStatusEmail
};
