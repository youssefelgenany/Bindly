import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      'Vendor': 'Vendor'
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
        {/* Logo/Brand */}
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
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--guc-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--white)',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  {user.firstName.charAt(0).toUpperCase()}
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
    </nav>
  );
};

export default Navbar;
