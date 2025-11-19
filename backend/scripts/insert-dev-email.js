const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Email = require('../models/EmailModel');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = await Email.create({
            to: 'vendor@example.com',
            subject: 'Test QR Codes - Dev',
            html: '<p>This is a test dev email for QR codes.</p>',
            verificationToken: '',
            verificationUrl: '',
            sentAt: new Date(),
            isRead: false,
            userInfo: { name: 'Test Vendor', userType: 'Vendor', email: 'vendor@example.com' }
        });

        console.log('Inserted email id:', email._id.toString());
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error inserting email:', err);
        process.exit(1);
    }
})();
