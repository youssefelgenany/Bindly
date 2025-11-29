const nodemailer = require('nodemailer');
const Email = require('../models/EmailModel');
const { Buffer } = require('buffer');

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
 * Send QR codes to vendor
 * @param {Object} vendor - Vendor object with email
 * @param {Object} event - Event/Bazaar/Booth object
 * @param {Array} registrations - Array of registration objects with QR codes (for event participants)
 * @param {Object} vendorQRCode - Optional: QR code for the vendor themselves
 * @param {Array} attendeeQRCodes - Optional: Array of attendee QR codes for platform booths
 * @returns {Promise<Object>} Result object
 */
async function sendQRCodesToVendor(vendor, event, registrations = [], vendorQRCode = null, attendeeQRCodes = []) {
  try {
    if (!vendor || !vendor.email) {
      return {
        sent: false,
        stored: false,
        error: 'Vendor email not found'
      };
    }

    // Handle vendor QR code (for the vendor themselves) and event participant QR codes
    const hasVendorQR = !!(vendorQRCode && vendorQRCode.qrCode);
    const registrationsWithQR = registrations && registrations.length > 0
      ? registrations.filter(reg => reg.qrCode)
      : [];
    const hasParticipantRegistrations = registrationsWithQR.length > 0;
    const hasAttendeeQRCodes = attendeeQRCodes && attendeeQRCodes.length > 0;
    
    // Must have either vendor QR code or attendee QR codes (vendors should NOT receive participant registrations)
    if (!hasVendorQR && !hasAttendeeQRCodes) {
      console.log('⚠️ No QR codes to send:', { hasVendorQR, vendorQRCode, attendeeQRCodesCount: attendeeQRCodes?.length || 0 });
      return {
        sent: false,
        stored: false,
        error: 'No QR codes to send (neither vendor QR code nor attendee QR codes)'
      };
    }
    
    console.log('📧 Preparing email:', { 
      vendorEmail: vendor.email, 
      hasVendorQR, 
      vendorQRCodeExists: !!vendorQRCode,
      vendorQRCodeValue: vendorQRCode?.qrCode ? 'exists' : 'missing',
      hasAttendeeQRCodes,
      attendeeCount: attendeeQRCodes?.length || 0
    });

    // Create HTML for vendor QR code (if provided) and prepare attachments
    let vendorQRCodeHTML = '';
    let emailAttachments = [];
    let vendorQRCID = null;
    
    if (hasVendorQR && vendorQRCode && vendorQRCode.qrCode) {
      let qrCodeImageSrc = vendorQRCode.qrCode;
      
      // Ensure the data URL is properly formatted
      if (!qrCodeImageSrc || typeof qrCodeImageSrc !== 'string') {
        console.error('❌ QR code is not a valid string:', typeof qrCodeImageSrc);
        qrCodeImageSrc = '';
      } else if (!qrCodeImageSrc.startsWith('data:image/')) {
        console.warn('⚠️ QR code data URL does not start with "data:image/" - fixing format');
        const base64Match = qrCodeImageSrc.match(/^[A-Za-z0-9+/=\s]+$/);
        if (base64Match) {
          qrCodeImageSrc = `data:image/png;base64,${qrCodeImageSrc.trim()}`;
        } else {
          console.error('❌ QR code does not appear to be valid base64');
        }
      }
      
      // Check if QR code is valid
      const isValidQRCode = qrCodeImageSrc && 
                            qrCodeImageSrc.length > 100 && 
                            qrCodeImageSrc.startsWith('data:image/');
      
      if (isValidQRCode) {
        // Convert data URL to buffer for email attachment
        try {
          const base64Data = qrCodeImageSrc.replace(/^data:image\/png;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique CID for the vendor QR code
          vendorQRCID = `vendor-qr-${vendor._id || vendor.id || Date.now()}`;
          
          // Add as attachment
          emailAttachments.push({
            filename: 'vendor-qr-code.png',
            content: imageBuffer,
            cid: vendorQRCID,
            contentType: 'image/png'
          });
          
          console.log('✅ Vendor QR code converted to attachment, CID:', vendorQRCID);
          
          // Use CID reference in HTML instead of data URL
          vendorQRCodeHTML = `
            <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Your Vendor QR Code</h3>
              <p style="color: #1D3557; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">This is your QR code as a participating vendor. You can use this for check-in and identification at the event.</p>
              <div style="text-align: center; padding: 20px;">
                <img src="cid:${vendorQRCID}" alt="Vendor QR Code" style="width: 200px; height: 200px; border: 2px solid #1D3557; padding: 10px; background: white; display: block; margin: 0 auto; border-radius: 4px;" />
              </div>
              <p style="color: #1D3557; font-size: 14px; text-align: center; margin-top: 15px;">
                <strong>Vendor:</strong> ${vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim()}
              </p>
            </div>
          `;
          console.log('✅ Vendor QR code HTML generated with CID, length:', vendorQRCodeHTML.length);
        } catch (bufferError) {
          console.error('❌ Error converting QR code to buffer:', bufferError);
          vendorQRCodeHTML = `
            <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Your Vendor QR Code</h3>
              <p style="color: #1D3557; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">⚠️ QR code could not be processed. Please contact support.</p>
            </div>
          `;
        }
      } else {
        console.error('❌ QR code image source is invalid');
        vendorQRCodeHTML = `
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1D3557; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">Your Vendor QR Code</h3>
            <p style="color: #1D3557; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">⚠️ QR code could not be generated. Please contact support.</p>
          </div>
        `;
      }
    } else {
      console.warn('⚠️ Vendor QR code HTML not generated:', { 
        hasVendorQR, 
        vendorQRCode: !!vendorQRCode, 
        qrCode: !!vendorQRCode?.qrCode 
      });
    }
    
    // Note: We no longer include participant registrations in vendor emails
    // Vendors should only receive their own QR code and their attendees' QR codes

    // Create HTML for platform booth and bazaar attendee QR codes (if any)
    let attendeeQRCodesHTML = '';
    if (hasAttendeeQRCodes) {
      attendeeQRCodesHTML = attendeeQRCodes.map((attendeeQR, index) => {
        let qrCodeSrc = attendeeQR.qrCode;
        let qrCodeCID = null;
        
        // Convert attendee QR codes to attachments
        if (qrCodeSrc && qrCodeSrc.startsWith('data:image/')) {
          try {
            const base64Data = qrCodeSrc.replace(/^data:image\/png;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            qrCodeCID = `attendee-qr-${attendeeQR.attendeeEmail || index}`;
            
            emailAttachments.push({
              filename: `attendee-qr-${index + 1}.png`,
              content: imageBuffer,
              cid: qrCodeCID,
              contentType: 'image/png'
            });
            
            qrCodeSrc = `cid:${qrCodeCID}`;
          } catch (bufferError) {
            console.error(`❌ Error converting attendee QR code ${index} to buffer:`, bufferError);
            qrCodeSrc = '';
          }
        } else if (qrCodeSrc && !qrCodeSrc.startsWith('data:')) {
          // Try to fix format
          if (qrCodeSrc.match(/^[A-Za-z0-9+/=\s]+$/)) {
            qrCodeSrc = `data:image/png;base64,${qrCodeSrc.trim()}`;
            try {
              const base64Data = qrCodeSrc.replace(/^data:image\/png;base64,/, '');
              const imageBuffer = Buffer.from(base64Data, 'base64');
              qrCodeCID = `attendee-qr-${attendeeQR.attendeeEmail || index}`;
              
              emailAttachments.push({
                filename: `attendee-qr-${index + 1}.png`,
                content: imageBuffer,
                cid: qrCodeCID,
                contentType: 'image/png'
              });
              
              qrCodeSrc = `cid:${qrCodeCID}`;
            } catch (bufferError) {
              console.error(`❌ Error converting attendee QR code ${index} to buffer (after fix):`, bufferError);
              qrCodeSrc = '';
            }
          } else {
            qrCodeSrc = '';
          }
        }
        
        return `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 12px; text-align: center;">${index + 1}</td>
            <td style="padding: 12px;">${user.firstName || 'N/A'} ${user.lastName || ''}</td>
            <td style="padding: 12px;">${user.email || 'N/A'}</td>
            <td style="padding: 12px; text-align: center;">
              ${qrCodeSrc ? `<img src="${qrCodeSrc}" alt="QR Code" style="width: 100px; height: 100px; border: 2px solid #1D3557; padding: 5px; display: block; margin: 0 auto; border-radius: 4px;" />` : '<span style="color: #6B7280; font-size: 14px;">QR Code unavailable</span>'}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      participantQRCodesHTML = `
        <tr>
          <td colspan="4" style="padding: 20px; text-align: center; color: #666; font-style: italic;">
            No event participants have registered for this bazaar yet. QR codes for participants will be automatically generated and sent to you once they register to attend the event.
          </td>
        </tr>
      `;
    }

    const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Vendor';
    const eventName = event.name || event.title || 'Event';
    const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD';

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f6f7f8;">
        <!-- Header -->
        <div style="background-color: #1D3557; padding: 30px 20px; text-align: center;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Bindly</h1>
          <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0; font-size: 14px;">GUC Events Platform</p>
        </div>
        
        <!-- Content Container -->
        <div style="background-color: #FFFFFF; margin: 20px; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Main Info Box -->
          <div style="background-color: #FFFFFF; border: 2px solid #1D3557; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1D3557; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">${hasVendorQR ? 'Your Vendor QR Code' : 'Visitor QR Codes for Your Event'}</h2>
            <p style="color: #1D3557; margin: 8px 0; font-size: 14px; line-height: 1.6;">Hi ${vendorName},</p>
            ${hasVendorQR 
              ? '<p style="color: #1D3557; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">Your QR code as a participating vendor has been generated. You can use this QR code for check-in and identification at the event.</p>'
              : '<p style="color: #1D3557; margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">Great news! We have generated QR codes for all registered visitors to your bazaar/booth. You can use these QR codes to verify attendance at your event.</p>'
            }
          </div>

          ${vendorQRCodeHTML}

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
            ${hasParticipantRegistrations ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Total Visitors:</td>
              <td style="padding: 8px; font-weight: bold; color: #27ae60;">${registrationsWithQR.length}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${hasParticipantRegistrations ? `
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
              ${participantQRCodesHTML}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            ${hasVendorQR 
              ? '<strong>Your Vendor QR Code:</strong> Use this QR code for vendor check-in and identification at the event. '
              : ''
            }
            ${hasParticipantRegistrations 
              ? '<strong>Visitor QR Codes:</strong> You can scan these QR codes at your event to verify visitor attendance. Each QR code contains the visitor\'s name, email, and registration ID.'
              : hasVendorQR 
                ? 'Present this QR code when you arrive at the event for vendor check-in.'
                : ''
            }
          </p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Bindly - GUC Events Platform. All rights reserved.</p>
        </div>
      </div>
    `;
    
    // Debug: Log the HTML length to ensure it's not empty
    console.log('📧 Email HTML Debug:', {
      htmlLength: html?.length || 0,
      hasVendorQR,
      hasAttendeeQRCodes,
      vendorQRCodeHTMLLength: vendorQRCodeHTML?.length || 0,
      attendeeQRCodesHTMLLength: attendeeQRCodesHTML?.length || 0,
      vendorName,
      eventName
    });
    
    if (!html || html.trim().length < 100) {
      console.error('❌ Email HTML is empty or too short!', { 
        htmlLength: html?.length, 
        hasVendorQR, 
        hasAttendeeQRCodes,
        vendorQRCodeHTMLLength: vendorQRCodeHTML?.length || 0,
        attendeeQRCodesHTMLLength: attendeeQRCodesHTML?.length || 0
      });
      return {
        sent: false,
        stored: false,
        error: 'Email HTML is empty or invalid'
      };
    } else {
      console.log('✅ Email HTML generated successfully, length:', html.length);
    }

    const defaultFrom = process.env.SMTP_FROM && process.env.SMTP_FROM.trim()
      ? process.env.SMTP_FROM.trim()
      : (process.env.SMTP_USER ? `Bindly <${process.env.SMTP_USER}>` : 'Bindly <no-reply@bindly.com>');

    const mailOptions = {
      from: defaultFrom,
      to: vendor.email,
      subject: `Visitor QR Codes - ${eventName}`,
      html,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined
    };
    
    console.log('📎 Email attachments:', emailAttachments.length, 'attachments prepared');

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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      vendorEmail: vendor?.email
    });
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
