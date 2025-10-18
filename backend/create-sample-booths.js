// Test script to create sample booth events for testing vendor booth listing
const mongoose = require('mongoose');
const Event = require('./models/eventModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bindly')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Sample booth events that will be associated with bazaars
const sampleBooths = [
    {
        title: 'Premium Booth A',
        type: 'booth',
        description: 'Large premium booth with excellent visibility and foot traffic',
        startDate: new Date('2024-03-15T09:00:00'),
        endDate: new Date('2024-03-17T18:00:00'),
        location: 'Main Campus Plaza',
        capacity: 50,
        price: 200,
        status: 'approved'
    },
    {
        title: 'Standard Booth B',
        type: 'booth',
        description: 'Standard sized booth perfect for most vendors',
        startDate: new Date('2024-03-15T09:00:00'),
        endDate: new Date('2024-03-17T18:00:00'),
        location: 'Main Campus Plaza',
        capacity: 30,
        price: 150,
        status: 'approved'
    },
    {
        title: 'Economy Booth C',
        type: 'booth',
        description: 'Budget-friendly booth option for small vendors',
        startDate: new Date('2024-03-15T09:00:00'),
        endDate: new Date('2024-03-17T18:00:00'),
        location: 'Main Campus Plaza',
        capacity: 20,
        price: 100,
        status: 'approved'
    },
    {
        title: 'Corner Booth D',
        type: 'booth',
        description: 'Prime corner location with maximum visibility',
        startDate: new Date('2024-04-20T10:00:00'),
        endDate: new Date('2024-04-22T17:00:00'),
        location: 'Student Center',
        capacity: 40,
        price: 180,
        status: 'approved'
    },
    {
        title: 'Food Court Booth E',
        type: 'booth',
        description: 'Special booth in the food court area',
        startDate: new Date('2024-04-20T10:00:00'),
        endDate: new Date('2024-04-22T17:00:00'),
        location: 'Student Center',
        capacity: 25,
        price: 120,
        status: 'approved'
    }
];

async function createSampleBooths() {
    try {
        console.log('🏪 Creating sample booth events...');

        // Clear existing booth events
        await Event.deleteMany({ type: 'booth' });
        console.log('🗑️ Cleared existing booth events');

        // Create new booth events
        const createdBooths = await Event.insertMany(sampleBooths);
        console.log(`✅ Created ${createdBooths.length} booth events`);

        // Display created booths
        createdBooths.forEach(booth => {
            console.log(`   📍 ${booth.title} - ${booth.location} - $${booth.price}`);
        });

        console.log('\n🎉 Sample booth data created successfully!');
        console.log('Now when vendors browse bazaars, they will see these booths listed.');

    } catch (error) {
        console.error('❌ Error creating sample booths:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the script
createSampleBooths();
