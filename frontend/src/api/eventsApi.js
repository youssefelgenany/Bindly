import axios from 'axios';

// Public Events API (non-admin)
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
      if (filters.when) query.append('when', filters.when); // upcoming | past | today | this-week

      const url = `/public?${query.toString()}`; // expect backend to expose /api/events/public
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

export default eventsApiService;


