import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api/vendor',
    timeout: 10000
});

// Attach token if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const vendorApi = {
    listUpcoming: async (type) => {
        const res = await api.get('/events/upcoming', { params: { type } });
        return res.data;
    },

    applyToEvent: async ({ eventType, eventId, attendees, boothSize, durationWeeks, boothLocation, message }) => {
        const res = await api.post('/apply', {
            eventType,
            eventId,
            attendees,
            boothSize,
            durationWeeks,
            boothLocation,
            message
        });
        return res.data;
    },

    // List upcoming events the current vendor is accepted for
    listMyAccepted: async (type) => {
        const res = await api.get('/my/upcoming', { params: { type } });
        return res.data;
    },

    // List pending or rejected upcoming requests (optional filter by type)
    listMyRequests: async ({ status = 'pending', type } = {}) => {
        console.log('🔍 vendorApi.listMyRequests - Making request with params:', { status, type });
        try {
            const res = await api.get('/my/requests', { params: { status, type } });
            console.log('✅ vendorApi.listMyRequests - Response:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ vendorApi.listMyRequests - Error:', error);
            console.error('❌ vendorApi.listMyRequests - Error response:', error.response?.data);
            throw error;
        }
    }
};

export default vendorApi;


