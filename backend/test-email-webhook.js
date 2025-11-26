// Test script to verify email sending after payment
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const VendorRequest = require('./models/vendorRequest');
const Payment = require('./models/paymentModel');
const { sendReceiptEmail } = require('./utils/sendReceiptEmail');

async function testEmailSending() {
    try {
        console.log('🧪 Testing Email Sending for Payment Receipt...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a test user (vendor or any user)
        const user = await User.findOne().limit(1);
        if (!user) {
            console.error('❌ No user found in database');
            process.exit(1);
        }
        console.log('📧 Found user:', user.email, '(' + (user.firstName || user.companyName || 'User') + ')');

        // Find a vendor request
        const vendorRequest = await VendorRequest.findOne().limit(1);
        if (!vendorRequest) {
            console.error('❌ No vendor request found in database');
            process.exit(1);
        }
        console.log('🎯 Found vendor request:', vendorRequest.eventName);

        // Prepare receipt details
        const receiptDetails = {
            eventType: vendorRequest.eventType,
            boothSize: vendorRequest.boothSize,
            durationWeeks: vendorRequest.durationWeeks,
            boothLocation: vendorRequest.boothLocation
        };

        console.log('\n📋 Test Parameters:');
        console.log('   Email:', user.email);
        console.log('   Name:', user.firstName || user.companyName);
        console.log('   Event:', vendorRequest.eventName);
        console.log('   Amount: 500 EGP');
        console.log('   Details:', receiptDetails);

        // Test sending email
        console.log('\n🚀 Sending test email...\n');
        const result = await sendReceiptEmail(
            user.email,
            user.firstName || user.companyName,
            vendorRequest.eventName,
            500,
            'card',
            new Date(),
            receiptDetails
        );

        console.log('\n✅ Email Sending Test Result:');
        console.log('   Sent:', result.sent);
        if (result.sent) {
            console.log('   Message ID:', result.messageId);
        } else {
            console.log('   Error:', result.error || result.reason);
            console.log('   Code:', result.code);
        }

        process.exit(result.sent ? 0 : 1);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testEmailSending();
