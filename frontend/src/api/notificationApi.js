import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const notificationApi = axios.create({
  baseURL: `${API_BASE}/notifications`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Ensure Authorization header is attached
notificationApi.interceptors.request.use((config) => {
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

export const notificationApiService = {
  // Get user notifications
  getUserNotifications: async (options = {}) => {
    try {
      const { limit = 50, skip = 0, unreadOnly = false } = options;
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (skip) params.append('skip', skip);
      if (unreadOnly) params.append('unreadOnly', 'true');
      
      const response = await notificationApi.get(`/?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get notifications by type (e.g., vendor_request)
  getNotificationsByType: async (type, options = {}) => {
    try {
      const { limit = 50, skip = 0 } = options;
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (skip) params.append('skip', skip);

      const queryString = params.toString();
      const response = await notificationApi.get(`/by-type/${type}?${queryString}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || `Failed to fetch ${type} notifications`,
        error: error.response?.data || error.message,
      };
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await notificationApi.get('/unread-count');
      return { success: true, unreadCount: response.data.unreadCount || 0 };
    } catch (error) {
      return {
        success: false,
        unreadCount: 0,
        message: error.response?.data?.message || 'Failed to fetch unread count',
        error: error.response?.data || error.message,
      };
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await notificationApi.put(`/${notificationId}/read`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark notification as read',
        error: error.response?.data || error.message,
      };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await notificationApi.put('/mark-all-read');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark all as read',
        error: error.response?.data || error.message,
      };
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await notificationApi.delete(`/${notificationId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete notification',
        error: error.response?.data || error.message,
      };
    }
  }
};

export default notificationApiService;

