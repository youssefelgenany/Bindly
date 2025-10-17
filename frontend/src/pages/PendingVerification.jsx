import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingVerification = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check verification status periodically
  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setCheckingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.user.isVerified) {
          // User is now verified, redirect based on user type
          if (userData.user.userType === 'Vendor') {
            navigate('/vendor');
          } else {
            navigate('/dashboard');
          }
        }
      } else if (response.status === 401) {
        // Token expired or invalid, logout
        logout();
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Check status every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkVerificationStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Manual check button
  const handleManualCheck = () => {
    checkVerificationStatus();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--light-gray) 0%, #E9ECEF 100%)',
      padding: '2rem'
    }}>
      <div className="card" style={{
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div className="card-header">
          {/* Icon */}
          <div style={{
            fontSize: '4rem',
            marginBottom: '1.5rem',
            color: 'var(--guc-red)'
          }}>
            ⏳
          </div>

          {/* Title */}
          <h1 className="card-title">
            Account Pending Verification
          </h1>

          {/* Message */}
          <p className="card-subtitle" style={{
            fontSize: '1.1rem',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            Hello <strong>{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name || 'User'}</strong>!<br/>
            Your account has been created successfully, but it's currently pending verification by an administrator.
          </p>
        </div>

        {/* Status Info */}
        <div style={{
          background: 'var(--light-gray)',
          border: '1px solid var(--medium-gray)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            color: 'var(--charcoal-black)',
            marginBottom: '1rem',
            fontSize: '1.2rem'
          }}>
            What happens next?
          </h3>
          <ul style={{
            textAlign: 'left',
            color: 'var(--text-light)',
            lineHeight: '1.8',
            margin: 0,
            paddingLeft: '1.5rem'
          }}>
            <li>An administrator will review your account</li>
            <li>You'll receive access to all platform features</li>
            <li>This page will automatically update when verified</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleManualCheck}
            disabled={checkingStatus}
            className={checkingStatus ? 'btn btn-outline' : 'btn btn-primary'}
            style={{
              minWidth: '140px',
              opacity: checkingStatus ? 0.6 : 1
            }}
          >
            {checkingStatus ? 'Checking...' : 'Check Status'}
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{
              minWidth: '140px'
            }}
          >
            Logout
          </button>
        </div>

        {/* Auto-refresh notice */}
        <p style={{
          color: 'var(--text-light)',
          fontSize: '0.9rem',
          marginTop: '2rem',
          fontStyle: 'italic'
        }}>
          This page automatically checks for updates every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default PendingVerification;