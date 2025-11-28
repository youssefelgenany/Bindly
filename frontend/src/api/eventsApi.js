import axios from 'axios';

// Public Events API (non-admin) - YOUR FRIEND'S CODE
const eventsApi = axios.create({
  baseURL: 'http://localhost:5000/api/events',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Ensure Authorization header is attached for protected endpoints
eventsApi.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (_) {}
  return config;
});

export const eventsApiService = {
  // Fetch approved/upcoming events with optional search and type filters
  getPublicEvents: async (filters = {}) => {
    try {
      const query = new URLSearchParams();
      if (filters.q) query.append('q', filters.q);
      if (filters.type) query.append('type', filters.type);
      if (filters.when) query.append('when', filters.when);

      const url = `/public?${query.toString()}`;
      const response = await eventsApi.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch events',
        error: error.response?.data || error.message,
      };
    }
  },

  // Authenticated: fetch events visible to logged-in users
  getAllEventsAuthenticated: async (params = {}) => {
    try {
      console.log('getAllEventsAuthenticated called with params:', params);
      const query = new URLSearchParams();
      if (params.q) query.append('q', params.q);
      if (params.type) query.append('type', params.type);
      if (params.status) query.append('status', params.status);

      const suffix = query.toString() ? `?${query.toString()}` : '';
      const url = `/${suffix}`;
      console.log('Making request to:', url);
      
      const response = await eventsApi.get(url);
      console.log('Response received:', response.status, response.data);
      
      const payload = response.data;
      // Backend getAllEvents returns an array; admin endpoint returns { events }
      const events = Array.isArray(payload) ? payload : (payload?.events || []);
      return { success: true, data: events };
    } catch (error) {
      console.error('getAllEventsAuthenticated error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch events',
        error: error.response?.data || error.message,
      };
    }
  },

  deleteEvent: async (id) => {
    try {
      const response = await eventsApi.delete(`/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to delete event',
        error: error.response?.data || error.message,
      };
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const response = await eventsApi.put(`/${id}`, eventData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to update event',
        error: error.response?.data || error.message,
      };
    }
  },

  updateEventStatus: async (id, statusData) => {
    try {
      const response = await eventsApi.put(`/${id}`, statusData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to update event status',
        error: error.response?.data || error.message,
      };
    }
  },

  // Fetch events for students with vendor details for bazaars
  getStudentEvents: async (filters = {}) => {
    try {
      const query = new URLSearchParams();
      if (filters.q) query.append('q', filters.q);
      if (filters.type) query.append('type', filters.type);
      if (filters.status) query.append('status', filters.status);
      
      // Use the student-specific endpoint
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const url = `/student${suffix}`;
      console.log('🔍 API call URL:', url);
      const response = await eventsApi.get(url);
      // Backend returns { success: true, events: [...] }
      const events = Array.isArray(response.data) ? response.data : (response.data?.events || []);
      return { success: true, data: events };
    } catch (error) {
      console.error('🔍 API error:', error);
      console.error('🔍 Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch events',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // 📦 Archive an event (Events Office only)
  archiveEvent: async (id) => {
    try {
      const response = await eventsApi.post(`/${id}/archive`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to archive event',
        error: error.response?.data || error.message,
      };
    }
  },
  // 📦 Unarchive an event (Events Office only)
  unarchiveEvent: async (id) => {
    try {
      const response = await eventsApi.post(`/${id}/unarchive`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to unarchive event',
        error: error.response?.data || error.message,
      };
    }
  },
  // 📦 Get archived events (Events Office only)
  getArchivedEvents: async (params = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.q) query.append('q', params.q);
      if (params.type) query.append('type', params.type);

      const suffix = query.toString() ? `?${query.toString()}` : '';
      const url = `/archived${suffix}`;
      console.log('🔍 Fetching archived events from:', url);
      const response = await eventsApi.get(url);
      console.log('🔍 Archived events response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Response data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('🔍 Response data length:', Array.isArray(response.data) ? response.data.length : 'not an array');
      
      // Backend returns an array directly
      const events = Array.isArray(response.data) ? response.data : [];
      return { success: true, data: events };
    } catch (error) {
      console.error('❌ Error fetching archived events:', error);
      console.error('❌ Error response:', error.response);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch archived events',
        error: error.response?.data || error.message,
      };
    }
  },
  // 👤 Get logged-in user's event registrations (for Staff/TA/Professor/Student)
  getMyRegistrations: async () => {
    try {
      const response = await eventsApi.get('/my/registrations');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch registrations',
        error: error.response?.data || error.message,
      };
    }
  },

  // 💬 Get comments for an event
  getComments: async (eventId) => {
    try {
      const response = await eventsApi.get(`/${eventId}/comments`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch comments',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // ⭐ Get ratings and comments for an event
  getRatingsAndComments: async (eventId) => {
    try {
      const response = await eventsApi.get(`/${eventId}/ratings`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch ratings and comments',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // 💬 Submit a comment on an event
  submitComment: async (eventId, text) => {
    try {
      const response = await eventsApi.post(`/${eventId}/comments`, { text });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to submit comment',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // 🗑️ Delete a comment (owner or admin)
  deleteComment: async (eventId, commentId, reason = null) => {
    try {
      // For DELETE with body, we need to use axios directly with config
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Add body if reason is provided
      if (reason) {
        config.data = { reason };
      }
      
      const response = await eventsApi.delete(`/${eventId}/comments/${commentId}`, config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to delete comment',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // ⭐ Get user's favorite events
  getFavoriteEvents: async () => {
    try {
      const response = await eventsApi.get('/favorites');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch favorite events',
        error: error.response?.data || error.message,
      };
    }
  },

  // ⭐ Submit a rating for an event (1-5 stars)
  submitRating: async (eventId, rating) => {
    try {
      const response = await eventsApi.post(`/${eventId}/ratings`, { rating });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to submit rating',
        error: error.response?.data || error.message,
      };
    }
  },

  // ⭐ Add event to favorites
  addToFavorites: async (eventId) => {
    try {
      const response = await eventsApi.post(`/${eventId}/favorite`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to add event to favorites',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // ⭐ Remove event from favorites
  removeFromFavorites: async (eventId) => {
    try {
      const response = await eventsApi.delete(`/${eventId}/favorite`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to remove event from favorites',
        error: error.response?.data || error.message,
      };
    }
  },

  // 📊 Get ratings and comments for an event
  getRatingsAndComments: async (eventId) => {
    try {
      const response = await eventsApi.get(`/${eventId}/ratings`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch ratings and comments',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // 💳 Pay for an event
  payForEvent: async (eventId, paymentData) => {
    try {
      const response = await eventsApi.post(`/${eventId}/pay`, paymentData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Payment failed',
        error: error.response?.data || error.message,
      };
    }
  },
  
  // 🚫 Cancel event registration
  cancelRegistration: async (eventId) => {
    try {
      const response = await eventsApi.delete(`/${eventId}/register`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to cancel registration',
        error: error.response?.data || error.message,
      };
    }
  },

  // 💰 Get wallet transactions
  getWalletTransactions: async () => {
    try {
      const response = await eventsApi.get('/wallet/transactions');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch wallet transactions',
        error: error.response?.data || error.message,
      };
    }
  },

  // 📧 Send QR codes to all accepted vendors for an event
  sendQRCodesToVendors: async (eventId) => {
    try {
      const response = await eventsApi.post(`/${eventId}/send-qr-codes`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to send QR codes',
        error: error.response?.data || error.message,
      };
    }
  }
};

// ✅ ADD YOUR BAZAAR & TRIP APIs HERE
const API_BASE = 'http://localhost:5000/api';

export const bazaarApi = {
  create: async (bazaarData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        message: 'No authentication token found. Please log in again.'
      };
    }

    const response = await fetch(`${API_BASE}/bazaars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bazaarData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return {
          success: false,
          message: data.msg || data.message || 'Invalid/expired token. Please log in again.',
          error: data,
          requiresLogin: true
        };
      }
      
      return {
        success: false,
        message: data.message || data.error || data.msg || 'Failed to create bazaar',
        error: data
      };
    }
    return {
      success: true,
      ...data
    };
  },

  update: async (id, bazaarData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/bazaars/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(bazaarData),
    });
    return await response.json();
  },

  list: async (query = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    const url = `${API_BASE}/bazaars?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return await response.json();
  },

  register: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/bazaars/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return await response.json();
  }
};

export const tripApi = {
  create: async (tripData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  },

  update: async (id, tripData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  }
};

export default eventsApiService;
