import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { useAuth } from '../contexts/AuthContext';

const StudentMyRegistrations = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (user && user.email) {
      loadMyRegistrations();
    }
  }, [user]);

  const loadMyRegistrations = async () => {
    if (!user?.email) {
      setError('User email not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await studentRegistrationApi.getMyRegistrations(user.email);
      
      if (result.success) {
        setRegistrations(result.data.registrations || []);
      } else {
        setError(result.message || 'Failed to fetch registrations');
        setRegistrations([]);
      }
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

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

  const getEventTypeImage = (type) => {
    const imageMap = {
      conference: '/assets/images/conference-background.jpg',
      workshop: '/assets/images/workshop-background.jpg',
      bazaar: '/assets/images/bazaar-background.jpg',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type?.toLowerCase()] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: '#059669',
      pending: '#f59e0b',
      rejected: '#dc2626'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
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
    : user?.name || 'Student';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f6f7f8'
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

  const formatTableDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleRowExpansion = (registrationId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(registrationId)) {
        newSet.delete(registrationId);
      } else {
        newSet.add(registrationId);
      }
      return newSet;
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
    }}>
      {/* Header/Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2.5rem',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0,
              cursor: 'pointer'
            }}>
              Bindly
            </h2>
          </Link>
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
              Student
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

      {/* Horizontal Menu Bar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/student/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/student/events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/student/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/student/events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Events
          </Link>
          <Link
            to="/student/my-registrations"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/student/my-registrations') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/student/my-registrations') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/student/my-registrations') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Events
          </Link>
          <Link
            to="/student/courts"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/student/courts') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/student/courts') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/student/courts') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Campus Courts
          </Link>
          <Link
            to="/gym"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Gym Sessions
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
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
              My Events
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              View and manage your event registrations.
            </p>
          </div>

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
                onClick={() => navigate('/student/events')}
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
                      padding: 0,
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
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
                    {/* Event Type Image - Top Half */}
                    {getEventTypeImage(registration.eventType) && (
                      <div style={{
                        width: '100%',
                        height: '180px',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#f3f4f6',
                        flexShrink: 0
                      }}>
                        <img
                          src={getEventTypeImage(registration.eventType)}
                          alt={registration.eventType ? registration.eventType.charAt(0).toUpperCase() + registration.eventType.slice(1) : 'Event'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center'
                          }}
                          onError={(e) => {
                            // Fallback if image doesn't exist
                            e.target.style.display = 'none';
                            e.target.parentElement.style.backgroundColor = getEventTypeColor(registration.eventType);
                            e.target.parentElement.style.display = 'flex';
                            e.target.parentElement.style.alignItems = 'center';
                            e.target.parentElement.style.justifyContent = 'center';
                            if (!e.target.parentElement.querySelector('.fallback-text')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-text';
                              fallback.textContent = getEventTypeFallbackText(registration.eventType);
                              fallback.style.color = '#FFFFFF';
                              fallback.style.fontSize = '1.5rem';
                              fallback.style.fontWeight = '700';
                              e.target.parentElement.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    )}
                    
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
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
                          {registration.status}
                        </div>
                      </div>

                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        marginTop: 0,
                        lineHeight: '1.4'
                      }}>
                        {registration.eventTitle}
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
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
                          marginBottom: '0.75rem',
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
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Event Image at Top with Close Button Overlay */}
            <div style={{ position: 'relative' }}>
              {getEventTypeImage(selectedRegistration.eventType) && (
                <div style={{
                  width: '100%',
                  height: '200px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#f3f4f6',
                  flexShrink: 0
                }}>
                  <img
                    src={getEventTypeImage(selectedRegistration.eventType)}
                    alt={selectedRegistration.eventType ? selectedRegistration.eventType.charAt(0).toUpperCase() + selectedRegistration.eventType.slice(1) : 'Event'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.backgroundColor = getEventTypeColor(selectedRegistration.eventType);
                      e.target.parentElement.style.display = 'flex';
                      e.target.parentElement.style.alignItems = 'center';
                      e.target.parentElement.style.justifyContent = 'center';
                      if (!e.target.parentElement.querySelector('.fallback-text')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-text';
                        fallback.textContent = getEventTypeFallbackText(selectedRegistration.eventType);
                        fallback.style.color = '#FFFFFF';
                        fallback.style.fontSize = '1.5rem';
                        fallback.style.fontWeight = '700';
                        e.target.parentElement.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Close Button - Upper Right Corner */}
              <button
                onClick={() => setSelectedRegistration(null)}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'all 0.2s',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                paddingRight: '1rem'
              }}>
                {selectedRegistration.eventTitle}
              </h2>
            </div>
            
            <div style={{ 
              padding: '1rem 1.5rem 1.5rem 1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
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
                  {selectedRegistration.status}
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
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Student ID</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentId}</div>
          </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentEmail}</div>
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

export default StudentMyRegistrations;
