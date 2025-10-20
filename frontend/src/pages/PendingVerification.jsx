import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const hasChecked = useRef(false);

  // Check verification status manually
  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setIsChecking(true);
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
    } finally {
      setIsChecking(false);
    }
  };

  // Check status only once on mount
  useEffect(() => {
    // Prevent multiple calls
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Immediate redirect if already verified and active in current context
    if (user && user.isVerified && (user.status === 'active' || !user.status)) {
      if (user.userType === 'Vendor') {
        navigate('/vendor');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // Check once on mount
    checkVerificationStatus();
  }, [user, navigate]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--light-gray) 0%, #E9ECEF 100%)',
      padding: '2rem',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto'
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

        {/* Check Status Button */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem'
        }}>
          <button
            onClick={checkVerificationStatus}
            disabled={isChecking}
            className="btn btn-primary"
            style={{
              marginRight: '1rem',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            {isChecking ? 'Checking...' : 'Check Verification Status'}
          </button>
        </div>

        {/* Login Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '1rem'
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

        {/* Manual check notice */}
        <p style={{
          color: 'var(--text-light)',
          fontSize: '0.9rem',
          marginTop: '2rem',
          fontStyle: 'italic'
        }}>
          Click "Check Verification Status" to see if your account has been verified
        </p>
      </div>
    </div>
  );
};

export default PendingVerification;