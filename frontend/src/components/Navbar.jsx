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
          {user && (
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
      {user && (
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
              {!(user.role === 'admin' || user.userType === 'Admin' || user.userType === 'Event Office' || user.userType === 'event_office') && (
                <Link
                  to="/gym"
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={closeSidebar}
                >
                  Gym Schedule
                </Link>
              )}
              
              {/* EVENTS MANAGEMENT - MOVED HERE FOR BETTER VISIBILITY */}
              {(user.userType === 'Events Office' || user.role === 'event_office') && (
                <Link
                  to="/events"
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={closeSidebar}
                >
                  Events Management
                </Link>
              )}
              
              {/* Hide Manage Gym for Event Office */}
              
              {(user.role === 'admin' || user.userType === 'Admin') && (
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
                    to="/admin/vendors"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    View Vendors
                  </Link>
                  <Link
                    to="/admin/events"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={closeSidebar}
                  >
                    Manage Events
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