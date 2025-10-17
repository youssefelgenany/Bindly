import axios from 'axios';

// Base URL for admin API endpoints
const ADMIN_API_BASE = 'http://localhost:5000/api/admin';

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
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Do NOT force logout/redirect for admin activation wrong password case
    const isAdminStatusEndpoint = error.config?.url?.includes('/users/') && error.config?.url?.includes('/status');
    const isAdminVerifyEndpoint = error.config?.url?.includes('/users/') && error.config?.url?.includes('/verification');
    const isWrongActivationPassword = message === 'Invalid confirmation password';
    if (status === 401 && (isAdminStatusEndpoint || isAdminVerifyEndpoint) && isWrongActivationPassword) {
      return Promise.reject(error); // let caller handle and show modal error
    }

    if (status === 401) {
      // Token expired or invalid → logout and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
      return; // safety
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
  updateUserStatus: async (userId, isActive, confirmationPassword) => {
    try {
      const response = await adminApi.patch(`/users/${userId}/status`, { isActive, confirmationPassword });
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
      
      const url = `http://localhost:5000/api/events/admin/all?${queryParams}`;
      console.log('🌐 Making API call to:', url);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
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
      const url = `http://localhost:5000/api/events/${eventId}`;
      const data = { status };
      console.log('🌐 Making event status update API call to:', url);
      console.log('📊 Event ID:', eventId);
      console.log('📊 New Status:', status);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await axios.put(url, data, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Event Status Update Response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating event status:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
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
      const response = await axios.delete(`http://localhost:5000/api/events/${eventId}`, {
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
      const url = `/vendors/${vendorId}/verification`;
      const data = { isVerified };
      console.log('🌐 Making vendor verification API call to:', url);
      console.log('📊 Vendor ID:', vendorId);
      console.log('📊 Is Verified:', isVerified);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await adminApi.put(url, data);
      
      console.log('✅ Vendor Verification Response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating vendor verification:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
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
      const url = `/vendors/${vendorId}/status`;
      const data = { status };
      console.log('🌐 Making vendor status API call to:', url);
      console.log('📊 Vendor ID:', vendorId);
      console.log('📊 New Status:', status);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await adminApi.put(url, data);
      
      console.log('✅ Vendor Status Response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating vendor status:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update vendor status',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update user verification status
  updateUserVerification: async (userId, isVerified, confirmationPassword) => {
    try {
      const url = `/users/${userId}/verification`;
      const data = { isVerified, confirmationPassword };
      console.log('🌐 Making user verification API call to:', url);
      console.log('📊 User ID:', userId);
      console.log('📊 Is Verified:', isVerified);
      console.log('📊 Request Data:', data);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      console.log('🔑 Full URL will be:', `/api/admin${url}`);
      
      const response = await adminApi.put(url, data);
      
      console.log('✅ User Verification Response:', response.data);
      console.log('✅ Response Status:', response.status);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating user verification:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update user verification',
        error: error.response?.data || error.message,
      };
    }
  },
};

export default adminApiService;
