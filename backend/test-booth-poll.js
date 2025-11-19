const mongoose = require('mongoose');
const BoothPoll = require('./models/boothPollModel');
const VendorRequest = require('./models/vendorRequest');
const User = require('./models/userModel');

async function testBoothPoll() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bindly');

    console.log('Connected to MongoDB');

    // Find some vendor requests (assuming they exist)
    const vendorRequests = await VendorRequest.find({ status: 'pending' }).limit(3);
    if (vendorRequests.length < 2) {
      console.log('Not enough vendor requests for testing. Please create some vendor requests first.');
      return;
    }

    console.log(`Found ${vendorRequests.length} vendor requests for testing`);

    // Find an events office user (assuming exists)
    const eventOfficeUser = await User.findOne({ userType: 'event_office' });
    if (!eventOfficeUser) {
      console.log('No event_office user found. Please create one first.');
      return;
    }

    console.log(`Using event office user: ${eventOfficeUser.email}`);

    // Mock req.user
    const mockReq = {
      user: { _id: eventOfficeUser._id },
      body: {
        title: 'Test Booth Poll',
        description: 'Testing booth allocation poll for conflicting requests',
        vendorRequestIds: vendorRequests.map(vr => vr._id)
      }
    };

    // Test createBoothPoll
    console.log('Creating booth poll...');
    const poll = new BoothPoll({
      title: mockReq.body.title,
      description: mockReq.body.description,
      options: vendorRequests.map(vr => ({
        vendorRequest: vr._id,
        description: `Vendor request ${vr._id}`
      })),
      createdBy: mockReq.user._id
    });

    await poll.save();
    console.log('✅ Booth poll created successfully:', poll._id);

    // Test getting polls
    const polls = await BoothPoll.find().populate('createdBy', 'email');
    console.log(`✅ Found ${polls.length} polls`);

    // Test closing poll
    poll.status = 'closed';
    poll.closedAt = new Date();
    await poll.save();
    console.log('✅ Poll closed successfully');

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testBoothPoll();