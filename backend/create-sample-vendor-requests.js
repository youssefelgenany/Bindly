const mongoose = require('mongoose');
const Event = require('./models/eventModel');
const VendorRequest = require('./models/vendorRequest');
const User = require('./models/userModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bindly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Sample vendor requests for booth events
const sampleVendorRequests = [
  {
    eventName: 'Premium Booth A',
    eventType: 'booth',
    attendees: [
      { name: 'John Smith', email: 'john.smith@example.com' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@example.com' }
    ],
    boothSize: '4x4',
    durationWeeks: 3,
    boothLocation: 'main-entrance',
    message: 'We are a local food vendor specializing in organic smoothies and healthy snacks.',
    status: 'accepted'
  },
  {
    eventName: 'Standard Booth B',
    eventType: 'booth',
    attendees: [
      { name: 'Mike Chen', email: 'mike.chen@techstartup.com' }
    ],
    boothSize: '2x2',
    durationWeeks: 1,
    boothLocation: 'central-plaza',
    message: 'We are showcasing our new mobile app for student productivity.',
    status: 'accepted'
  },
  {
    eventName: 'Economy Booth C',
    eventType: 'booth',
    attendees: [
      { name: 'Emma Wilson', email: 'emma.wilson@artstudio.com' },
      { name: 'David Brown', email: 'david.brown@artstudio.com' }
    ],
    boothSize: '2x2',
    durationWeeks: 2,
    boothLocation: 'library-area',
    message: 'We create handmade jewelry and art pieces.',
    status: 'accepted'
  },
  {
    eventName: 'Corner Booth D',
    eventType: 'booth',
    attendees: [
      { name: 'Ahmed Hassan', email: 'ahmed.hassan@cultural.com' }
    ],
    boothSize: '4x4',
    durationWeeks: 1,
    boothLocation: 'auditorium-hall',
    message: 'Traditional Middle Eastern crafts, textiles, and cultural artifacts.',
    status: 'accepted'
  },
  {
    eventName: 'Food Court Booth E',
    eventType: 'booth',
    attendees: [
      { name: 'Student Entrepreneur Group', email: 'startup@studentgroup.com' }
    ],
    boothSize: '2x2',
    durationWeeks: 1,
    boothLocation: 'student-center',
    message: 'Student-run startup showcasing innovative tech solutions.',
    status: 'accepted'
  }
];

async function createSampleVendorRequests() {
  try {
    console.log('🏪 Creating sample vendor requests for booth events...');

    // Clear existing vendor requests
    await VendorRequest.deleteMany({ eventType: 'booth' });
    console.log('🗑️ Cleared existing booth vendor requests');

    // Get all booth events
    const boothEvents = await Event.find({ type: 'booth' });
    console.log(`📋 Found ${boothEvents.length} booth events`);

    // Create sample vendors (users) if they don't exist
    const vendorEmails = [
      'john.smith@example.com',
      'mike.chen@techstartup.com', 
      'emma.wilson@artstudio.com',
      'ahmed.hassan@cultural.com',
      'startup@studentgroup.com'
    ];

    const vendors = [];
    for (const email of vendorEmails) {
      let vendor = await User.findOne({ email });
      if (!vendor) {
        vendor = new User({
          firstName: email.split('@')[0].split('.')[0],
          lastName: email.split('@')[0].split('.')[1] || 'Vendor',
          email: email,
          password: 'password123', // Default password
          userType: 'Vendor',
          companyName: `${email.split('@')[0]} Company`
        });
        await vendor.save();
        console.log(`👤 Created vendor: ${vendor.email}`);
      }
      vendors.push(vendor);
    }

    // Create vendor requests for each booth event
    const createdRequests = [];
    for (let i = 0; i < boothEvents.length && i < sampleVendorRequests.length; i++) {
      const boothEvent = boothEvents[i];
      const requestData = sampleVendorRequests[i];
      
      // Find the corresponding vendor
      const vendor = vendors.find(v => 
        requestData.attendees.some(attendee => attendee.email === v.email)
      );

      if (vendor) {
        const vendorRequest = new VendorRequest({
          vendor: vendor._id,
          booth: boothEvent._id,
          eventName: boothEvent.title,
          eventType: 'booth',
          attendees: requestData.attendees,
          boothSize: requestData.boothSize,
          durationWeeks: requestData.durationWeeks,
          boothLocation: requestData.boothLocation,
          message: requestData.message,
          status: requestData.status
        });

        await vendorRequest.save();
        createdRequests.push(vendorRequest);
        console.log(`✅ Created vendor request for ${boothEvent.title} by ${vendor.email}`);
      }
    }

    console.log(`\n🎉 Created ${createdRequests.length} vendor requests successfully!`);
    console.log('Now booth events will show participating vendors in the event office view.');

  } catch (error) {
    console.error('❌ Error creating sample vendor requests:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createSampleVendorRequests();
