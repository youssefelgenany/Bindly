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

    // Fetch standalone booths from the events collection
    listStandaloneBooths: async (filters = {}) => {
        try {
            // Use the existing vendor API endpoint to fetch standaloneBooth type
            const res = await api.get('/events/upcoming', { params: { type: 'standaloneBooth' } });
            let booths = res.data || [];
            
            // Apply client-side filtering if needed
            if (filters.q) {
                const query = filters.q.toLowerCase();
                booths = booths.filter(booth => 
                    (booth.name || booth.title || '').toLowerCase().includes(query) ||
                    (booth.description || '').toLowerCase().includes(query) ||
                    (booth.location || '').toLowerCase().includes(query)
                );
            }
            
            if (filters.location) {
                booths = booths.filter(booth => 
                    (booth.location || '').toLowerCase().includes(filters.location.toLowerCase())
                );
            }
            
            if (filters.status) {
                booths = booths.filter(booth => booth.status === filters.status);
            }
            
            return booths;
        } catch (error) {
            console.error('Error fetching standalone booths:', error);
            throw error;
        }
    },

    applyToEvent: async (payload) => {
        // If payload is FormData (file included), send multipart request
        if (payload instanceof FormData) {
            // Let axios set the correct Content-Type with boundary for FormData
            const res = await api.post('/apply', payload);
            return res.data;
        }

        const { eventType, eventId, attendees, boothSize, durationWeeks, boothLocation, message } = payload;
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
    },

    // Get loyalty program vendors
    getLoyaltyProgramVendors: async () => {
        try {
            const res = await api.get('/loyalty-program/vendors');
            return res.data;
        } catch (error) {
            console.error('Error fetching loyalty program vendors:', error);
            throw error;
        }
    }
,
    // Apply to loyalty program (vendor)
    applyToLoyaltyProgram: async (payload) => {
        // payload is JSON body with discountRate, discountType, promoCode, termsAndConditions, validFrom, validUntil, description, category
        const res = await api.post('/loyalty-program/apply', payload);
        return res.data;
    },

    // Get my loyalty application
    getMyLoyaltyApplication: async () => {
        const res = await api.get('/loyalty-program/my-application');
        return res.data;
    }
    ,
    // Cancel my loyalty application
    cancelMyLoyaltyApplication: async () => {
        const res = await api.delete('/loyalty-program/my-application');
        return res.data;
    }
};

export default vendorApi;


