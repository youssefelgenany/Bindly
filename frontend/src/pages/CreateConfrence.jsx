import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CreateConference = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agenda: '',
    website: '',
    location: '',
    budget: '',
    fundingSource: 'GUC',
    startDate: '',
    endDate: '',
    capacity: '',
    extraResources: ''
  });

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? (parseFloat(e.target.value) || '') : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const result = await axios.post(
        "http://localhost:5000/api/events/conference", 
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (result.data.msg && result.data.msg.includes('created')) {
        setMessage({ 
          type: 'success', 
          text: 'Conference created successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/event-office'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.data.msg || 'Error creating conference' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.msg || 'Network error. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

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
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Events Office
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  University Portal
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {sidebarOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/event-office"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
                  dashboard
                </span>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

            <Link
              to="/event-office/events"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/events')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/events')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                explore
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              )}
            </Link>

            <Link
              to="/create-bazaar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-bazaar') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                storefront
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-bazaar') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Bazaars
                </p>
              )}
            </Link>

            <Link
              to="/create-trip"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-trip') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                flight_takeoff
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-trip') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Trips
                </p>
              )}
            </Link>

            <Link
              to="/create-conference"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-conference') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                groups
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-conference') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Conferences
                </p>
              )}
            </Link>

            <Link
              to="/create-gym-session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-gym-session') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                fitness_center
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-gym-session') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Create Gym Session
                </p>
              )}
            </Link>

              <Link
                to="/gym-schedule"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/gym-schedule') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  calendar_month
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    View Gym Sessions
                  </p>
                )}
              </Link>
          </nav>
          )}
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0
            }}>
              Bindly
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1D3557',
                margin: 0
              }}>
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name || 'User'}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0
              }}>
                Events Office
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Form Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f8f6f6'
        }}>
          {/* Page Name Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '2rem',
            borderLeft: '4px solid #1D3557',
            maxWidth: '1200px',
            margin: '0 auto 2rem auto'
          }}>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              Create Conference
            </h3>
          </div>
          
      {message.text && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '0.875rem',
              maxWidth: '1200px',
              margin: '0 auto 1.5rem auto'
            }}>
          {message.text}
        </div>
      )}

          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '0.5rem',
            padding: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2rem'
            }}>
              {/* Basic Information Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  margin: 0
                }}>
                  Basic Information
                </h2>

                {/* Conference Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label 
                    htmlFor="conference-name"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}
                  >
                    Conference Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="conference-name"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Tech Conference 2024"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      fontSize: '0.875rem',
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
                  />
                </div>

                {/* Short Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label 
                    htmlFor="description"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}
                  >
                    Short Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of the conference"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      fontSize: '0.875rem',
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
                  />
                </div>

                {/* Agenda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label 
                    htmlFor="agenda"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}
                  >
                    Agenda <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="agenda"
                    name="agenda"
                    value={formData.agenda}
                    onChange={handleChange}
                    placeholder="Detailed agenda of the conference"
                    rows={4}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
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
                  />
                </div>

                {/* Website and Location */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="website"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      Website Link <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f3f4f6',
                        fontSize: '0.875rem',
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
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="location"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      Location <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Main Auditorium"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f3f4f6',
                        fontSize: '0.875rem',
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
                    />
                  </div>
                </div>

                {/* Budget and Funding Source */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="budget"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      Required Budget (EGP) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder="e.g., 50000"
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f3f4f6',
                        fontSize: '0.875rem',
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
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="fundingSource"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      Source of Funding <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id="fundingSource"
                      name="fundingSource"
                      value={formData.fundingSource}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f3f4f6',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.backgroundColor = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.backgroundColor = '#f3f4f6';
                      }}
                    >
                      <option value="GUC">GUC</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                </div>

                {/* Capacity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label 
                    htmlFor="capacity"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}
                  >
                    Capacity
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="Maximum number of attendees"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      fontSize: '0.875rem',
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
                  />
                </div>

                {/* Extra Resources */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label 
                    htmlFor="extraResources"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}
                  >
                    Extra Resources
                  </label>
                  <textarea
                    id="extraResources"
                    name="extraResources"
                    value={formData.extraResources}
                    onChange={handleChange}
                    placeholder="Additional resources or requirements"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
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
        />
      </div>
              </div>

              {/* Scheduling Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  margin: 0
                }}>
                  Scheduling
                </h2>

                {/* Start Date & Time and End Date & Time */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="start-date"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      Start Date & Time <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="datetime-local"
                        id="start-date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.875rem',
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
                      />
                      <span className="material-symbols-outlined" style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        fontSize: '1.25rem',
                        pointerEvents: 'none'
                      }}>
                        calendar_today
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label 
                      htmlFor="end-date"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      End Date & Time <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="datetime-local"
                        id="end-date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.875rem',
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
                      />
                      <span className="material-symbols-outlined" style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        fontSize: '1.25rem',
                        pointerEvents: 'none'
                      }}>
                        calendar_today
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '1rem',
                paddingTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/event-office')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#4b5563',
                    background: '#f3f4f6',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                    e.target.style.color = '#111827';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.color = '#4b5563';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '84px',
                    height: '2.5rem',
                    padding: '0 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: loading ? '#1e40af' : '#1e40af',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    lineHeight: 'normal',
                    opacity: loading ? 0.7 : 1,
                    transition: 'background-color 0.2s, opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#1e3a8a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#1e40af';
                    }
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loading ? 'Creating...' : 'Create Conference'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateConference;
