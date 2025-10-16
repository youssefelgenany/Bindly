import axios from 'axios';

const api = axios.create({
    baseURL: '/api/vendor',
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
    }
};

export default vendorApi;


