const mongoose = require('mongoose');
const Court = require('../models/courtModel');
require('dotenv').config();

const courts = [
  {
    name: 'Basketball Court 1',
    type: 'basketball',
    location: 'Sports Complex - Ground Floor',
    capacity: 20,
    facilities: ['Basketball hoops', 'Scoreboard', 'Seating area']
  },
  {
    name: 'Basketball Court 2',
    type: 'basketball',
    location: 'Sports Complex - Ground Floor',
    capacity: 20,
    facilities: ['Basketball hoops', 'Scoreboard', 'Seating area']
  },
  {
    name: 'Tennis Court 1',
    type: 'tennis',
    location: 'Sports Complex - Outdoor',
    capacity: 4,
    facilities: ['Tennis net', 'Court lighting', 'Seating area']
  },
  {
    name: 'Tennis Court 2',
    type: 'tennis',
    location: 'Sports Complex - Outdoor',
    capacity: 4,
    facilities: ['Tennis net', 'Court lighting', 'Seating area']
  },
  {
    name: 'Football Field',
    type: 'football',
    location: 'Main Sports Field',
    capacity: 22,
    facilities: ['Goal posts', 'Field lighting', 'Seating area', 'Changing rooms']
  },
  {
    name: 'Mini Football Field',
    type: 'football',
    location: 'Sports Complex - Outdoor',
    capacity: 14,
    facilities: ['Goal posts', 'Field lighting', 'Seating area']
  }
];

async function seedCourts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bindly');
    console.log('Connected to MongoDB');

    // Clear existing courts
    await Court.deleteMany({});
    console.log('Cleared existing courts');

    // Insert new courts
    const createdCourts = await Court.insertMany(courts);
    console.log(`Created ${createdCourts.length} courts:`);
    
    createdCourts.forEach(court => {
      console.log(`- ${court.name} (${court.type}) - ${court.location}`);
    });

    console.log('Court seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding courts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedCourts();
