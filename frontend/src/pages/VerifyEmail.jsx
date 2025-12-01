import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Handle verification token from URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');

    // If the verification token is present in the URL, call the backend
    // verify endpoint in `redirect=false` mode (returns JSON) and then
    // navigate client-side to the login page. This is more reliable than
    // depending on the browser to follow a server redirect.
    if (tokenFromUrl) {
      const doVerify = async () => {
        setLoading(true);
        setMessage('Verifying your email...');
        setMessageType('');
        try {
          const backendBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
          const verifyUrl = `${backendBase.replace(/\/+$/, '')}/api/auth/verify-email?token=${encodeURIComponent(tokenFromUrl)}&redirect=false`;
          const res = await axios.get(verifyUrl, { timeout: 10000 });
          if (res.data && res.data.success) {
            setMessage('Verification is successful! Redirecting to login...');
            setMessageType('success');
            // Small delay to let user read the message, then go to login
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 2000);
            return;
          } else {
            setMessage(res.data?.message || 'Verification failed.');
            setMessageType('error');
          }
        } catch (err) {
          const errMsg = err.response?.data || err.message || 'Verification request failed';
          // Handle both string and object error responses
          let errorMessage = 'Verification link is invalid or expired';
          if (typeof errMsg === 'string') {
            errorMessage = errMsg;
          } else if (errMsg && typeof errMsg === 'object') {
            errorMessage = errMsg.message || JSON.stringify(errMsg);
          }
          setMessage(errorMessage);
          setMessageType('error');
        } finally {
          setLoading(false);
        }
      };
      doVerify();
    } else {
      // No token in URL - show error
      setMessage('Verification link is invalid or expired');
      setMessageType('error');
    }
  }, [searchParams]);


  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      height: '100vh',
      width: '100%',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
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
          backgroundColor: '#FFFFFF',
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
                src="/assets/images/bindly-logo.png"
                alt="Bindly Logo"
                style={{ height: '3rem', width: 'auto', objectFit: 'contain' }}
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

            {/* Title - Only show when not verifying */}
            {!loading && !message && (
              <>
                <h1 style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  letterSpacing: '-0.025em',
                  color: '#1D3557',
                  margin: 0
                }}>
                  Check Your Email
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
                  We've sent a verification link to your email. Click the link to verify your account and you'll be redirected to the login page.
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
                    You must verify your email before you can log in. Login will fail if you haven't clicked the verification link.
                  </p>
                </div>
              </>
            )}

            {/* Loading Message */}
            {loading && !message && (
              <p style={{
                fontSize: '0.9375rem',
                color: '#4B5563',
                margin: 0
              }}>
                Verifying your email...
              </p>
            )}

            {/* Success/Error Message */}
            {message && (
              <div style={{
                width: '100%',
                backgroundColor: messageType === 'success' ? '#D4EDDA' : '#F8D7DA',
                border: `1px solid ${messageType === 'success' ? '#28A745' : '#DC3545'}`,
                borderRadius: '0.5rem',
                padding: '0.875rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                textAlign: 'left'
              }}>
                <svg 
                  style={{ 
                    width: '1.125rem', 
                    height: '1.125rem', 
                    color: messageType === 'success' ? '#28A745' : '#DC3545', 
                    flexShrink: 0, 
                    marginTop: '0.125rem' 
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {messageType === 'success' ? (
                    <path 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  ) : (
                    <path 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  )}
                </svg>
                <p style={{
                  fontSize: '0.8125rem',
                  color: messageType === 'success' ? '#155724' : '#721C24',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {message}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

