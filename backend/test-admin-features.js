// Test script for the implemented admin event features
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test tokens - replace with actual tokens
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN';
const USER_TOKEN = 'YOUR_USER_JWT_TOKEN';
const ALLOWED_USER_TOKEN = 'YOUR_ALLOWED_USER_JWT_TOKEN';

// Test event IDs from the database
const TEST_BAZAAR_ID = '6917419e2796a76f458dc70b'; // Test Bazaar for QR Codes
const TEST_TRIP_ID = '68f15009c8c97466cbd30df0'; // ahrama (trip)
const TEST_CONFERENCE_ID = '6915ea69fef0c76173da63b4'; // tech 26' (conference)

const headers = {
  admin: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  user: { Authorization: `Bearer ${USER_TOKEN}` },
  allowed: { Authorization: `Bearer ${ALLOWED_USER_TOKEN}` }
};

async function testDeleteEvent() {
  console.log('\n🗑️ Testing Delete Event (Admin Only)');
  try {
    // First create a test event to delete
    const createResponse = await axios.post(`${BASE_URL}/events`, {
      title: 'Test Event for Deletion',
      description: 'This event will be deleted',
      type: 'workshop',
      startDate: '2025-12-01T10:00:00Z',
      endDate: '2025-12-01T12:00:00Z',
      location: 'Test Location'
    }, { headers: headers.admin });

    const eventId = createResponse.data._id;
    console.log(`✅ Created test event: ${eventId}`);

    // Now delete it
    const deleteResponse = await axios.delete(`${BASE_URL}/events/${eventId}`, {
      headers: headers.admin
    });

    console.log('✅ Delete successful:', deleteResponse.data);

  } catch (error) {
    console.log('❌ Delete failed:', error.response?.data || error.message);
  }
}

async function testGenerateQR() {
  console.log('\n📱 Testing Generate QR Code (Admin Only)');

  // Test with bazaar (should work)
  try {
    const response = await axios.get(`${BASE_URL}/events/${TEST_BAZAAR_ID}/generate-qr`, {
      headers: headers.admin
    });
    console.log('✅ QR generation for bazaar successful');
    console.log('QR Code data length:', response.data.qrCode.length);
  } catch (error) {
    console.log('❌ QR generation for bazaar failed:', error.response?.data || error.message);
  }

  // Test with trip (should fail)
  try {
    const response = await axios.get(`${BASE_URL}/events/${TEST_TRIP_ID}/generate-qr`, {
      headers: headers.admin
    });
    console.log('❌ QR generation for trip should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ QR generation for trip correctly failed:', error.response.data.message);
    } else {
      console.log('❌ QR generation for trip failed with wrong error:', error.response?.data || error.message);
    }
  }
}

async function testExportRegistrations() {
  console.log('\n📊 Testing Export Registrations (Admin Only)');

  // Test with bazaar that has registrations (should work)
  try {
    const response = await axios.get(`${BASE_URL}/events/${TEST_BAZAAR_ID}/export-registrations`, {
      headers: headers.admin,
      responseType: 'arraybuffer'
    });
    console.log('✅ Export for bazaar successful, file size:', response.data.length, 'bytes');
  } catch (error) {
    console.log('❌ Export for bazaar failed:', error.response?.data || error.message);
  }

  // Test with conference (should fail)
  try {
    const response = await axios.get(`${BASE_URL}/events/${TEST_CONFERENCE_ID}/export-registrations`, {
      headers: headers.admin
    });
    console.log('❌ Export for conference should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Export for conference correctly failed:', error.response.data.message);
    } else {
      console.log('❌ Export for conference failed with wrong error:', error.response?.data || error.message);
    }
  }

  // Test with trip that has no registrations (should return message)
  try {
    const response = await axios.get(`${BASE_URL}/events/${TEST_TRIP_ID}/export-registrations`, {
      headers: headers.admin
    });
    console.log('✅ Export for trip with no registrations:', response.data.message);
  } catch (error) {
    console.log('❌ Export for trip failed:', error.response?.data || error.message);
  }
}

async function testEventRestrictions() {
  console.log('\n🔒 Testing Event Restrictions');

  // First, create a restricted event
  try {
    const createResponse = await axios.post(`${BASE_URL}/events`, {
      title: 'Restricted Test Event',
      description: 'Only specific users can register',
      type: 'workshop',
      startDate: '2025-12-01T10:00:00Z',
      endDate: '2025-12-01T12:00:00Z',
      location: 'Test Location',
      isRestricted: true,
      allowedUsers: ['USER_ID_HERE'] // Replace with actual user ID
    }, { headers: headers.admin });

    const eventId = createResponse.data._id;
    console.log(`✅ Created restricted event: ${eventId}`);

    // Test registration with allowed user (should work)
    try {
      const registerResponse = await axios.post(`${BASE_URL}/events/${eventId}/register`, {}, {
        headers: headers.allowed
      });
      console.log('✅ Registration with allowed user successful');
    } catch (error) {
      console.log('❌ Registration with allowed user failed:', error.response?.data || error.message);
    }

    // Test registration with regular user (should fail)
    try {
      const registerResponse = await axios.post(`${BASE_URL}/events/${eventId}/register`, {}, {
        headers: headers.user
      });
      console.log('❌ Registration with regular user should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Registration with regular user correctly failed:', error.response.data.msg);
      } else {
        console.log('❌ Registration with regular user failed with wrong error:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.log('❌ Creating restricted event failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Admin Event Features Tests...');

  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'YOUR_ADMIN_JWT_TOKEN') {
    console.log('❌ Please set your actual tokens in the script first!');
    return;
  }

  await testDeleteEvent();
  await testGenerateQR();
  await testExportRegistrations();
  await testEventRestrictions();

  console.log('\n🎯 All tests completed!');
}

// Uncomment to run tests
// runTests();

module.exports = { runTests };