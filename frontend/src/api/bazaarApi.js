const axios = require('axios');

// Use the correct backend API URL
const API_URL = 'http://localhost:5000/api/bazaars';  // Update this if your backend is hosted elsewhere

export const getUpcomingBazaars = async () => {
    try {
        const response = await axios.get(`${API_URL}?type=bazaar`);
        return response.data;
    } catch (error) {
        console.error('Error fetching bazaars:', error);
        throw error;
    }
};

