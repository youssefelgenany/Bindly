import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const studentRegistrationApi = {
  // Register a student for a workshop or trip
  register: async (eventId, registrationData) => {
    try {
      const response = await axios.post(`${API_BASE}/student-registrations/${eventId}/register`, registrationData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register for event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get student registrations by email
  getMyRegistrations: async (email) => {
    try {
      const response = await axios.get(`${API_BASE}/student-registrations/my-registrations?email=${encodeURIComponent(email)}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching my registrations:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch registrations';
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message,
      };
    }
  },

  // Get registrations for a specific event (for organizers)
  getEventRegistrations: async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/student-registrations/${eventId}/registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch registrations',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get all student registrations (admin only)
  getAllRegistrations: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/student-registrations/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching all registrations:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch registrations',
        error: error.response?.data || error.message,
      };
    }
  }
};

export default studentRegistrationApi;
