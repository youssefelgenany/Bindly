const QRCode = require('qrcode');

/**
 * Generate QR code for visitor registration
 * @param {String} registrationId - The registration ID
 * @param {Object} data - Additional data to encode
 * @returns {Promise<Object>} Object with QR code data URL and string
 */
async function generateQRCode(registrationId, data = {}) {
    try {
        // Create a compact JSON string with registration and user info
        const qrData = {
            registrationId,
            userId: data.userId || null,
            eventId: data.eventId || null,
            eventName: data.eventName || 'Event',
            userName: data.userName || 'Visitor',
            userEmail: data.userEmail || null,
            timestamp: new Date().toISOString()
        };

        const qrDataString = JSON.stringify(qrData);

        // Generate QR code as data URL (for database storage)
        const qrCodeDataUrl = await QRCode.toDataURL(qrDataString, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return {
            success: true,
            qrCodeDataUrl, // Base64 encoded PNG image
            qrDataString,  // JSON string encoded in QR
            registrationId
        };
    } catch (error) {
        console.error('❌ Error generating QR code:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    generateQRCode
};
