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

  // Assign role and send verification email (for Staff/TA/Professor registration requests)
  assignRoleAndSendVerification: async (userId, role) => {
    try {
      console.log('📧 Calling assignRoleAndSendVerification:', { userId, role });
      const response = await adminApi.post('/users/assign-role-and-verify', { userId, role });
      console.log('✅ Response from backend:', response.data);
      
      // Backend returns { msg: "...", token: "...", emailSent: true/false }
      const message = response.data?.msg || response.data?.message || 'Role assigned and verification email sent successfully';
      const emailSent = response.data?.emailSent !== false; // Default to true if not specified
      
      return {
        success: true,
        data: response.data,
        message: message,
        emailSent: emailSent,
        emailError: response.data?.emailError
      };
    } catch (error) {
      console.error('❌ Error assigning role and sending verification:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.msg || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to assign role and send verification email';
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message,
        emailSent: false
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
      console.log('🗑️ Deleting event:', eventId);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await axios.delete(`http://localhost:5000/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Event deleted successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to delete event',
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

  // Send verification email to user
  sendVerificationEmail: async (userId) => {
    try {
      const url = `/users/${userId}/send-verification-email`;
      console.log('🌐 Making send verification email API call to:', url);
      console.log('📊 User ID:', userId);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      console.log('🔑 Full URL will be:', `/api/admin${url}`);
      
      const response = await adminApi.post(url);
      
      console.log('✅ Send Verification Email Response:', response.data);
      console.log('✅ Response Status:', response.status);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send verification email',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get attendees report
  getAttendeesReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.eventName) params.append('eventName', filters.eventName);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await adminApi.get(`/reports/attendees?${params.toString()}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching attendees report:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch attendees report',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get sales report
  getSalesReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      
      const response = await adminApi.get(`/reports/sales?${params.toString()}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching sales report:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sales report',
        error: error.response?.data || error.message,
      };
    }
  },

  // Block a user account
  blockUser: async (userId, reason = null) => {
    try {
      const response = await adminApi.post(`/users/${userId}/block`, reason ? { reason } : {});
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'User blocked successfully',
      };
    } catch (error) {
      console.error('Error blocking user:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to block user',
        error: error.response?.data || error.message,
      };
    }
  },

  // Unblock a user account
  unblockUser: async (userId) => {
    try {
      const response = await adminApi.post(`/users/${userId}/unblock`);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'User unblocked successfully',
      };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unblock user',
        error: error.response?.data || error.message,
      };
    }
  },
};

export default adminApiService;
