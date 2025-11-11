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
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { user: userData, token } = response.data;
      
      // Store token and user data for verified users
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);

      // Handle specific error codes
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle awaiting verification (no redirect, just show error)
        if (error.response?.status === 403 && errorData.code === 'AWAITING_VERIFICATION') {
          return { 
            success: false, 
            message: errorData.message,
            code: errorData.code
          };
        }
        
        // Handle account blocked
        if (error.response?.status === 403 && errorData.code === 'ACCOUNT_BLOCKED') {
          return { 
            success: false, 
            message: errorData.message,
            code: errorData.code,
            user: errorData.user
          };
        }
        
        // Return specific error with code
        return { 
          success: false, 
          message: errorData.message,
          code: errorData.code
        };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        return { success: false, message: 'Network error. Please check your connection and ensure the backend server is running.' };
      } else {
        return { success: false, message: `Login failed: ${error.message}` };
      }
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', userData);
      
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
