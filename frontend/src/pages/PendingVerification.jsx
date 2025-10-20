import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check verification status periodically
  const checkVerificationStatus = async () => {
    if (!user) return;
    
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
        // Token expired or invalid, redirect to login
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  // Check status every 30 seconds
  useEffect(() => {
    // Immediate redirect if already verified and active in current context
    if (user && user.isVerified && (user.status === 'active' || !user.status)) {
      if (user.userType === 'Vendor') {
        navigate('/vendor');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // Also trigger an immediate server check once
    checkVerificationStatus();

    const interval = setInterval(checkVerificationStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

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

        {/* Login Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem'
        }}>
          <a 
            href="/login" 
            style={{
              color: 'var(--guc-red)',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '500',
              borderBottom: '2px solid var(--guc-red)',
              paddingBottom: '2px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.color = 'var(--charcoal-black)';
              e.target.style.borderBottomColor = 'var(--charcoal-black)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = 'var(--guc-red)';
              e.target.style.borderBottomColor = 'var(--guc-red)';
            }}
          >
            Go to Login Page
          </a>
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