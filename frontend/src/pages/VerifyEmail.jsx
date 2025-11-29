import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Check if user is Staff/TA/Professor (pending admin verification)
  const isPendingAdminVerification = ['Staff', 'TA', 'Professor'].includes(userType);

  // Get email from URL params or localStorage
  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
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
            // Check if already verified or just verified
            if (res.data.alreadyVerified) {
              setMessage('Email already verified! Redirecting to login...');
            } else {
              setMessage('Email verified successfully! Redirecting to login...');
            }
            setMessageType('success');
            // Clear any previous error messages and success message
            setShowSuccessMessage(false);
            // Small delay to let user read the message, then go to login
            setTimeout(() => {
              window.location.href = res.data.loginUrl || (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 900);
            return;
          } else {
            // For any error response, redirect silently without showing error box
            const errorMsg = res.data?.message || 'Verification failed.';
            // Don't show error box, just redirect silently
            setMessage('');
            setMessageType('');
            setShowSuccessMessage(false);
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 500);
            return;
          }
        } catch (err) {
          let errMsg = 'Verification request failed';
          
          // Extract error message from response
          if (err.response?.data) {
            const data = err.response.data;
            if (typeof data === 'string') {
              errMsg = data;
            } else if (data.message) {
              errMsg = data.message;
            } else {
              errMsg = JSON.stringify(data);
            }
          } else if (err.message) {
            errMsg = err.message;
          }
          
          // Check if it's an expired token error - redirect silently without showing error
          if (errMsg.toLowerCase().includes('expired')) {
            // Don't show error, just redirect silently
            setMessage('');
            setMessageType('');
            setShowSuccessMessage(false);
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 500);
            return;
          } else if (errMsg.toLowerCase().includes('already verified')) {
            // User is already verified, show success and redirect
            setMessage('Email already verified! Redirecting to login...');
            setMessageType('success');
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 900);
            return;
          } else if (errMsg.toLowerCase().includes('invalid') && !errMsg.toLowerCase().includes('expired')) {
            // For invalid links (but not expired), don't show error box - just redirect silently
            // This prevents showing error when user clicks link after already verifying
            setMessage('');
            setMessageType('');
            setShowSuccessMessage(false);
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 500);
            return;
          } else {
            // For any other errors, redirect silently without showing error box
            setMessage('');
            setMessageType('');
            setShowSuccessMessage(false);
            setTimeout(() => {
              window.location.href = (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000') + '/login';
            }, 500);
            return;
          }
        } finally {
          setLoading(false);
        }
      };
      doVerify();
      return; // don't continue with the rest of the effect
    }
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    const userTypeFromUrl = searchParams.get('userType');
    const userTypeFromStorage = localStorage.getItem('pendingVerificationUserType');
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
      localStorage.setItem('pendingVerificationEmail', emailFromUrl);
      // Show success message if coming from signup (email in URL means fresh signup)
      setShowSuccessMessage(true);
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
    
    if (userTypeFromUrl) {
      setUserType(userTypeFromUrl);
      localStorage.setItem('pendingVerificationUserType', userTypeFromUrl);
    } else if (userTypeFromStorage) {
      setUserType(userTypeFromStorage);
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
              <svg 
                style={{ height: '2.5rem', width: '2.5rem', color: '#1D3557' }}
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <p style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '1.5rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                color: '#1D3557',
                margin: 0
              }}>
                Bindly
              </p>
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
              {isPendingAdminVerification ? 'Account Pending Verification' : 'Check Your Email'}
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
              {isPendingAdminVerification 
                ? 'Account pending verification. Check your email within the next 24 hours.'
                : "We've sent a verification link to your email. Click the link to verify your account and you'll be redirected to the login page."}
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
                {isPendingAdminVerification 
                  ? 'Your account is pending admin verification. Once verified, you will receive an email with a verification link. Check your email within the next 24 hours.'
                  : "You must verify your email before you can log in. Login will fail if you haven't clicked the verification link."}
              </p>
            </div>

            {/* Success Message - Shown when coming from signup (only for Students, not Staff/TA/Professor) */}
            {showSuccessMessage && !isPendingAdminVerification && (
              <div style={{
                width: '100%',
                backgroundColor: '#D4EDDA',
                border: '1px solid #28A745',
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
                    color: '#28A745', 
                    flexShrink: 0, 
                    marginTop: '0.125rem' 
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#155724',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  Verification email sent successfully
                </p>
              </div>
            )}

            {/* Success Message from Verification */}
            {message && messageType === 'success' && (
              <div style={{
                width: '100%',
                backgroundColor: '#D4EDDA',
                border: '1px solid #28A745',
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
                    color: '#28A745', 
                    flexShrink: 0, 
                    marginTop: '0.125rem' 
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#155724',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {message}
                </p>
              </div>
            )}

            {/* Error Message - Only show for actual errors, not after successful verification */}
            {message && messageType === 'error' && !loading && (
              <div style={{
                width: '100%',
                backgroundColor: '#F8D7DA',
                border: '1px solid #DC3545',
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
                    color: '#DC3545', 
                    flexShrink: 0, 
                    marginTop: '0.125rem' 
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#721C24',
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

