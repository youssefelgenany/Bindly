import axios from 'axios';

// Public Events API (non-admin) - YOUR FRIEND'S CODE
const eventsApi = axios.create({
  baseURL: '/api/events',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
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
  }
};

// ✅ ADD YOUR BAZAAR & TRIP APIs HERE
const API_BASE = 'http://localhost:5000/api';

export const bazaarApi = {
  create: async (bazaarData) => {
    const response = await fetch(`${API_BASE}/bazaars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bazaarData),
    });
    return await response.json();
  },

  update: async (id, bazaarData) => {
    const response = await fetch(`${API_BASE}/bazaars/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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