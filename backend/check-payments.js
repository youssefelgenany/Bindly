// Check payment records in database
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/paymentModel');

async function checkPayments() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const payments = await Payment.find().limit(10);
        console.log('📋 Recent Payments (' + payments.length + ' found):\n');

        payments.forEach((p, i) => {
            console.log(`${i + 1}. Payment ID: ${p._id}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Amount: ${p.amount} EGP`);
            console.log(`   Type: ${p.type}`);
            console.log(`   Stripe Session ID: ${p.stripeSessionId || 'N/A'}`);
            console.log(`   Vendor Request: ${p.vendorRequest || 'N/A'}`);
            console.log(`   Event: ${p.event || 'N/A'}`);
            console.log(`   Created: ${p.createdAt}`);
            console.log('');
        });

        // Also check for pending/success payments
        const statusCounts = await Payment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('💾 Payment Status Counts:');
        statusCounts.forEach(sc => {
            console.log(`   ${sc._id}: ${sc.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPayments();
