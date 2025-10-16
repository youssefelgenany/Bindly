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
import PendingVerification from './pages/PendingVerification';
import ProfessorEvents from './pages/ProfessorEvents';
import ProfessorAllEvents from './pages/ProfessorAllEvents';
import VerificationPending from './pages/VerificationPending';
import Events from './pages/Events';
import GymSchedule from './pages/GymSchedule';
import GymManage from './pages/GymManage';
import ProfessorProfile from './pages/ProfessorProfile';
import ProfessorGymSchedule from './pages/ProfessorGymSchedule';
import Navbar from './components/Navbar';
import CreateConference from './pages/CreateConfrence';
import EditConfrences from './pages/EditConfrences';
import EventsList from './pages/EventsList';
import CreateBazaar from "./pages/CreateBazaar";
import CreateTrip from './pages/CreateTrip';
import EditBazaar from './pages/EditBazaar';
import EditTrip from './pages/EditTrip';
import Confrences from './pages/Confrences';

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

// Events Office guard
const EventsOfficeOnly = ({ children }) => {
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

  const isEventsOffice = user && (user.userType === 'Events Office' || user.role === 'event_office');
  const isAdmin = user && (user.role === 'admin' || user.userType === 'Admin');
  
  return (isEventsOffice || isAdmin) ? children : <Navigate to="/dashboard" />;
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
              path="/pending-verification"
              element={<PendingVerification />}
            />
            <Route 
              path="/verification-pending" 
              element={
                <PublicRoute>
                  <VerificationPending />
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
              path="/events" 
              element={
                <ProtectedRoute>
                  <EventsList />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/gym" 
              element={
                <ProtectedRoute>
                  <GymSchedule />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/gym/manage" 
              element={
                <ProtectedRoute>
                  <GymManage />
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
              path="/professor/all-events" 
              element={
                <ProtectedRoute>
                  <ProfessorAllEvents />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/professor/profile" 
              element={
                <ProtectedRoute>
                  <ProfessorProfile />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/professor/gym-schedule" 
              element={
                <ProtectedRoute>
                  <ProfessorGymSchedule />
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
            <Route
              path="/create-conference" 
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <CreateConference />
                  </AdminOnly>
                </ProtectedRoute> } 
              />
               <Route
                path="/edit-conference/:id"
                element={
                    <ProtectedRoute>
                     
                        <EditConfrences />
                     
                    </ProtectedRoute>
                  } />
            
            {/* ✅ ADD YOUR EVENT MANAGEMENT ROUTES HERE */}
            <Route 
              path="/create-bazaar" 
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <CreateBazaar />
                  </EventsOfficeOnly>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-trip" 
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <CreateTrip />
                  </EventsOfficeOnly>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-bazaar/:id" 
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <EditBazaar />
                  </EventsOfficeOnly>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-trip/:id" 
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <EditTrip />
                  </EventsOfficeOnly>
                </ProtectedRoute>
              } 
            />
            <Route
              path="/confrences"
              element={
                <ProtectedRoute>
                
                    <Confrences />
              
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