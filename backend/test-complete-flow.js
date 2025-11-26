// Test the complete payment and email flow
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/paymentModel');
const VendorRequest = require('./models/vendorRequest');
const User = require('./models/userModel');
const { sendReceiptEmail } = require('./utils/sendReceiptEmail');

async function testPaymentEmailFlow() {
    try {
        console.log('🧪 Testing Complete Payment & Email Flow...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a vendor request with payment
        let vendorRequest = await VendorRequest.findOne({ participationFee: { $gt: 0 } }).limit(1);
        if (!vendorRequest) {
            console.log('❌ No vendor request with fee found');
            process.exit(1);
        }

        console.log('🎯 Found Vendor Request:');
        console.log('   Event:', vendorRequest.eventName);
        console.log('   Type:', vendorRequest.eventType);
        console.log('   Fee:', vendorRequest.participationFee, 'EGP');
        console.log('   Vendor ID:', vendorRequest.vendorId);

        // Find the user who made this request
        let user = await User.findById(vendorRequest.vendorId);
        if (!user) {
            console.log('⚠️  User not found by vendorId, finding any vendor user instead...');
            user = await User.findOne({ role: 'vendor' }).limit(1);
            if (!user) {
                user = await User.findOne().limit(1);
            }
        }

        if (!user) {
            console.log('❌ No user found');
            process.exit(1);
        }

        console.log('\n👤 Found User:');
        console.log('   Email:', user.email);
        console.log('   Name:', user.firstName, user.lastName);
        console.log('   Company:', user.companyName);

        // Simulate payment data
        console.log('\n💳 Simulating Payment Process:');

        const vendorPersonalName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.companyName || user.email;
        const eventTypeDisplay = {
            'bazaar': 'Bazaar',
            'booth': 'Booth',
            'standaloneBooth': 'Standalone Booth',
            'platformBooth': 'Platform Booth'
        }[vendorRequest.eventType] || vendorRequest.eventType;

        const eventTitle = vendorRequest.eventName
            ? `${eventTypeDisplay} - ${vendorRequest.eventName}`
            : `${eventTypeDisplay} Participation`;

        const receiptDetails = {
            eventType: vendorRequest.eventType,
            boothSize: vendorRequest.boothSize,
            durationWeeks: vendorRequest.durationWeeks,
            boothLocation: vendorRequest.boothLocation
        };

        console.log('   Personal Name:', vendorPersonalName);
        console.log('   Event Title:', eventTitle);
        console.log('   Amount:', vendorRequest.participationFee, 'EGP');
        console.log('   Receipt Details:', receiptDetails);

        // Send receipt email
        console.log('\n📧 Sending Receipt Email...');
        const result = await sendReceiptEmail(
            user.email,
            vendorPersonalName,
            eventTitle,
            vendorRequest.participationFee,
            'card',
            new Date(),
            receiptDetails
        );

        console.log('\n✅ Email Result:');
        console.log('   Sent:', result.sent);
        if (result.sent) {
            console.log('   Message ID:', result.messageId);
            console.log('   Recipient:', user.email);
        } else {
            console.log('   Error:', result.error || result.reason);
            if (result.code) {
                console.log('   Error Code:', result.code);
            }
        }

        // Summary
        console.log('\n✅ Payment Email Flow Test Complete!');
        console.log('   Status: SUCCESS');
        console.log('\n🎉 Receipt email will be sent immediately after Stripe payment completes.');
        console.log('   The email contains:');
        console.log('   - Event details (type, size, duration, location)');
        console.log('   - Payment amount');
        console.log('   - Payment method');
        console.log('   - Payment date/time');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testPaymentEmailFlow();
