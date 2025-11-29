const nodemailer = require('nodemailer');
const Email = require('../models/EmailModel');

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

        // Determine status color based on status
        let statusColor = '#666';
        switch (status.toLowerCase()) {
            case 'accepted':
                statusColor = '#27ae60';
                break;
            case 'rejected':
                statusColor = '#d32f2f';
                break;
            case 'cancelled':
                statusColor = '#f57c00';
                break;
            case 'pending':
                statusColor = '#1976d2';
                break;
        }

        // Get event name based on event type
        let eventName = 'Event';
        if (request.bazaar) {
            eventName = request.bazaar.title || request.bazaar.name || 'Bazaar';
        } else if (request.booth) {
            eventName = request.booth.title || request.booth.name || 'Booth';
        } else if (request.standaloneBooth) {
            eventName = request.standaloneBooth.title || request.standaloneBooth.name || 'Standalone Booth';
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
          <!-- Status Box -->
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1D3557; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">
              ${status.toLowerCase() === 'accepted' ? '✅' : status.toLowerCase() === 'rejected' ? '❌' : '⏳'} Vendor Request ${status.charAt(0).toUpperCase() + status.slice(1)}
            </h2>
            <p style="color: #1D3557; margin: 8px 0; font-size: 14px; line-height: 1.6;">Hi ${vendor.firstName || vendor.companyName || vendor.name || 'there'},</p>
            <p style="color: #1D3557; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">
              Your request to participate in the <strong>${eventName}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${status.toLowerCase()}</span>.
            </p>
          </div>

          <!-- Request Details -->
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Request Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px; width: 140px;">Event Type:</td>
                <td style="padding: 8px 0; color: #1D3557; font-size: 14px;">${request.eventType === 'bazaar' ? 'Bazaar' : request.eventType === 'booth' ? 'Booth' : request.eventType === 'standaloneBooth' ? 'Standalone Booth' : 'Platform Booth'}</td>
              </tr>
              
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px;">Event Name:</td>
                <td style="padding: 8px 0; color: #1D3557; font-size: 14px;">${eventName}</td>
              </tr>
              
              ${request.boothSize ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px;">Booth Size:</td>
                <td style="padding: 8px 0; color: #1D3557; font-size: 14px;">${request.boothSize}</td>
              </tr>
              ` : ''}
              
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px;">Status:</td>
                <td style="padding: 8px 0; color: ${statusColor}; font-weight: bold; font-size: 14px;">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
              </tr>

              ${request.participationFee ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px;">Participation Fee:</td>
                <td style="padding: 8px 0; color: #1D3557; font-size: 14px;">${request.participationFee} EGP</td>
              </tr>
              ` : ''}

              ${request.paymentDeadline ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #1D3557; font-size: 14px;">Payment Deadline:</td>
                <td style="padding: 8px 0; color: #1D3557; font-size: 14px;">${new Date(request.paymentDeadline).toLocaleDateString()}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${status.toLowerCase() === 'accepted' ? `
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1D3557; font-size: 14px; line-height: 1.6;">
              <strong style="font-size: 15px; color: #1D3557;">🎉 Congratulations!</strong><br>
              Your participation has been approved. Please complete the payment to confirm your participation.
            </p>
          </div>
          ` : status.toLowerCase() === 'rejected' ? `
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1D3557; font-size: 14px; line-height: 1.6;">
              <strong style="font-size: 15px; color: #1D3557;">Request Status</strong><br>
              Unfortunately, your request was not approved at this time. If you have questions, please contact the Events Office.
            </p>
          </div>
          ` : ''}

          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 18px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0; color: #1D3557; font-size: 14px; line-height: 1.6;">
              If you have any questions, please contact the Events Office at <strong>events@guc.edu.eg</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f6f7f8; color: #666; font-size: 14px; line-height: 1.6;">
            <p style="margin: 20px 0 0 0; color: #1D3557;">
              Best regards,<br>
              <strong style="color: #1D3557; font-size: 15px;">The Bindly Team</strong>
            </p>
          </div>
        </div>
        
        <!-- Bottom Spacer -->
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Bindly - GUC Events Platform. All rights reserved.</p>
        </div>
      </div>
    `;

        const mailOptions = {
            from: `Bindly <${process.env.SMTP_USER}>`,
            to: vendor.email,
            subject: `Your ${eventName} Request Has Been ${status.charAt(0).toUpperCase() + status.slice(1)} - Event`,
            html
        };

        // Try to send email
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent successfully to ${vendor.email}:`, info.messageId);

                // Store copy in dev DB
                try {
                    const emailDoc = new Email({
                        userInfo: {
                            name: vendor.firstName || vendor.companyName || vendor.name || 'Unknown',
                            userType: 'Vendor',
                            email: vendor.email
                        },
                        to: vendor.email,
                        subject: mailOptions.subject,
                        html,
                        sentAt: new Date()
                    });
                    await emailDoc.save();
                    console.log(`✅ Stored sent email in dev DB: ${emailDoc._id}`);
                } catch (dbError) {
                    console.warn(`⚠️ Could not store email in dev DB:`, dbError.message);
                }

                return { sent: true, stored: true, messageId: info.messageId };
            } catch (emailError) {
                console.warn(`⚠️ Could not send email to ${vendor.email}:`, emailError.message);

                // Store in DB as fallback
                try {
                    const emailDoc = new Email({
                        userInfo: {
                            name: vendor.firstName || vendor.companyName || vendor.name || 'Unknown',
                            userType: 'Vendor',
                            email: vendor.email
                        },
                        to: vendor.email,
                        subject: mailOptions.subject,
                        html,
                        sentAt: new Date()
                    });
                    await emailDoc.save();
                    console.log(`✅ Stored unsent email in dev DB (fallback): ${emailDoc._id}`);
                    return { sent: false, stored: true, emailError: emailError.message };
                } catch (dbError) {
                    console.error(`❌ Could not store email in dev DB:`, dbError.message);
                    return { sent: false, stored: false, emailError: emailError.message, dbError: dbError.message };
                }
            }
        } else {
            console.log('⚠️ Email service not configured (SMTP not set up)');

            // Store in DB
            try {
                const emailDoc = new Email({
                    userInfo: {
                        name: vendor.firstName || vendor.companyName || vendor.name || 'Unknown',
                        userType: 'Vendor',
                        email: vendor.email
                    },
                    to: vendor.email,
                    subject: mailOptions.subject,
                    html,
                    sentAt: new Date()
                });
                await emailDoc.save();
                console.log(`✅ Stored email in dev DB (SMTP not configured): ${emailDoc._id}`);
                return { sent: false, stored: true };
            } catch (dbError) {
                console.error(`❌ Could not store email in dev DB:`, dbError.message);
                return { sent: false, stored: false, dbError: dbError.message };
            }
        }
    } catch (error) {
        console.error('❌ Error in sendVendorRequestStatusEmail:', error);
        return { sent: false, stored: false, error: error.message };
    }
}

module.exports = {
    sendVendorRequestStatusEmail
};
