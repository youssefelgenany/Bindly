// Migration script to add ratings field to all existing events
// Run this once after deploying the ratings feature
// Usage: node scripts/migrateEventRatings.js

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/eventModel');

async function migrateEventRatings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all events that don't have a ratings field or have undefined ratings
    const events = await Event.find({
      $or: [
        { ratings: { $exists: false } },
        { ratings: null }
      ]
    });

    console.log(`📊 Found ${events.length} events without ratings field`);

    // Update all events to have an empty ratings array
    const result = await Event.updateMany(
      {
        $or: [
          { ratings: { $exists: false } },
          { ratings: null }
        ]
      },
      {
        $set: { ratings: [] }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} events with ratings field`);
    console.log('✅ Migration completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateEventRatings();

