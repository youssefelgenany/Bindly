import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io as ioClient } from 'socket.io-client';

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
  const socketRef = useRef(null);

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
        const parsed = JSON.parse(userData);
        setUser(parsed);
        // Initialize socket connection for real-time notifications
        try {
          if (!socketRef.current) {
            const socket = ioClient('http://localhost:5000', {
              auth: { token },
              transports: ['websocket']
            });
            socketRef.current = socket;
            // Join user's room when connected
            socket.on('connect', () => {
              if (parsed && parsed._id) socket.emit('join', parsed._id);
            });

            // Dispatch DOM event for incoming notifications
            socket.on('new_notification', (notif) => {
              try { window.dispatchEvent(new CustomEvent('new_notification', { detail: notif })); } catch (e) {}
            });
          }
        } catch (e) {
          console.warn('Socket init failed:', e.message);
        }
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
      // Axios automatically sets Content-Type for FormData with boundary
      // Don't set it explicitly as it needs to include the boundary parameter
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
      console.error('Signup error response:', error.response?.data);
      console.error('Signup error status:', error.response?.status);
      
      // Handle different types of errors
      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => err.msg).join(', ');
        return { success: false, message: `Validation failed: ${errorMessages}` };
      } else if (error.response?.data?.message) {
        // Custom error message from backend
        return { success: false, message: error.response.data.message };
      } else if (error.response?.data?.error) {
        // Error field from backend
        return { success: false, message: error.response.data.error };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        // Network error
        return { success: false, message: 'Network error. Please check your connection and ensure the backend server is running.' };
      } else {
        // Generic error - show status code if available
        const statusMsg = error.response?.status ? ` (Status: ${error.response.status})` : '';
        return { success: false, message: `Signup failed: ${error.message}${statusMsg}` };
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    } catch (e) {}
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:5000/api/auth/me');
      if (response.data?.success && response.data?.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
    return null;
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
