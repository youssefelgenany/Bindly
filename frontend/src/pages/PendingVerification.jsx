import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already verified
  useEffect(() => {
    if (user && user.isVerified && (user.status === 'active' || !user.status)) {
      if (user.userType === 'Vendor') {
        navigate('/vendor');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      height: '100vh',
      width: '100%',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#fbfbfb',
      fontFamily: 'Manrope, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Main Content */}
        <div style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fbfbfb',
          padding: '1.5rem',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '28rem',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            textAlign: 'center'
          }}>
            {/* Bindly Logo */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <img
                src="/assets/images/login-logo.jpeg"
                alt="Bindly Logo"
                style={{ height: 'auto', width: 'auto', maxHeight: '5rem', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
            
            {/* Envelope Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#E8F4F8',
              border: '2px solid #457B9D',
              marginTop: '0.5rem'
            }}>
              <svg 
                style={{ width: '2rem', height: '2rem', color: '#1D3557' }}
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '1.5rem',
              fontWeight: '700',
              letterSpacing: '-0.025em',
              color: '#1D3557',
              margin: 0
            }}>
              Account Pending Verification
            </h1>

            {/* Instructional Text */}
            <p style={{
              fontSize: '0.9375rem',
              color: '#4B5563',
              margin: 0,
              lineHeight: '1.5',
              maxWidth: '24rem',
              padding: '0 0.5rem'
            }}>
              Account pending verification. Check your email within the next 24 hours.
            </p>

            {/* Information Alert Box */}
            <div style={{
              width: '100%',
              backgroundColor: '#E8F4F8',
              border: '1px solid #457B9D',
              borderRadius: '0.5rem',
              padding: '0.875rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              textAlign: 'left'
            }}>
              <svg 
                style={{ width: '1.125rem', height: '1.125rem', color: '#1D3557', flexShrink: 0, marginTop: '0.125rem' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p style={{
                fontSize: '0.8125rem',
                color: '#1D3557',
                margin: 0,
                lineHeight: '1.4'
              }}>
                Your account is pending admin verification. Once verified, you will receive an email with a verification link. Check your email within the next 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
