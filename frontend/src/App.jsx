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
import GymSchedule from './pages/GymSchedule';
import GymManage from './pages/GymManage';
import ProfessorProfile from './pages/ProfessorProfile';
import ProfessorGymSchedule from './pages/ProfessorGymSchedule';
import Navbar from './components/Navbar';
import VendorDashboard from './pages/VendorDashboard';
import CreateConference from './pages/CreateConfrence';
import EditConfrences from './pages/EditConfrences';
import EventsList from './pages/EventsList';
import CreateBazaar from "./pages/CreateBazaar";
import CreateTrip from './pages/CreateTrip';
import CreateBooth from './pages/CreateBooth';
import CreateGymSession from './pages/CreateGymSession';
import EditBazaar from './pages/EditBazaar';
import EditTrip from './pages/EditTrip';
import VendorBazaars from './pages/VendorBazaars';
import Confrences from './pages/Confrences';
import VendorAccepted from './pages/VendorAccepted';
import VendorRequests from './pages/VendorRequests';
import StudentEventsView from './pages/StudentEventsView';
import StudentMyRegistrations from './pages/StudentMyRegistrations';
import StudentCourtsView from './pages/StudentCourtsView';
import StaffEventsView from './pages/StaffEventsView';
import StaffMyRegistrations from './pages/StaffMyRegistrations';
import CourtAvailability from './pages/CourtAvailability';

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

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if user is verified (except for admin users, students, and vendors who are always verified)
  const isAutoVerified = user.userType === 'admin' || 
                        user.userType === 'Admin' || 
                        user.role === 'admin' ||
                        user.role === 'Admin' ||
                        user.userType === 'Student' || 
                        user.userType === 'Vendor';
  
  if (!user.isVerified && !isAutoVerified) {
    return <Navigate to="/pending-verification" />;
  }

  return children;
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

  if (!user) return children;
  if (user.userType === 'Vendor') return <Navigate to="/vendor" />;
  return <Navigate to="/dashboard" />;
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

  const isAdmin = user && (
    user.role === 'admin' || 
    user.role === 'Admin' ||
    user.userType === 'Admin' || 
    user.userType === 'admin'
  );
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

  const isEventsOffice = user && (
    user.userType === 'Event Office' ||
    user.userType === 'Events Office' ||
    user.userType === 'event_office' ||
    user.role === 'event_office' ||
    user.role === 'Event Office'
  );
  const isAdmin = user && (user.role === 'admin' || user.role === 'Admin' || user.userType === 'Admin' || user.userType === 'admin');

  return (isEventsOffice || isAdmin) ? children : <Navigate to="/dashboard" />;
};

// Student-only guard
const StudentOnly = ({ children }) => {
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

  const isStudentOrEventOffice = user && (
    user.userType === 'Student' || 
    user.userType === 'Event Office' || 
    user.userType === 'Events Office' || 
    user.userType === 'event_office' || 
    user.role === 'event_office' || 
    user.role === 'Event Office'
  );
  return isStudentOrEventOffice ? children : <Navigate to="/dashboard" />;
};

// Staff-only guard
const StaffOnly = ({ children }) => {
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

  const isStaff = user && user.userType === 'Staff';
  return isStaff ? children : <Navigate to="/dashboard" />;
};

// Staff and TA guard
const StaffAndTAOnly = ({ children }) => {
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

  const isStaffOrTAOrProfessor = user && (user.userType === 'Staff' || user.userType === 'TA' || user.userType === 'Professor');
  return isStaffOrTAOrProfessor ? children : <Navigate to="/dashboard" />;
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
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor"
              element={
                <ProtectedRoute>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/bazaars"
              element={
                <ProtectedRoute>
                  <VendorBazaars />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/accepted"
              element={
                <ProtectedRoute>
                  <VendorAccepted />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/requests"
              element={
                <ProtectedRoute>
                  <VendorRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/event-office/vendor-requests"
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <VendorRequests />
                  </EventsOfficeOnly>
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
              path="/student/events"
              element={
                <ProtectedRoute>
                  <StudentOnly>
                    <StudentEventsView />
                  </StudentOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/my-registrations"
              element={
                <ProtectedRoute>
                  <StudentOnly>
                    <StudentMyRegistrations />
                  </StudentOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/courts"
              element={
                <ProtectedRoute>
                  <StudentOnly>
                    <StudentCourtsView />
                  </StudentOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/events"
              element={
                <ProtectedRoute>
                  <StaffAndTAOnly>
                    <StaffEventsView />
                  </StaffAndTAOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/my-registrations"
              element={
                <ProtectedRoute>
                  <StaffAndTAOnly>
                    <StaffMyRegistrations />
                  </StaffAndTAOnly>
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
              path="/courts"
              element={
                <ProtectedRoute>
                  <CourtAvailability />
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
                  <EventsOfficeOnly>
                    <CreateConference />
                  </EventsOfficeOnly>
                </ProtectedRoute>}
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
              path="/create-booth"
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <CreateBooth />
                  </EventsOfficeOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-gym-session"
              element={
                <ProtectedRoute>
                  <EventsOfficeOnly>
                    <CreateGymSession />
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