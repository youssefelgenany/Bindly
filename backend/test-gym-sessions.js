// Test script for gym session management features
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials
const ADMIN_EMAIL = 'testadmin@test.com';
const ADMIN_PASSWORD = 'test123';

let ADMIN_TOKEN = '';
let USER_TOKEN = '';

const headers = {
  get admin() { return { Authorization: `Bearer ${ADMIN_TOKEN}` }; },
  get user() { return { Authorization: `Bearer ${USER_TOKEN}` }; }
};

async function loginAdmin() {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    ADMIN_TOKEN = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.log('❌ Admin login failed');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Message:', error.message);
    return false;
  }
}

async function testGymSessionFeatures() {
  console.log('🏋️ Testing Gym Session Management Features\n');

  // Login first
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }

  try {
    // Test 1: Get all gym sessions with filtering
    console.log('1️⃣ Testing Get All Gym Sessions with Filtering');
    const sessionsResponse = await axios.get(`${BASE_URL}/gym-sessions/admin/all`, {
      headers: headers.admin,
      params: { type: 'cardio', limit: 5 }
    });
    console.log('✅ Get sessions successful:', sessionsResponse.data.length, 'sessions found');

    // Test 2: Create a gym session
    console.log('\n2️⃣ Testing Create Gym Session');
    const createResponse = await axios.post(`${BASE_URL}/gym-sessions`, {
      date: '2025-12-15',
      time: '10:00',
      duration: 60,
      type: 'strength',
      maxParticipants: 20,
      instructor: 'John Doe',
      location: 'Main Gym',
      description: 'Strength training session'
    }, { headers: headers.admin });

    const sessionId = createResponse.data._id;
    console.log('✅ Created gym session:', sessionId);

    // Test 3: Update gym session
    console.log('\n3️⃣ Testing Update Gym Session');
    const updateResponse = await axios.put(`${BASE_URL}/gym-sessions/${sessionId}`, {
      maxParticipants: 25,
      description: 'Updated strength training session'
    }, { headers: headers.admin });
    console.log('✅ Updated gym session successfully');

    // Test 4: Bulk update gym sessions
    console.log('\n4️⃣ Testing Bulk Update Gym Sessions');
    const bulkUpdateResponse = await axios.put(`${BASE_URL}/gym-sessions/bulk/update`, {
      sessionIds: [sessionId],
      updates: { location: 'Updated Gym Location' }
    }, { headers: headers.admin });
    console.log('✅ Bulk update successful:', bulkUpdateResponse.data.message);

    // Test 5: Get gym session statistics
    console.log('\n5️⃣ Testing Get Gym Session Statistics');
    const statsResponse = await axios.get(`${BASE_URL}/gym-sessions/admin/stats`, {
      headers: headers.admin
    });
    console.log('✅ Stats retrieved:', statsResponse.data);

    // Test 6: Delete gym session
    console.log('\n6️⃣ Testing Delete Gym Session');
    const deleteResponse = await axios.delete(`${BASE_URL}/gym-sessions/${sessionId}`, {
      headers: headers.admin
    });
    console.log('✅ Deleted gym session successfully');

    console.log('\n🎉 All gym session tests passed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('No response received');
    }
  }
}

// Run the tests
testGymSessionFeatures();