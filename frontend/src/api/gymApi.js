import axios from 'axios';

const gymApi = axios.create({
  baseURL: '/api/gym',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token if available (some endpoints may require auth)
gymApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const gymApiService = {
  getMonthlySessions: async (year, month) => {
    try {
      const qs = new URLSearchParams();
      if (year) qs.append('year', year);
      if (month !== undefined) qs.append('month', month);
      const res = await gymApi.get(`/sessions?${qs.toString()}`);
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to load gym sessions' };
    }
  },

  createSession: async (payload) => {
    try {
      const res = await gymApi.post('/sessions', payload);
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to create session' };
    }
  },
};

export default gymApiService;


