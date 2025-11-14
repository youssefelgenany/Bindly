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
 * Send QR codes to vendor for all registered visitors
 * @param {Object} vendor - Vendor object with email
 * @param {Object} event - Event/Bazaar/Booth object
 * @param {Array} registrations - Array of registration objects with QR codes
 * @returns {Promise<Object>} Result object
 */
async function sendQRCodesToVendor(vendor, event, registrations = []) {
    try {
        if (!vendor || !vendor.email) {
            return {
                sent: false,
                stored: false,
                error: 'Vendor email not found'
            };
        }

        if (!registrations || registrations.length === 0) {
            return {
                sent: false,
                stored: false,
                error: 'No registrations with QR codes found'
            };
        }

        // Filter registrations with QR codes
        const registrationsWithQR = registrations.filter(reg => reg.qrCode);

        if (registrationsWithQR.length === 0) {
            return {
                sent: false,
                stored: false,
                error: 'No registrations have QR codes generated'
            };
        }

        // Create HTML table with QR codes
        const qrCodesHTML = registrationsWithQR.map((registration, index) => {
            const user = registration.user || {};
            return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">${user.firstName || 'N/A'} ${user.lastName || ''}</td>
          <td style="padding: 12px;">${user.email || 'N/A'}</td>
          <td style="padding: 12px; text-align: center;">
            <img src="${registration.qrCode}" alt="QR Code" style="width: 100px; height: 100px; border: 1px solid #ddd; padding: 5px;" />
          </td>
        </tr>
      `;
        }).join('');

        const vendorName = vendor.companyName || `${vendor.firstName} ${vendor.lastName}`;
        const eventName = event.name || event.title || 'Event';
        const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD';

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d32f2f; margin: 0;">Bindly</h1>
          <p style="color: #666; margin: 5px 0;">GUC Events Platform</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Visitor QR Codes for Your Event</h2>
          <p>Hi ${vendorName},</p>
          <p>Great news! We have generated QR codes for all registered visitors to your bazaar/booth. You can use these QR codes to verify attendance at your event.</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef;">
          <h3 style="color: #333; margin-top: 0;">Event Details</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 150px;">Event Name:</td>
              <td style="padding: 8px;">${eventName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Event Date:</td>
              <td style="padding: 8px;">${eventDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Total Visitors:</td>
              <td style="padding: 8px; font-weight: bold; color: #27ae60;">${registrationsWithQR.length}</td>
            </tr>
          </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef;">
          <h3 style="color: #333; margin-top: 0;">Registered Visitors</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e9ecef;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; text-align: center;">#</th>
                <th style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold;">Name</th>
                <th style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold;">Email</th>
                <th style="padding: 12px; border: 1px solid #e9ecef; font-weight: bold; text-align: center;">QR Code</th>
              </tr>
            </thead>
            <tbody>
              ${qrCodesHTML}
            </tbody>
          </table>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>How to use QR codes:</strong> You can scan these QR codes at your event to verify visitor attendance. 
            Each QR code contains the visitor's name, email, and registration ID.
          </p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Bindly - GUC Events Platform. All rights reserved.</p>
        </div>
      </div>
    `;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: vendor.email,
            subject: `Visitor QR Codes - ${eventName}`,
            html
        };

        // Try to send email
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ QR codes email sent to vendor ${vendor.email}:`, info.messageId);
                // Store a copy in dev email DB for visibility even when SMTP is configured
                try {
                    const saved = await Email.create({
                        to: vendor.email,
                        subject: mailOptions.subject,
                        html: mailOptions.html,
                        verificationToken: '',
                        verificationUrl: '',
                        sentAt: new Date(),
                        isRead: false,
                        userInfo: {
                            name: vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim(),
                            userType: 'Vendor',
                            email: vendor.email
                        }
                    });
                    console.log('✅ Stored sent email in dev DB:', saved._id);
                } catch (storeErr) {
                    console.error('❌ Failed to store sent email in dev DB:', storeErr.message);
                }
                return {
                    sent: true,
                    stored: true,
                    messageId: info.messageId
                };
            } catch (emailError) {
                console.warn(`⚠️ Could not send email to vendor ${vendor.email}:`, emailError.message);
                // Try to store the email in dev DB as a fallback
                try {
                    const saved = await Email.create({
                        to: vendor.email,
                        subject: mailOptions.subject,
                        html: mailOptions.html,
                        verificationToken: '',
                        verificationUrl: '',
                        sentAt: new Date(),
                        isRead: false,
                        userInfo: {
                            name: vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim(),
                            userType: 'Vendor',
                            email: vendor.email
                        }
                    });
                    console.log('✅ Email stored in dev DB as fallback:', saved._id);
                    return { sent: false, stored: true, id: saved._id };
                } catch (storeErr) {
                    console.error('❌ Failed to store fallback email:', storeErr.message);
                    return { sent: false, stored: false, reason: emailError.message };
                }
            }
        } else {
            console.log('⚠️ Email service not configured (SMTP not set up) - storing email to dev DB');
            try {
                const saved = await Email.create({
                    to: vendor.email,
                    subject: mailOptions.subject,
                    html: mailOptions.html,
                    verificationToken: '',
                    verificationUrl: '',
                    sentAt: new Date(),
                    isRead: false,
                    userInfo: {
                        name: vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim(),
                        userType: 'Vendor',
                        email: vendor.email
                    }
                });
                console.log('✅ QR codes email stored in dev DB for vendor:', vendor.email);
                return { sent: false, stored: true, id: saved._id };
            } catch (storeErr) {
                console.error('❌ Failed to store email in dev DB:', storeErr.message);
                return { sent: false, stored: false, reason: storeErr.message };
            }
        }
    } catch (error) {
        console.error('❌ Error in sendQRCodesToVendor:', error);
        return {
            sent: false,
            stored: false,
            error: error.message
        };
    }
}

module.exports = {
    sendQRCodesToVendor
};
