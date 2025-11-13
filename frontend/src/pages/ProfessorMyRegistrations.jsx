import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import professorApiService from '../api/professorApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { useAuth } from '../contexts/AuthContext';

const ProfessorMyRegistrations = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadMyRegistrations = useCallback(async () => {
    if (!user?.email) {
      setError('User email not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading professor registrations...');
      
      // Professors register through StudentRegistrationForm which uses studentRegistrationApi
      // So we need to check the student registration API, not the professor registration API
      const result = await studentRegistrationApi.getMyRegistrations(user.email);
      console.log('📦 Raw API result:', result);
      
      if (result.success) {
        // Student registration API returns { registrations: [...] }
        let rawRegistrations = result.data?.registrations || [];
        
        console.log('📋 Raw registrations:', rawRegistrations);
        console.log('📊 Number of registrations:', rawRegistrations.length);
        
        // The student registration API already formats the data correctly
        // So we can use it directly, but we need to ensure all fields are present
        const formattedRegistrations = rawRegistrations.map(reg => ({
          id: reg.id,
          eventId: reg.eventId,
          eventTitle: reg.eventTitle,
          eventType: reg.eventType,
          eventDate: reg.eventDate,
          eventEndDate: reg.eventEndDate,
          eventLocation: reg.eventLocation,
          eventDescription: reg.eventDescription || '',
          capacity: reg.capacity || null,
          registeredCount: reg.registeredCount || 0,
          studentName: reg.studentName || (user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.name || 'Professor'),
          professorName: reg.studentName || (user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.name || 'Professor'),
          studentId: reg.studentId || user?.gucId || null,
          studentEmail: reg.studentEmail || user?.email || '',
          professorEmail: reg.studentEmail || user?.email || '',
          status: reg.status || 'approved',
          registeredAt: reg.registeredAt || new Date(),
          emergencyContact: reg.emergencyContact || null,
          dietaryRequirements: reg.dietaryRequirements || null,
          medicalConditions: reg.medicalConditions || null
        }));
        
        console.log('✨ Final formatted registrations:', formattedRegistrations);
        console.log('📊 Final count:', formattedRegistrations.length);
        setRegistrations(formattedRegistrations);
      } else {
        console.error('❌ API returned error:', result.message);
        setError(result.message || 'Failed to fetch registrations');
        setRegistrations([]);
      }
    } catch (err) {
      console.error('❌ Error loading registrations:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.email) {
      loadMyRegistrations();
    }
  }, [user, loadMyRegistrations]);

  // Refresh registrations when navigating to this page
  useEffect(() => {
    if (location.pathname === '/professor/events' && user && user.email) {
      loadMyRegistrations();
    }
  }, [location.pathname, user, loadMyRegistrations]);

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1', // Light pink
      trip: '#2196F3',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      other: '#757575'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: '#059669',
      registered: '#059669',
      pending: '#f59e0b',
      rejected: '#dc2626'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getDisplayStatus = (status) => {
    // Map "approved" to "registered" for display
    if (status?.toLowerCase() === 'approved') {
      return 'registered';
    }
    return status;
  };

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f6f6'
      }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #1e40af',
          borderRadius: '50%',
          display: 'inline-block'
        }} className="spinner"></div>
      </div>
    );
  }

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
                  Professor Portal
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
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/dashboard')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/dashboard')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  dashboard
                </span>
                <p style={{
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/dashboard') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/professor/all-events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/all-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/all-events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/all-events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/all-events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/professor/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  event
                </span>
                <p style={{
                  color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Events
                </p>
              </Link>

              <Link
                to="/professor/my-workshops"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/my-workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/my-workshops')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/my-workshops')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  work
                </span>
                <p style={{
                  color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/my-workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Workshops
                </p>
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
                <p style={{
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  View Gym Sessions
                </p>
              </Link>

              <Link
                to="/professor/create-workshop"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/create-workshop') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/create-workshop')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/create-workshop')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  add_circle
                </span>
                <p style={{
                  color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/create-workshop') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Create Workshop
                </p>
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
              My Events
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
                {displayName}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0
              }}>
                Professor
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

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f8f6f6'
        }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {!loading && registrations.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                opacity: 0.5
              }}>📋</div>
              <p style={{
                color: '#374151',
                fontSize: '1.125rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                marginTop: 0
              }}>
                No registrations found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                marginTop: 0
              }}>
                You haven't registered for any events yet. Browse events to get started!
              </p>
              <button
                onClick={() => navigate('/professor/all-events')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                  e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                  e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              >
                Browse Events
              </button>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: '1.5rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Found {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {registrations.map(registration => (
                  <div
                    key={registration.id}
                    onClick={() => setSelectedRegistration(registration)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#1e40af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '0.5rem',
                        backgroundColor: getEventTypeColor(registration.eventType),
                        color: '#FFFFFF',
                        fontSize: '0.6875rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {registration.eventType}
                      </div>
                      <div style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '0.5rem',
                        backgroundColor: getStatusColor(registration.status),
                        color: '#FFFFFF',
                        fontSize: '0.6875rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {getDisplayStatus(registration.status)}
                      </div>
                    </div>

                    <h3 style={{
                      color: '#1D3557',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      marginTop: 0,
                      lineHeight: '1.4'
                    }}>
                      {registration.eventTitle}
                    </h3>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                      marginBottom: '1rem',
                      flex: 1
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        fontSize: '0.8125rem',
                        color: '#6b7280'
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: '1.125rem',
                          color: '#9ca3af'
                        }}>
                          calendar_today
                        </span>
                        <span>{formatDate(registration.eventDate)}</span>
                        {getDaysUntilEvent(registration.eventDate) && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#1e40af',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            marginLeft: 'auto'
                          }}>
                            {getDaysUntilEvent(registration.eventDate)}
                          </span>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        fontSize: '0.8125rem',
                        color: '#6b7280'
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: '1.125rem',
                          color: '#9ca3af'
                        }}>
                          location_on
                        </span>
                        <span>{registration.eventLocation}</span>
                      </div>
                      {registration.capacity && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          fontSize: '0.8125rem',
                          color: '#6b7280'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.125rem',
                            color: '#9ca3af'
                          }}>
                            people
                          </span>
                          <span>{registration.registeredCount || 0}/{registration.capacity} registered</span>
                        </div>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        fontSize: '0.8125rem',
                        color: '#6b7280'
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: '1.125rem',
                          color: '#9ca3af'
                        }}>
                          schedule
                        </span>
                        <span>Registered: {formatDate(registration.registeredAt)}</span>
                      </div>
                    </div>

                    {registration.eventDescription && (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.8125rem',
                        marginBottom: '1rem',
                        marginTop: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.5'
                      }}>
                        {registration.eventDescription}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Registration Detail Modal */}
      {selectedRegistration && (
        <div
          onClick={() => setSelectedRegistration(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                {selectedRegistration.eventTitle}
              </h2>
              <button
                onClick={() => setSelectedRegistration(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  transition: 'background-color 0.2s',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: getEventTypeColor(selectedRegistration.eventType),
                  color: '#FFFFFF',
                  fontSize: '0.6875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {selectedRegistration.eventType}
                </div>
                <div style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: getStatusColor(selectedRegistration.status),
                  color: '#FFFFFF',
                  fontSize: '0.6875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {getDisplayStatus(selectedRegistration.status)}
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    calendar_today
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Event Date</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedRegistration.eventDate)}</div>
                  </div>
                </div>
                {selectedRegistration.eventEndDate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      event
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>End Date</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedRegistration.eventEndDate)}</div>
                    </div>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    location_on
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Location</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{selectedRegistration.eventLocation}</div>
                  </div>
                </div>
                {selectedRegistration.capacity && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      people
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Capacity</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{selectedRegistration.registeredCount || 0}/{selectedRegistration.capacity} registered</div>
                    </div>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    schedule
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Registered At</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedRegistration.registeredAt)}</div>
                  </div>
                </div>
              </div>

              {selectedRegistration.eventDescription && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Description
                  </div>
                  <p style={{
                    color: '#374151',
                    lineHeight: '1.6',
                    margin: 0,
                    fontSize: '0.875rem'
                  }}>
                    {selectedRegistration.eventDescription}
                  </p>
                </div>
              )}

              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginBottom: '0.75rem',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                    person
                  </span>
                  Your Registration Details
                </div>
                <div style={{
                  display: 'grid',
                  gap: '0.75rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Name</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentName || selectedRegistration.professorName || displayName}</div>
                  </div>
                  {selectedRegistration.studentId && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Student ID</div>
                      <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentId}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentEmail || selectedRegistration.professorEmail || user?.email}</div>
                  </div>
                </div>
              </div>

              {selectedRegistration.eventType === 'trip' && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginBottom: '0.75rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                      flight_takeoff
                    </span>
                    Trip Information
                  </div>
                  {selectedRegistration.emergencyContact && (
                    <div style={{
                      display: 'grid',
                      gap: '0.75rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Emergency Contact</div>
                        <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.emergencyContact.name}</div>
                      </div>
                      {selectedRegistration.emergencyContact.phone && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Contact Phone</div>
                          <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.emergencyContact.phone}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedRegistration.dietaryRequirements && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Dietary Requirements</div>
                      <div style={{ color: '#374151', fontSize: '0.875rem' }}>{selectedRegistration.dietaryRequirements}</div>
                    </div>
                  )}
                  {selectedRegistration.medicalConditions && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Medical Conditions</div>
                      <div style={{ color: '#374151', fontSize: '0.875rem' }}>{selectedRegistration.medicalConditions}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
  );
};

export default ProfessorMyRegistrations;

