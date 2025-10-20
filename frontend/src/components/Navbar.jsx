import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserTypeDisplay = (userType) => {
    const types = {
      'Student': 'Student',
      'Staff': 'Staff',
      'TA': 'TA',
      'Professor': 'Professor',
      'Vendor': 'Vendor',
      'Admin': 'Admin',
      'Event Office': 'Event Office'
    };
    return types[userType] || userType;
  };

  return (
    <nav style={{
      backgroundColor: 'var(--white)',
      borderBottom: '2px solid var(--guc-red)',
      padding: '1rem 0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Left group: brand only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && user.userType !== 'Vendor' && (
            <button
              onClick={toggleSidebar}
              className="btn btn-outline"
              aria-label="Open menu"
              style={{ padding: '8px 12px', fontSize: '18px' }}
            >
              ≡
            </button>
          )}
          <Link 
            to={user ? '/dashboard' : '/'} 
            style={{ 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--guc-red)'
            }}>
              Bindly
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {user ? (
            <>
              {/* User Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: 'var(--text-dark)' 
                  }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-light)' 
                  }}>
                    {getUserTypeDisplay(user.userType)}
                  </div>
                </div>
                {/* User Avatar */}
                {user?.profilePicturePath ? (
                  <img 
                    src={`http://localhost:5000${user.profilePicturePath}`}
                    alt={`${user.firstName} ${user.lastName}`}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--guc-red)'
                    }}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--guc-red)',
                  display: user?.profilePicturePath ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--white)',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                   {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>


              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Public Navigation */}
              <Link 
                to="/login" 
                style={{ 
                  color: 'var(--guc-red)', 
                  textDecoration: 'none',
                  fontWeight: '600',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(210, 10, 10, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar Overlay */}
      {user && user.userType !== 'Vendor' && (
        <>
          {/* Dim Background */}
          <div
            onClick={closeSidebar}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              opacity: isSidebarOpen ? 1 : 0,
              pointerEvents: isSidebarOpen ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
              zIndex: 999
            }}
          />

          {/* Sidebar Panel */}
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: '280px',
              backgroundColor: 'var(--white)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
              transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s ease',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column'
            }}
            aria-hidden={!isSidebarOpen}
          >
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--medium-gray)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--guc-red)' }}>Menu</div>
              <button
                onClick={closeSidebar}
                className="btn btn-outline"
                aria-label="Close menu"
                style={{ padding: '6px 10px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              {/* Student Events View */}
              {user.userType === 'Student' && (
                <>
                  <Link
                    to="/student/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📅 View Events
                  </Link>
                  <Link
                    to="/student/my-registrations"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📋 My Registrations
                  </Link>
                  <Link
                    to="/student/courts"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    🏟️ View Courts
                  </Link>
                </>
              )}

              {/* Staff Events View */}
              {user.userType === 'Staff' && (
                <>
                  <Link
                    to="/staff/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📅 View Events
                  </Link>
                  <Link
                    to="/staff/my-registrations"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📋 My Registrations
                  </Link>
                </>
              )}

              {/* TA Events View */}
              {user.userType === 'TA' && (
                <>
                  <Link
                    to="/staff/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📅 View Events
                  </Link>
                  <Link
                    to="/staff/my-registrations"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📋 My Registrations
                  </Link>
                </>
              )}

              {/* Professor Events View */}
              {user.userType === 'Professor' && (
                <>
                  <Link
                    to="/staff/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📅 View Events
                  </Link>
                  <Link
                    to="/staff/my-registrations"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📋 My Registrations
                  </Link>
                </>
              )}


              {/* Gym Schedule - visible to Student, Staff, TA, Professor, Event Office */}
              {(user.userType === 'Student' || user.userType === 'Staff' || user.userType === 'TA' || user.userType === 'Professor' || user.userType === 'Event Office' || user.userType === 'Events Office' || user.userType === 'event_office' || user.role === 'event_office' || user.role === 'Event Office') && (
                <Link
                  to="/gym"
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={closeSidebar}
                >
                  Gym Schedule
                </Link>
              )}


{/* Conferences link moved into Events page filters */}
              
              {/* EVENTS - visible to Event Office */}
              {(user.userType === 'Event Office' || user.userType === 'Events Office' || user.userType === 'event_office' || user.role === 'event_office' || user.role === 'Event Office') && (
                <>
                  <Link
                    to="/student/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📅 View Events
                  </Link>
                  <Link
                    to="/event-office/vendor-requests"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Vendor Requests
                  </Link>
                  <Link
                    to="/create-bazaar"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Create Bazaar
                  </Link>
                  <Link
                    to="/create-trip"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Create Trip
                  </Link>
                  <Link
                    to="/create-conference"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Create Conference
                  </Link>
                  <Link
                    to="/create-booth"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Create Booth
                  </Link>
                  <Link
                    to="/create-gym-session"
                    className="btn btn-primary"
                    style={{ width: '100%', backgroundColor: '#28a745', borderColor: '#28a745' }}
                    onClick={closeSidebar}
                  >
                    🏋️ Create Gym Session
                  </Link>
                </>
              )}
              
              {/* Professor-specific actions */}
              {user.userType === 'Professor' && (
                <>
                  <Link
                    to="/professor/events"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    📚 My Workshops
                  </Link>
                  <Link
                    to="/professor/profile"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Profile & Account Settings
                  </Link>
                </>
              )}
              
              {/* Hide Manage Gym for Event Office */}
              
              {(user.role === 'admin' || user.role === 'Admin' || user.userType === 'Admin' || user.userType === 'admin') && (
                <>
                  <Link
                    to="/admin/users"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    View Users
                  </Link>
                  <Link
                    to="/event-office/vendor-requests"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Vendor Requests
                  </Link>
                  <Link
                    to="/admin/events"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    View Events
                  </Link>
                  <Link
                    to="/admin/manage"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Manage Admins
                  </Link>
                  <Link
                    to="/admin/profile"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Profile & Settings
                  </Link>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </nav>
  );
};

export default Navbar;