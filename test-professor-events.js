// Test script to verify professor events endpoint
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testProfessorEvents() {
  try {
    console.log('🧪 Testing Professor Events Integration...');
    
    // First, let's test if the server is running
    const healthCheck = await axios.get('http://localhost:5000/');
    console.log('✅ Server is running:', healthCheck.data);
    
    // Test the professor events endpoint (this will fail without auth, but we can see the response)
    try {
      const response = await axios.get(`${BASE_URL}/events/my/events`);
      console.log('✅ Professor events endpoint accessible:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Professor events endpoint requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    console.log('🎯 Integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProfessorEvents();

