const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const Event = require('../models/eventModel');
const Trip = require('../models/tripModel');

async function sendDummyReminder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('📢 Sending dummy 1-hour reminder for trip test 2 to all staff and professors...');
    
    // Find all staff and professor users
    const staffAndProfessors = await User.find({
      userType: { $in: ['Staff', 'Professor'] }
    });
    
    console.log(`👥 Found ${staffAndProfessors.length} staff and professor users`);
    
    // Find trip test 2 event (check both Event and Trip models)
    let tripTest2 = await Event.findOne({
      type: 'trip',
      title: { $regex: /trip test 2/i }
    });
    
    // If not found in Event, check Trip model
    if (!tripTest2) {
      tripTest2 = await Trip.findOne({
        name: { $regex: /trip test 2/i }
      });
    }
    
    if (!tripTest2) {
      console.error('❌ Trip test 2 event not found');
      process.exit(1);
    }
    
    console.log(`✅ Found trip test 2: ${tripTest2.title || tripTest2.name} (ID: ${tripTest2._id})`);
    
    const tripName = tripTest2.title || tripTest2.name;
    const tripLocation = tripTest2.location || 'Location TBD';
    const tripId = tripTest2._id;
    
    // Delete all existing trip test 2 reminders for these users first
    console.log('🗑️  Deleting existing trip test 2 reminders...');
    
    // First, find what notifications exist for debugging
    const existingNotifications = await Notification.find({
      recipient: { $in: staffAndProfessors.map(u => u._id) },
      $or: [
        { relatedEvent: tripId },
        { 'metadata.tripId': tripId.toString() },
        { title: { $regex: /trip test 2/i } }
      ]
    }).limit(10);
    
    if (existingNotifications.length > 0) {
      console.log(`  Found ${existingNotifications.length} existing notifications. Sample:`, {
        type: existingNotifications[0].type,
        relatedEvent: existingNotifications[0].relatedEvent,
        hasMetadata: !!existingNotifications[0].metadata,
        metadataTripId: existingNotifications[0].metadata?.tripId
      });
    }
    
    // Delete by recipient and relatedEvent (matching the unique index)
    let totalDeleted = 0;
    for (const user of staffAndProfessors) {
      const deleteResult = await Notification.deleteMany({
        recipient: user._id,
        relatedEvent: tripId
      });
      totalDeleted += deleteResult.deletedCount;
    }
    
    console.log(`  Deleted ${totalDeleted} existing reminders`);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    // Send reminder to all staff and professors
    for (const user of staffAndProfessors) {
      try {
        await Notification.create({
          recipient: user._id,
          type: 'trip_reminder',
          title: `Reminder: ${tripName} starts in 1 hour`,
          message: `The trip "${tripName}" will start in 1 hour at ${tripLocation}`,
          relatedEvent: tripId,
          priority: 'high',
          metadata: {
            tripName: tripName,
            tripDate: tripTest2.startDate || new Date(),
            location: tripLocation,
            timeframe: '1 hour',
            tripId: tripId.toString()
          }
        });
        successCount++;
        console.log(`  ✅ Sent reminder to ${user.userType}: ${user.email}`);
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
          console.log(`  ⏭️  Duplicate notification skipped for ${user.email}`);
        } else {
          errorCount++;
          console.error(`  ❌ Error sending reminder to ${user.email}:`, error.message);
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Total users: ${staffAndProfessors.length}`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⏭️  Duplicates: ${duplicateCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('\n✅ Dummy reminders sent successfully!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

sendDummyReminder();

