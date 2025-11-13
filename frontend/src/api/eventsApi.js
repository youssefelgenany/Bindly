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
      
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const url = `/student${suffix}`;
      console.log('🔍 API call URL:', url);
      const response = await eventsApi.get(url);
      return { success: true, data: response.data.events || [] };
    } catch (error) {
      console.error('🔍 API error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch student events',
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