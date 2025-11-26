// Simulate Stripe webhook to test email sending
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/paymentModel');
const stripeWebhookController = require('./controllers/stripeWebhookController');

async function testWebhook() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a payment with a vendor request
        const payment = await Payment.findOne({ vendorRequest: { $exists: true, $ne: null } }).limit(1);
        if (!payment) {
            console.error('❌ No vendor request payment found');
            process.exit(1);
        }

        console.log('💳 Found payment:');
        console.log('   ID:', payment._id);
        console.log('   Status:', payment.status);
        console.log('   Amount:', payment.amount);
        console.log('   Vendor Request:', payment.vendorRequest);
        console.log('   User:', payment.user);
        console.log('   Stripe Session ID:', payment.stripeSessionId);
        console.log('');

        if (!payment.stripeSessionId) {
            console.error('❌ Payment has no Stripe session ID');
            process.exit(1);
        }

        // Create a mock webhook event
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: payment.stripeSessionId,
                    payment_status: 'paid',
                    payment_intent: 'pi_test_123'
                }
            }
        };

        console.log('🚀 Simulating webhook event...\n');

        // Create mock req/res
        const mockReq = {
            body: mockEvent,
            headers: { 'stripe-signature': 'test' }
        };

        const mockRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) {
                console.log('Response:', { statusCode: this.statusCode, data });
                return this;
            },
            send: function (data) {
                console.log('Response Send:', data);
                return this;
            },
            statusCode: 200
        };

        // Call the webhook controller
        await stripeWebhookController(mockReq, mockRes);

        console.log('✅ Webhook simulation complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testWebhook();
