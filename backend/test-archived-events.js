const mongoose = require('mongoose');
const Event = require('./models/eventModel');
require('dotenv').config();

async function testArchivedEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bindly', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check all events and their archived status
    const allEvents = await Event.find({}).select('title type archived endDate startDate').lean();
    console.log('\n📊 All Events:');
    console.log(`Total events: ${allEvents.length}`);
    
    const archivedEvents = allEvents.filter(e => e.archived === true);
    console.log(`Archived events: ${archivedEvents.length}`);
    
    if (archivedEvents.length > 0) {
      console.log('\n📦 Archived Events:');
      archivedEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.type}) - End Date: ${event.endDate}`);
      });
    } else {
      console.log('\n⚠️ No archived events found in database');
    }

    // Test the query used in getArchivedEvents
    const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
    const baseMatch = {
      type: { $in: validTypes },
      archived: true,
      $and: [
        { title: { $exists: true } },
        { title: { $ne: null } },
        { title: { $ne: '' } },
        { location: { $exists: true } },
        { location: { $ne: null } },
        { location: { $ne: '' } }
      ]
    };

    console.log('\n🔍 Testing query with baseMatch:');
    console.log(JSON.stringify(baseMatch, null, 2));

    const queryResults = await Event.find(baseMatch).select('title type archived endDate location').lean();
    console.log(`\n📋 Query results: ${queryResults.length} events`);
    
    if (queryResults.length > 0) {
      queryResults.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.type}) - Location: ${event.location}`);
      });
    }

    // Test aggregation pipeline
    console.log('\n🔍 Testing aggregation pipeline...');
    const pipeline = [
      { $match: baseMatch },
      { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      { $sort: { endDate: -1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          endDate: 1,
          location: 1,
          archived: 1,
          createdBy: {
            _id: '$creator._id',
            firstName: '$creator.firstName',
            lastName: '$creator.lastName',
            email: '$creator.email'
          }
        }
      }
    ];

    const aggregateResults = await Event.aggregate(pipeline);
    console.log(`\n📋 Aggregation results: ${aggregateResults.length} events`);
    
    if (aggregateResults.length > 0) {
      aggregateResults.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.type}) - Location: ${event.location}`);
        console.log(`   Created by: ${event.createdBy?.firstName || 'N/A'} ${event.createdBy?.lastName || ''}`);
      });
    } else {
      console.log('⚠️ No events returned from aggregation pipeline');
    }

    // Check if any events have endDate in the past but aren't archived
    const now = new Date();
    const pastEvents = allEvents.filter(e => {
      if (!e.endDate) return false;
      return new Date(e.endDate) < now && !e.archived;
    });
    
    if (pastEvents.length > 0) {
      console.log(`\n📅 Found ${pastEvents.length} past events that are NOT archived:`);
      pastEvents.slice(0, 5).forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (${event.type}) - End Date: ${event.endDate}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testArchivedEvents();

