// Quick script to check registrations in database
require('dotenv').config();
const mongoose = require('mongoose');
const Registration = require('./models/registrationModel');
const Event = require('./models/eventModel');
// Need to require User model to register it for populate
const User = require('./models/userModel');

async function checkRegistrations() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all events
    const events = await Event.find({}).select('_id title type');
    console.log('Events in DB:', events.length);
    events.forEach(event => {
      console.log(`- ${event._id}: ${event.title} (${event.type})`);
    });

    // Get all registrations
    const registrations = await Registration.find({}).populate('user', 'firstName lastName name userType').populate('event', 'title type');
    console.log('\nTotal registrations:', registrations.length);

    // Check specific event
    const specificEventId = '68f15009c8c97466cbd30df0'; // The event the user is testing
    console.log(`\nChecking specific event: ${specificEventId}`);
    
    const specificEvent = await Event.findById(specificEventId);
    if (specificEvent) {
      console.log(`Event found: ${specificEvent.title} (${specificEvent.type})`);
      
      const eventRegistrations = await Registration.find({ event: specificEventId }).populate('user', 'firstName lastName name userType');
      console.log(`Registrations for this event: ${eventRegistrations.length}`);
      
      if (eventRegistrations.length > 0) {
        eventRegistrations.forEach((reg, index) => {
          console.log(`${index + 1}. User: ${reg.user ? `${reg.user.firstName || ''} ${reg.user.lastName || ''}`.trim() || reg.user.name || 'No name' : 'User not found'}`);
          console.log(`   Status: ${reg.status}`);
        });
      }
    } else {
      console.log('Event not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkRegistrations();