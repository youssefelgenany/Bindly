import axios from 'axios';

const gymApi = axios.create({
  baseURL: 'http://localhost:5000/api/gym',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// attach bearer token if stored in localStorage (optional)
gymApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

export const gymApiService = {
  getMonthlySessions: async (year, month) => {
    try {
      const qs = new URLSearchParams();
      if (year) qs.append('year', year);
      if (month !== undefined) qs.append('month', month);
      const res = await gymApi.get(`/month?${qs.toString()}`);
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to load gym sessions' };
    }
  },

  createSession: async (payload) => {
    try {
      const res = await gymApi.post('/', payload);
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to create session' };
    }
  },
};

// Export axios instance as default so other files can call gymApi.post(...)
export default gymApi;


