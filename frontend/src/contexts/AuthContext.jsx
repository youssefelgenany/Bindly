import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    if (token) {
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // You could verify the token here by making an API call
      // For now, we'll just set the user from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { user: userData, token } = response.data;
      
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        return { success: false, message: 'Network error. Please check your connection and ensure the backend server is running.' };
      } else {
        return { success: false, message: `Login failed: ${error.message}` };
      }
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post('/api/auth/signup', userData);
      
      const { user: newUser, token, requiresVerification } = response.data;
      
      // Don't automatically log in the user after signup
      // Just return success - user will need to login manually
      
      return { 
        success: true, 
        user: newUser, 
        message: 'Account created successfully',
        requiresVerification: requiresVerification || false
      };
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle different types of errors
      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => err.msg).join(', ');
        return { success: false, message: `Validation failed: ${errorMessages}` };
      } else if (error.response?.data?.message) {
        // Custom error message from backend
        return { success: false, message: error.response.data.message };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        // Network error
        return { success: false, message: 'Network error. Please check your connection and ensure the backend server is running.' };
      } else {
        // Generic error
        return { success: false, message: `Signup failed: ${error.message}` };
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
