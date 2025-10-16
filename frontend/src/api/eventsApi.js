import axios from 'axios';

// Public Events API (non-admin) - YOUR FRIEND'S CODE
const eventsApi = axios.create({
  baseURL: '/api/events',
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
      const query = new URLSearchParams();
      if (params.q) query.append('q', params.q);
      if (params.type) query.append('type', params.type);
      if (params.status) query.append('status', params.status);

      const suffix = query.toString() ? `?${query.toString()}` : '';
      const response = await eventsApi.get(`/${suffix}`);
      const payload = response.data;
      // Backend getAllEvents returns an array; admin endpoint returns { events }
      const events = Array.isArray(payload) ? payload : (payload?.events || []);
      return { success: true, data: events };
    } catch (error) {
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
  }
};

// ✅ ADD YOUR BAZAAR & TRIP APIs HERE
const API_BASE = 'http://localhost:5000/api';

export const bazaarApi = {
  create: async (bazaarData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/bazaars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(bazaarData),
    });
    return await response.json();
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
  }
};

export const tripApi = {
  create: async (tripData) => {
    const response = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  },

  update: async (id, tripData) => {
    const response = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  }
};

export default eventsApiService;