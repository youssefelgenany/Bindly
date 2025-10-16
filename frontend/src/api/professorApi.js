import axios from 'axios';

// Base URL for professor API endpoints
const PROFESSOR_API_BASE = '/api';

// Create axios instance with default config
const professorApi = axios.create({
  baseURL: PROFESSOR_API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
professorApi.interceptors.request.use(
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
professorApi.interceptors.response.use(
  (response) => response,
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

// Professor API functions
export const professorApiService = {
  // Get all approved events (visible to all logged-in users)
  getAllEvents: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append('q', filters.q);
      if (filters.type) queryParams.append('type', filters.type);
      const url = `/events?${queryParams.toString()}`;
      const response = await professorApi.get(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch events',
        error: error.response?.data || error.message,
      };
    }
  },

  // Register logged-in user for an event
  registerForEvent: async (eventId) => {
    try {
      const response = await professorApi.post(`/events/${eventId}/register`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register for event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get all bazaars (visible to all logged-in users)
  getAllBazaars: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append('q', filters.q);
      const url = `/bazaars?${queryParams.toString()}`;
      const response = await professorApi.get(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch bazaars',
        error: error.response?.data || error.message,
      };
    }
  },

  // Register logged-in user for a bazaar
  registerForBazaar: async (bazaarId) => {
    try {
      const response = await professorApi.post(`/bazaars/${bazaarId}/register`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register for bazaar',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get monthly gym schedule
  getGymScheduleMonth: async ({ year, month } = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (year) queryParams.append('year', year);
      if (month) queryParams.append('month', month);
      const url = `/gym/month?${queryParams.toString()}`;
      const response = await professorApi.get(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch gym schedule',
        error: error.response?.data || error.message,
      };
    }
  },
  // Get events created by the logged-in professor
  getMyEvents: async () => {
    try {
      console.log('🎓 Fetching professor events...');
      const response = await professorApi.get('/events/my/events');
      console.log('✅ Professor events response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching professor events:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch professor events',
        error: error.response?.data || error.message,
      };
    }
  },

  // Create a new event (for professors)
  createEvent: async (eventData) => {
    try {
      console.log('🎯 Creating professor event:', eventData);
      console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      const response = await professorApi.post('/events', eventData);
      console.log('✅ Event created successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.msg || 'Failed to create event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update an existing event
  updateEvent: async (eventId, eventData) => {
    try {
      console.log('✏️ Updating event:', eventId, eventData);
      const response = await professorApi.put(`/events/${eventId}`, eventData);
      console.log('✅ Event updated successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating event:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Delete an event
  deleteEvent: async (eventId) => {
    try {
      console.log('❌ Deleting event:', eventId);
      const response = await professorApi.delete(`/events/${eventId}`);
      console.log('✅ Event deleted successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete event',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get event registrations for a specific event
  getEventRegistrations: async (eventId) => {
    try {
      console.log('👥 Fetching registrations for event:', eventId);
      const response = await professorApi.get(`/events/${eventId}/registrations`);
      console.log('✅ Event registrations response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching event registrations:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch event registrations',
        error: error.response?.data || error.message,
      };
    }
  },

  // Get announcements for professor's events
  getMyAnnouncements: async () => {
    try {
      console.log('📢 Fetching professor announcements...');
      const response = await professorApi.get('/announcements/my/announcements');
      console.log('✅ Professor announcements response:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch announcements',
        error: error.response?.data || error.message,
      };
    }
  },

  // Create a new announcement
  createAnnouncement: async (announcementData) => {
    try {
      console.log('📢 Creating announcement:', announcementData);
      const response = await professorApi.post('/announcements', announcementData);
      console.log('✅ Announcement created successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create announcement',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update an announcement
  updateAnnouncement: async (announcementId, announcementData) => {
    try {
      console.log('✏️ Updating announcement:', announcementId, announcementData);
      const response = await professorApi.put(`/announcements/${announcementId}`, announcementData);
      console.log('✅ Announcement updated successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating announcement:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update announcement',
        error: error.response?.data || error.message,
      };
    }
  },

  // Delete an announcement
  deleteAnnouncement: async (announcementId) => {
    try {
      console.log('❌ Deleting announcement:', announcementId);
      const response = await professorApi.delete(`/announcements/${announcementId}`);
      console.log('✅ Announcement deleted successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete announcement',
        error: error.response?.data || error.message,
      };
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      console.log('👤 Updating profile:', profileData);
      
      // Check if there's a file to upload
      const formData = new FormData();
      
      // Add all profile fields to FormData
      Object.keys(profileData).forEach(key => {
        if (key === 'avatarFile' && profileData[key]) {
          // Add the file with the correct field name expected by backend
          formData.append('profilePicture', profileData[key]);
        } else if (key !== 'avatarFile') {
          // Add other fields
          formData.append(key, profileData[key]);
        }
      });
      
      console.log('📤 Sending FormData with fields:', Array.from(formData.keys()));
      
      const response = await professorApi.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Profile updated successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
        error: error.response?.data || error.message,
      };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      console.log('🔒 Changing password...');
      const response = await professorApi.put('/auth/change-password', passwordData);
      console.log('✅ Password changed successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error changing password:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password',
        error: error.response?.data || error.message,
      };
    }
  },

  // Dashboard API functions
  getDashboardStats: async () => {
    try {
      console.log('📊 Fetching dashboard stats...');
      const response = await professorApi.get('/dashboard/professor/stats');
      console.log('✅ Dashboard stats fetched successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch dashboard stats',
        error: error.response?.data || error.message,
      };
    }
  },

  getDashboardNotifications: async () => {
    try {
      console.log('🔔 Fetching dashboard notifications...');
      const response = await professorApi.get('/dashboard/professor/notifications');
      console.log('✅ Dashboard notifications fetched successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard notifications:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch dashboard notifications',
        error: error.response?.data || error.message,
      };
    }
  },
};

export default professorApiService;
