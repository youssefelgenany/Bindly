// Base URL for your backend
const API_BASE = 'http://localhost:5000/api';

// BAZAAR API - matches your bazaarRoutes.js and bazaarModel.js
export const bazaarApi = {
  create: async (bazaarData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/bazaars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(bazaarData),
    });
    return await response.json();
  },

  update: async (id, bazaarData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/bazaars/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(bazaarData),
    });
    return await response.json();
  }
};

// TRIP API - matches your tripRoutes.js and tripModel.js
export const tripApi = {
  create: async (tripData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  },

  update: async (id, tripData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(tripData),
    });
    return await response.json();
  }
};