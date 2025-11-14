// Simple test for event restrictions - manual testing
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/eventModel');
const Registration = require('./models/registrationModel');
const User = require('./models/userModel');

async function testEventRestrictions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get some test users
    const users = await User.find({}).limit(3).select('_id firstName lastName userType');
    console.log('Available test users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.userType}) - ID: ${user._id}`);
    });

    if (users.length < 2) {
      console.log('❌ Need at least 2 users for testing. Please create test users first.');
      return;
    }

    // Create a restricted event
    const restrictedEvent = new Event({
      title: 'Restricted Test Event',
      description: 'Only specific users can register',
      type: 'workshop',
      startDate: new Date('2025-12-15T10:00:00Z'),
      endDate: new Date('2025-12-15T12:00:00Z'),
      location: 'Test Lab',
      capacity: 10,
      isRestricted: true,
      allowedUsers: [users[0]._id], // Only first user allowed
      status: 'approved'
    });

    await restrictedEvent.save();
    console.log(`\n✅ Created restricted event: ${restrictedEvent._id}`);
    console.log(`Allowed user: ${users[0].firstName} ${users[0].lastName} (${users[0]._id})`);
    console.log(`Not allowed user: ${users[1].firstName} ${users[1].lastName} (${users[1]._id})`);

    // Test registration logic (simulate what happens in the controller)
    console.log('\n🧪 Testing registration restrictions...');

    // Function to map userType to role
    function mapUserTypeToRole(userType) {
      const roleMap = {
        'Student': 'student',
        'Staff': 'staff',
        'TA': 'TA',
        'Professor': 'professor',
        'Vendor': 'vendor',
        'Admin': 'student', // Default to student for admin
        'event_office': 'staff' // Default to staff for event office
      };
      return roleMap[userType] || 'student';
    }

    // Simulate allowed user registration
    const allowedRole = mapUserTypeToRole(users[0].userType);
    const allowedRegistration = new Registration({
      user: users[0]._id,
      event: restrictedEvent._id,
      role: allowedRole,
      status: 'approved'
    });

    // Check if allowed user can register
    const existingAllowed = await Registration.findOne({
      user: users[0]._id,
      event: restrictedEvent._id
    });

    if (existingAllowed) {
      console.log('❌ Allowed user already registered');
    } else if (restrictedEvent.isRestricted && !restrictedEvent.allowedUsers.includes(users[0]._id)) {
      console.log('❌ Allowed user should be able to register but restriction blocked them');
    } else {
      await allowedRegistration.save();
      console.log('✅ Allowed user registration successful');
    }

    // Simulate non-allowed user registration
    const notAllowedRole = mapUserTypeToRole(users[1].userType);
    const notAllowedRegistration = new Registration({
      user: users[1]._id,
      event: restrictedEvent._id,
      role: notAllowedRole,
      status: 'approved'
    });

    // Check if non-allowed user can register
    const existingNotAllowed = await Registration.findOne({
      user: users[1]._id,
      event: restrictedEvent._id
    });

    if (existingNotAllowed) {
      console.log('❌ Not allowed user already registered');
    } else if (restrictedEvent.isRestricted && !restrictedEvent.allowedUsers.includes(users[1]._id)) {
      console.log('✅ Not allowed user correctly blocked by restriction');
    } else {
      console.log('❌ Not allowed user should have been blocked but was allowed');
    }

    // Create a non-restricted event for comparison
    const openEvent = new Event({
      title: 'Open Test Event',
      description: 'Anyone can register',
      type: 'workshop',
      startDate: new Date('2025-12-16T10:00:00Z'),
      endDate: new Date('2025-12-16T12:00:00Z'),
      location: 'Test Lab',
      capacity: 10,
      isRestricted: false,
      status: 'approved'
    });

    await openEvent.save();
    console.log(`\n✅ Created open event: ${openEvent._id}`);

    // Test open event registration
    const openRole = mapUserTypeToRole(users[1].userType);
    const openRegistration = new Registration({
      user: users[1]._id,
      event: openEvent._id,
      role: openRole,
      status: 'approved'
    });

    const existingOpen = await Registration.findOne({
      user: users[1]._id,
      event: openEvent._id
    });

    if (existingOpen) {
      console.log('❌ User already registered for open event');
    } else {
      await openRegistration.save();
      console.log('✅ User registration successful for open event');
    }

    console.log('\n📋 Test Summary:');
    console.log(`- Restricted Event ID: ${restrictedEvent._id}`);
    console.log(`- Open Event ID: ${openEvent._id}`);
    console.log('- Use these IDs in Postman with proper JWT tokens to test the API endpoints');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testEventRestrictions();