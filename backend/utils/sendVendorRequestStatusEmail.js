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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f6f7f8;">
        <div style="background-color: #1D3557; padding: 30px 20px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Bindly</h1>
          <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0; font-size: 14px;">GUC Events Platform</p>
        </div>
        
        <div style="padding: 0 20px 20px 20px;">
        
        <div style="background: #FFFFFF; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef;">
          <h2 style="color: #1D3557; margin-top: 0; font-size: 20px; font-weight: 600;">
            ${status.toLowerCase() === 'accepted' ? '✅' : status.toLowerCase() === 'rejected' ? '❌' : '⏳'} Vendor Request ${status.charAt(0).toUpperCase() + status.slice(1)}
          </h2>
          <p>Hi ${vendor.firstName || vendor.companyName || vendor.name || 'there'},</p>
          <p>Your request to participate in the <strong>${eventName}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${status.toLowerCase()}</span>.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e9ecef;">
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Event Type</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${request.eventType === 'bazaar' ? 'Bazaar' : request.eventType === 'booth' ? 'Booth' : request.eventType === 'standaloneBooth' ? 'Standalone Booth' : 'Platform Booth'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Event Name</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${eventName}</td>
          </tr>
          ${request.boothSize ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Booth Size</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${request.boothSize}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Status</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: ${statusColor}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
          </tr>
          ${request.participationFee ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Participation Fee</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${request.participationFee} EGP</td>
          </tr>
          ` : ''}
          ${request.paymentDeadline ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; background: #1D3557; color: #FFFFFF;">Payment Deadline</td>
            <td style="padding: 12px; border: 1px solid #e9ecef; color: #1D3557;">${new Date(request.paymentDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
          ` : ''}
        </table>

        ${status.toLowerCase() === 'accepted' ? `
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-weight: bold; font-size: 16px;">💰 Payment Required</p>
          <p style="margin: 8px 0 0 0; color: #856404;">
            Your participation has been approved! To confirm your participation, please complete the payment of <strong>${request.participationFee || 0} EGP</strong> within <strong>3 days</strong> (by ${request.paymentDeadline ? new Date(request.paymentDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the deadline'}). 
          </p>
          <p style="margin: 8px 0 0 0; color: #856404;">
            You can make the payment through your vendor dashboard. Failure to pay by the deadline may result in cancellation of your participation.
          </p>
        </div>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
          <p style="margin: 0; color: #2e7d32; font-weight: bold;">🎉 Congratulations!</p>
          <p style="margin: 8px 0 0 0; color: #558b2f;">Your participation request has been approved. Please complete the payment to confirm your participation.</p>
        </div>
        ` : status.toLowerCase() === 'rejected' ? `
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; margin-bottom: 20px;">
          <p style="margin: 0; color: #721c24;">
            <strong>Request Rejected</strong><br>
            Unfortunately, your request was not approved at this time. If you have questions, please contact the Events Office.
          </p>
        </div>
        ` : ''}
      
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>If you have any questions, please contact the Events Office at <strong>events@guc.edu.eg</strong></p>
          <p style="margin-top: 20px;">
            Best regards,<br>
            <strong>The Bindly Team</strong>
          </p>
        </div>
        </div>
      </div>
    `;

        const mailOptions = {
            from: process.env.SMTP_FROM || `Bindly <eyadomara202@gmail.com>`,
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
