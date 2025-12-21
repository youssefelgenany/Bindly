import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const courtApi = axios.create({
  baseURL: `${API_BASE_URL}/api/courts`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
courtApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Court API functions
export const courtApiService = {
  // Get all courts
  getAllCourts: async (params = {}) => {
    try {
      const response = await courtApi.get('/', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching courts:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch courts',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get court availability
  getCourtAvailability: async (courtId, date) => {
    try {
      const response = await courtApi.get(`/${courtId}/availability/${date}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching court availability:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch court availability',
        error: error.response?.data || error.message,
      };
    }
  },

  // Book a court
  bookCourt: async (bookingData) => {
    try {
      const response = await courtApi.post('/book', bookingData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error booking court:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to book court',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get user's bookings
  getMyBookings: async (params = {}) => {
    try {
      const response = await courtApi.get('/my-bookings', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching my bookings:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch bookings',
        error: error.response?.data || error.message,
      };
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    try {
      const response = await courtApi.patch(`/bookings/${bookingId}/cancel`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel booking',
        error: error.response?.data || error.message,
      };
    }
  },

  // Admin: Get all bookings
  getAllBookings: async (params = {}) => {
    try {
      const response = await courtApi.get('/admin/all-bookings', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch all bookings',
        error: error.response?.data || error.message,
      };
    }
  },

  // Admin: Update booking status
  updateBookingStatus: async (bookingId, status) => {
    try {
      const response = await courtApi.patch(`/admin/bookings/${bookingId}/status`, { status });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating booking status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update booking status',
        error: error.response?.data || error.message,
      };
    }
  },
};
