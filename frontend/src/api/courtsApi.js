import axios from 'axios';

// Base URL for courts API endpoints
const COURTS_API_BASE = 'http://localhost:5000/api/courts';

// Create axios instance with default config
const courtsApi = axios.create({
  baseURL: COURTS_API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
courtsApi.interceptors.request.use(
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
courtsApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const courtsApiService = {
  // Get all courts for students
  getCourts: async (queryParams = {}) => {
    try {
      console.log('🏀 API: Getting courts with params:', queryParams);
      const response = await courtsApi.get('/student', { params: queryParams });
      console.log('🏀 API: Response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching courts:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch courts',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get court by ID
  getCourtById: async (courtId) => {
    try {
      const response = await courtsApi.get(`/${courtId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching court:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch court',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get courts by type
  getCourtsByType: async (type, queryParams = {}) => {
    try {
      console.log('🏀 API: Getting courts by type:', type, 'with params:', queryParams);
      const response = await courtsApi.get(`/type/${type}`, { params: queryParams });
      console.log('🏀 API: Response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching courts by type:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch courts',
        error: error.response?.data || error.message,
      };
    }
  },
};

export default courtsApiService;
