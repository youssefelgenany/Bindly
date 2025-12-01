import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PlatformBoothMapSelector from '../components/PlatformBoothMapSelector';

const PlatformBooths = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    attendees: [{ name: '', email: '' }],
    duration: '',
    boothLocation: '',
    boothSize: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const setAttendee = (idx, field, value) => {
    const next = formData.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    setFormData({ ...formData, attendees: next });
    if (errors.attendees) {
      setErrors({ ...errors, attendees: '' });
    }
  };

  const addAttendee = () => {
    if (formData.attendees.length < 5) {
      setFormData({ ...formData, attendees: [...formData.attendees, { name: '', email: '' }] });
    }
  };

  const removeAttendee = (idx) => {
    if (formData.attendees.length > 1) {
      const next = formData.attendees.filter((_, i) => i !== idx);
      setFormData({ ...formData, attendees: next });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleLocationSelect = (locationId) => {
    setFormData({ ...formData, boothLocation: locationId });
    if (errors.boothLocation) {
      setErrors({ ...errors, boothLocation: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate attendees
    const validAttendees = formData.attendees.filter(attendee => 
      attendee.name.trim() && attendee.email.trim()
    );

    if (validAttendees.length === 0) {
      newErrors.attendees = 'At least one attendee is required';
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validAttendees.filter(attendee => 
      !emailRegex.test(attendee.email)
    );

    if (invalidEmails.length > 0) {
      newErrors.attendees = 'Please enter valid email addresses for all attendees';
    }

    // Validate duration
    if (!formData.duration) {
      newErrors.duration = 'Please select a duration';
    }

    // Validate booth location
    if (!formData.boothLocation) {
      newErrors.boothLocation = 'Please select a booth location from the map';
    }

    // Validate booth size
    if (!formData.boothSize) {
      newErrors.boothSize = 'Please select a booth size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Filter and clean attendees - ensure they have both name and email
      const validAttendees = formData.attendees
        .map(attendee => ({
          name: (attendee.name || '').trim(),
          email: (attendee.email || '').trim()
        }))
        .filter(attendee => attendee.name && attendee.email);

      if (validAttendees.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'Please add at least one attendee with both name and email.' 
        });
        setLoading(false);
        return;
      }

      // Prepare submission data - ensure all values are valid
      const submissionData = {
        eventType: 'platformBooth',
        attendees: validAttendees
      };

      // Only add optional fields if they have valid values
      if (formData.boothSize && (formData.boothSize === '2x2' || formData.boothSize === '4x4')) {
        submissionData.boothSize = formData.boothSize;
      }

      if (formData.duration) {
        const duration = parseInt(formData.duration);
        if (!isNaN(duration) && duration >= 1 && duration <= 4) {
          submissionData.durationWeeks = duration;
        }
      }

      if (formData.boothLocation && formData.boothLocation.trim()) {
        submissionData.boothLocation = formData.boothLocation.trim();
      }

      console.log('🔍 Submitting platform booth application:', submissionData);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/vendor-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json();
      console.log('🔍 Platform booth submission response:', { status: response.status, data });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Platform booth application submitted successfully! Your request is pending approval.' 
        });
        
        // Reset form
        setFormData({
          attendees: [{ name: '', email: '' }],
          duration: '',
          boothLocation: '',
          boothSize: ''
        });
      } else {
        // Extract error message from response
        let errorMessage = 'Failed to submit application';
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
        }
        
        // Add validation error details if available
        if (data.validationErrors && Array.isArray(data.validationErrors) && data.validationErrors.length > 0) {
          errorMessage += '\n' + data.validationErrors.join('\n');
        } else if (data.details && typeof data.details === 'object') {
          const detailMessages = Object.values(data.details);
          if (detailMessages.length > 0) {
            errorMessage += '\n' + detailMessages.join('\n');
          }
        }
        
        console.error('❌ Backend error response:', data);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error submitting platform booth application:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      
      let errorMessage = 'An error occurred while submitting your application. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f8f6f6'
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: sidebarOpen ? '16rem' : '0',
        flexShrink: 0,
        backgroundColor: '#1D3557',
        padding: sidebarOpen ? '1.5rem' : '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'width 0.3s ease, padding 0.3s ease'
      }}>
        {/* Top Section - Logo and Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Logo and Branding */}
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#457B9D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  storefront
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendor Portal
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  {user?.companyName || 'Company'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {sidebarOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/vendor"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  dashboard
                </span>
                <p style={{
                  color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/vendor/bazaars"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/bazaars') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/bazaars')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/bazaars')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/bazaars') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Bazaars
                </p>
              </Link>

              <Link
                to="/vendor/platform-booths"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/platform-booths') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/platform-booths')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/platform-booths')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/platform-booths') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
                </p>
              </Link>

              <Link
                to="/vendor/accepted-events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/accepted-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/accepted-events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/accepted-events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  check_circle
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/accepted-events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Participations
                </p>
              </Link>

              <Link
                to="/vendor/my-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/my-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/my-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/my-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  assignment
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/my-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Applications
                </p>
              </Link>
            </nav>
          )}
        </div>

        {/* Loyalty link + Logout Button - Fixed at bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* GUC Loyalty Program link */}
          {sidebarOpen && (
            <Link
              to="/vendor/loyalty-program"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor/loyalty-program') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor/loyalty-program')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor/loyalty-program')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor/loyalty-program') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                badge
              </span>
              <p style={{
                color: isActiveRoute('/vendor/loyalty-program') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor/loyalty-program') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                GUC Loyalty Program
              </p>
            </Link>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'rgba(241, 250, 238, 0.7)', fontSize: '1.25rem' }}>
              logout
            </span>
            {sidebarOpen && (
              <p style={{
                color: 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Logout
              </p>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2.5rem',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557'
              }}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <img
              src="/assets/images/bindly-logo.png"
              alt="Bindly Logo"
              style={{ height: '3rem', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1D3557',
                margin: 0
              }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0
              }}>
                Vendor
              </p>
            </div>
            {user?.profilePicturePath ? (
              <img
                src={`http://localhost:5000${user.profilePicturePath}`}
                alt="User profile"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#1D3557',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: '600'
              }}>
                {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem 6rem',
          overflowY: 'auto',
          backgroundColor: '#f8f6f6'
        }}>
          {/* Page Title Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #1D3557'
          }}>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              Platform Booth Application
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Apply for a booth on the platform by filling in the form below.
            </p>
          </div>

          {/* Form Container */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            {message.text && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: '0.5rem',
                backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.875rem',
                whiteSpace: 'pre-line'
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Attendees Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Names and Emails of Attendees (Maximum 5) <span style={{ color: '#ef4444' }}>*</span>
                </h4>
                
                {formData.attendees.map((attendee, idx) => (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                    alignItems: 'end'
                  }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={attendee.name}
                        onChange={(e) => setAttendee(idx, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#f3f4f6',
                          outline: 'none',
                          transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.backgroundColor = '#ffffff';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.backgroundColor = '#f3f4f6';
                        }}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={attendee.email}
                        onChange={(e) => setAttendee(idx, 'email', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#f3f4f6',
                          outline: 'none',
                          transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.backgroundColor = '#ffffff';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.backgroundColor = '#f3f4f6';
                        }}
                        required
                      />
                    </div>
                    {formData.attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(idx)}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#ef4444',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.attendees.length < 5 && (
                  <button
                    type="button"
                    onClick={addAttendee}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#1D3557',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#152843'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1D3557'}
                  >
                    + Add Attendee
                  </button>
                )}
                
                {errors.attendees && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem'
                  }}>
                    {errors.attendees}
                  </div>
                )}
              </div>

              {/* Duration Section */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: '#111827',
                  fontSize: '0.875rem'
                }}>
                  Duration of Booth Setup <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#f3f4f6',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  required
                >
                  <option value="">Select duration</option>
                  <option value="1">1 Week</option>
                  <option value="2">2 Weeks</option>
                  <option value="3">3 Weeks</option>
                  <option value="4">4 Weeks</option>
                </select>
                {errors.duration && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem'
                  }}>
                    {errors.duration}
                  </div>
                )}
              </div>

              {/* Booth Location Map */}
              <PlatformBoothMapSelector
                selectedLocation={formData.boothLocation}
                onLocationSelect={handleLocationSelect}
              />
              {errors.boothLocation && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '-1rem',
                  marginBottom: '1.5rem'
                }}>
                  {errors.boothLocation}
                </div>
              )}

              {/* Booth Size Section */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: '#111827',
                  fontSize: '0.875rem'
                }}>
                  Booth Size <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="boothSize"
                  value={formData.boothSize}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#f3f4f6',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  required
                >
                  <option value="">Select booth size</option>
                  <option value="2x2">2x2 meters (Small Booth)</option>
                  <option value="4x4">4x4 meters (Large Booth)</option>
                </select>
                {errors.boothSize && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem'
                  }}>
                    {errors.boothSize}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/vendor')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6b7280',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loading ? '#9ca3af' : '#1D3557',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#152843';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#1D3557';
                    }
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlatformBooths;

