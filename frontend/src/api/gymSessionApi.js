const API_BASE = 'http://localhost:5000/api';

export const gymSessionApi = {
  create: async (gymSessionData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/gym-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(gymSessionData),
    });
    return await response.json();
  },

  getAll: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/gym-sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  },

  getById: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/gym-sessions/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  },

  update: async (id, gymSessionData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/gym-sessions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(gymSessionData),
    });
    return await response.json();
  },

  delete: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/gym-sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  }
};
