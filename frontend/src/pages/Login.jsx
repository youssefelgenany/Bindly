import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'email' ? value.toLowerCase() : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        setMessage('Login successful! Redirecting...');
        setTimeout(() => {
          if (result.user?.userType === 'Vendor') {
            navigate('/vendor');
          } else {
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        let errorMessage = result.message;
        
        switch (result.code) {
          case 'MISSING_FIELDS':
            errorMessage = 'Please enter both email and password.';
            break;
          case 'USER_NOT_FOUND':
            errorMessage = 'No account found with this email. Please check your email or sign up for a new account.';
            break;
          case 'INVALID_PASSWORD':
            errorMessage = 'Incorrect password. Please check your password and try again.';
            break;
          case 'AWAITING_VERIFICATION':
            // Use the message from backend which already determines the correct message based on user type
            errorMessage = result.message || 'Account pending verification. Kindly check your email.';
            break;
          case 'ACCOUNT_BLOCKED':
            errorMessage = `Your account is currently ${result.user?.status || 'blocked'}. Please contact an administrator for assistance.`;
            break;
          default:
            errorMessage = result.message || 'Login failed. Please try again.';
        }
        
        setMessage(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#F1FAEE',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="login-container" style={{
        display: 'flex',
        height: '100%',
        minHeight: '100vh',
        width: '100%',
        flexDirection: 'column'
      }}>
        {/* Left Panel - Login Form */}
        <div style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fbfbfb',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '28rem',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem'
          }}>
            {/* Logo and Title */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <img
                src="/assets/images/Login-logo.jpeg"
                alt="Bindly Logo"
                style={{
                  height: 'auto',
                  width: 'auto',
                  maxHeight: '5rem',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Welcome Message */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                color: '#111827',
                margin: 0
              }}>
                Welcome Back!
              </p>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                paddingTop: '0.5rem',
                margin: 0
              }}>
                Login to your account to continue.
              </p>
            </div>

            {/* Error/Success Message */}
            {message && (
              <div className={`alert ${message.includes('successful') ? 'alert-success' : 'alert-error'}`} style={{ 
                width: '100%',
                marginBottom: '0',
                marginTop: '-1rem'
              }}>
                {message}
              </div>
            )}

            {/* Login Form */}
            <div style={{ width: '100%' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Email Input */}
                  <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#374151',
                      margin: 0
                    }}>
                      Email Address
                    </p>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      disabled={loading}
                      style={{
                        display: 'flex',
                        width: '100%',
                        minWidth: 0,
                        flex: 1,
                        resize: 'none',
                        overflow: 'hidden',
                        borderRadius: '0.375rem',
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        padding: '0.75rem 1rem',
                        fontSize: '1rem',
                        color: '#111827',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#457B9D';
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = '0 0 0 2px rgba(69, 123, 157, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.email ? '#DC3545' : '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.email && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.email}
                      </div>
                    )}
                  </label>

                  {/* Password Input */}
                  <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#374151',
                      margin: 0
                    }}>
                      Password
                    </p>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        disabled={loading}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minWidth: 0,
                          flex: 1,
                          resize: 'none',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          fontSize: '1rem',
                          color: '#111827',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#457B9D';
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = '0 0 0 2px rgba(69, 123, 157, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.password ? '#DC3545' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          inset: '0 0 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          paddingRight: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9CA3AF'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#4B5563'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.password}
                      </div>
                    )}
                  </label>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    height: '3rem',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem',
                    backgroundColor: '#1D3557',
                    padding: '0 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.backgroundColor = 'rgba(29, 53, 87, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.target.style.backgroundColor = '#1D3557';
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span style={{ marginLeft: '8px' }}>Signing In...</span>
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
            </div>

            {/* Sign Up Link */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{
                  fontWeight: '600',
                  color: '#457B9D',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#457B9D';
                  e.target.style.textDecoration = 'none';
                }}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>

        {/* Right Panel - Background Image */}
        <div className="login-right-panel" style={{
          position: 'relative',
          display: 'none',
          width: '100%',
          flex: 1
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            width: '100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundImage: 'url(/assets/images/login-background.jpg)'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.7)'
            }}></div>
            <div style={{
              position: 'relative',
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: '3rem',
              color: '#FFFFFF'
            }}>
              <p style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '2.25rem',
                fontWeight: '700',
                lineHeight: '1.25',
                margin: 0
              }}>
                "Connecting our campus, one event at a time."
              </p>
              <p style={{
                marginTop: '1rem',
                fontSize: '1.125rem',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: 0
              }}>
                Explore, engage, and excel with Bindly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: Show right panel on large screens */}
      <style>{`
        @media (min-width: 1024px) {
          .login-container {
            flex-direction: row !important;
          }
          .login-right-panel {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
