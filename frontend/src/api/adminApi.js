import axios from 'axios';

// Base URL for admin API endpoints
const ADMIN_API_BASE = '/api/admin';

// Create axios instance with default config
const adminApi = axios.create({
  baseURL: ADMIN_API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
adminApi.interceptors.request.use(
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

// Add response interceptor for error handling
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Admin API functions
export const adminApiService = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await adminApi.get('/users');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch users',
        error: error.response?.data || error.message,
      };
    }
  },

  // Create admin or event office account
  createAdminAccount: async (accountData) => {
    try {
      const response = await adminApi.post('/accounts', accountData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error creating admin account:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create account',
        error: error.response?.data || error.message,
      };
    }
  },

  // Delete admin or event office account
  deleteAdminAccount: async (accountId) => {
    try {
      const response = await adminApi.delete(`/accounts/${accountId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error deleting admin account:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete account',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    try {
      const response = await adminApi.put(`/users/${userId}/role`, { role });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update user role',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update user status (activate/deactivate)
  updateUserStatus: async (userId, isActive) => {
    try {
      const response = await adminApi.patch(`/users/${userId}/status`, { isActive });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update user status',
        error: error.response?.data || error.message,
      };
    }
  },

  // Change admin password
  changePassword: async (passwordData) => {
    try {
      const response = await adminApi.put('/change-password', passwordData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update admin profile
  updateProfile: async (profileData) => {
    try {
      const response = await adminApi.put('/profile', profileData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get all events for admin management
  getAllEvents: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append('q', filters.q);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.status) queryParams.append('status', filters.status);
      
      const url = `/api/events/admin/all?${queryParams}`;
      console.log('🌐 Making API call to:', url);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      // Use the events API directly since it's not under /api/admin
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ API Response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      console.error('❌ Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch events',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update event status
  updateEventStatus: async (eventId, status) => {
    try {
      const response = await axios.put(`/api/events/${eventId}`, { status }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating event status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update event status',
        error: error.response?.data || error.message,
      };
    }
  },

  // Delete event
  deleteEvent: async (eventId) => {
    try {
      const response = await axios.delete(`/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get all vendors for admin management
  getAllVendors: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append('q', filters.q);
      if (filters.status) queryParams.append('status', filters.status);
      
      const url = `/api/admin/vendors?${queryParams}`;
      console.log('🌐 Making vendor API call to:', url);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await adminApi.get(`/vendors?${queryParams}`);
      
      console.log('✅ Vendor API Response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching vendors:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch vendors',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update vendor verification status
  updateVendorVerification: async (vendorId, isVerified) => {
    try {
      const response = await adminApi.put(`/vendors/${vendorId}/verification`, { isVerified });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating vendor verification:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update vendor verification',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update vendor status (active/blocked)
  updateVendorStatus: async (vendorId, status) => {
    try {
      const response = await adminApi.put(`/vendors/${vendorId}/status`, { status });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error updating vendor status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update vendor status',
        error: error.response?.data || error.message,
      };
    }
  },
};

export default adminApiService;
