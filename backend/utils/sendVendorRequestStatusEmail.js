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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
          <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
        </div>
        
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: white; margin-top: 0; margin-bottom: 10px;">
            ${status.toLowerCase() === 'accepted' ? '✅' : status.toLowerCase() === 'rejected' ? '❌' : '⏳'} Vendor Request ${status.charAt(0).toUpperCase() + status.slice(1)}
          </h2>
          <p style="color: #ccc; margin: 0;">Hi ${vendor.firstName || vendor.companyName || vendor.name || 'there'},</p>
          <p style="color: #ccc; margin: 10px 0;">
            Your request to participate in the <strong>${eventName}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${status.toLowerCase()}</span>.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Request Details</h3>
          
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Event Type:</span>
            <span style="color: #666;">${request.eventType === 'bazaar' ? 'Bazaar' : request.eventType === 'booth' ? 'Booth' : request.eventType === 'standaloneBooth' ? 'Standalone Booth' : 'Platform Booth'}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Event Name:</span>
            <span style="color: #666;">${eventName}</span>
          </div>
          
          ${request.boothSize ? `
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Booth Size:</span>
            <span style="color: #666;">${request.boothSize}</span>
          </div>
          ` : ''}
          
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Status:</span>
            <span style="color: ${statusColor}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>

          ${request.participationFee ? `
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Participation Fee:</span>
            <span style="color: #666;">${request.participationFee} EGP</span>
          </div>
          ` : ''}

          ${request.paymentDeadline ? `
          <div style="margin-bottom: 0;">
            <span style="display: inline-block; width: 140px; font-weight: bold; color: #333;">Payment Deadline:</span>
            <span style="color: #666;">${new Date(request.paymentDeadline).toLocaleDateString()}</span>
          </div>
          ` : ''}
        </div>

        ${status.toLowerCase() === 'accepted' ? `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
          <p style="margin: 0; color: #2e7d32; font-weight: bold;">🎉 Congratulations!</p>
          <p style="margin: 8px 0 0 0; color: #558b2f;">Your participation has been approved. Please complete the payment to confirm your participation.</p>
        </div>
        ` : status.toLowerCase() === 'rejected' ? `
        <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d32f2f;">
          <p style="margin: 0; color: #c62828; font-weight: bold;">Request Status</p>
          <p style="margin: 8px 0 0 0; color: #d32f2f;">Unfortunately, your request was not approved at this time. If you have questions, please contact the Events Office.</p>
        </div>
        ` : ''}

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">If you have any questions, please contact the Events Office at <strong>events@guc.edu.eg</strong></p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Bindly - GUC Events Platform. All rights reserved.</p>
        </div>
      </div>
    `;

        const mailOptions = {
            from: process.env.SMTP_FROM || `Bindly <salma.husseinhassan@student.guc.edu.eg>`,
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
