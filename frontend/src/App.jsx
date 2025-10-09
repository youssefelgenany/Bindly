import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminUsers from './pages/AdminUsers';
import AdminVendors from './pages/AdminVendors';
import AdminEvents from './pages/AdminEvents';
import AdminManagement from './pages/AdminManagement';
import AdminProfile from './pages/AdminProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProfessorEvents from './pages/ProfessorEvents';
import Navbar from './components/Navbar';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

// Admin-only guard
const AdminOnly = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isAdmin = user && (user.role === 'admin' || user.userType === 'Admin');
  return isAdmin ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/professor/events" 
              element={
                <ProtectedRoute>
                  <ProfessorEvents />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <AdminUsers />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/vendors" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <AdminVendors />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/events" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <AdminEvents />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/manage" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <AdminManagement />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/profile" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <AdminProfile />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
