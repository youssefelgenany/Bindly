import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import courtsApiService from '../api/courtsApi';

const StudentCourtsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadCourts = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      const result = await courtsApiService.getCourts();
      
      if (result.success) {
        setCourts(result.data.courts || []);
      } else {
        setCourts([]);
        setError(result.message || 'Failed to fetch courts');
      }
    } catch (error) {
      setError(error?.message || 'Error loading courts');
      console.error('Error loading courts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  const loadCourtAvailability = async (courtId, date) => {
    try {
      setLoadingAvailability(true);
      // The API expects date as a query param, not in the URL path
      const result = await courtsApiService.getCourtAvailability(courtId, date);
      if (result.success) {
        setAvailabilityData(result.data);
      } else {
        console.error('Failed to fetch availability:', result.message);
        setAvailabilityData(null);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      setAvailabilityData(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleCourtClick = (court) => {
    setSelectedCourt(court);
    setAvailabilityData(null);
    loadCourtAvailability(court._id || court.id, selectedDate);
  };


  const getCourtTypeColor = (type) => {
    const colors = {
      basketball: '#FF6B35',
      tennis: '#4ECDC4',
      football: '#10B981',
      other: '#6B7280'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  const getCourtTypeIcon = (type) => {
    const icons = {
      basketball: 'sports_basketball',
      tennis: 'sports_tennis',
      football: 'sports_soccer',
      other: 'sports'
    };
    return icons[type?.toLowerCase()] || icons.other;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'User';

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
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>school</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Student Events
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
                  backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
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
                to="/student/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/student/my-registrations"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/my-registrations') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/my-registrations')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/my-registrations')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  event_note
                </span>
                <p style={{
                  color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/my-registrations') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Events
                </p>
              </Link>

              <Link
                to="/student/courts"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/courts') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/courts')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/courts')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  sports_tennis
                </span>
                <p style={{
                  color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/courts') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Campus Courts
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
                  textDecoration: 'none',
                  color: '#FFFFFF'
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
                <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
                  calendar_month
                </span>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Gym Schedule
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
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <div>
              <h1 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: 0
              }}>
                Campus Courts
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
                marginTop: '0.25rem'
              }}>
                View all courts and their availability
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>

          {/* Courts Grid */}
          {loading ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #1e40af',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginTop: '1rem',
                margin: 0
              }}>
                Loading courts...
              </p>
            </div>
          ) : error ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <p style={{
                color: '#dc2626',
                fontSize: '1rem',
                fontWeight: '600',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                Failed to load courts
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
                marginBottom: '1rem'
              }}>
                {error}
              </p>
              <button
                onClick={loadCourts}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                }}
              >
                Retry
              </button>
            </div>
          ) : courts.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏟️</div>
              <p style={{
                color: '#1D3557',
                fontSize: '1rem',
                fontWeight: '600',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                No courts found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0
              }}>
                No courts are currently available.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {courts.map(court => (
                <div
                  key={court._id || court.id}
                  onClick={() => handleCourtClick(court)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.target.style.borderColor = '#1e40af';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = 'none';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  {/* Court Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: getCourtTypeColor(court.type),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                        {getCourtTypeIcon(court.type)}
                      </span>
                    </div>
                    <div>
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1rem',
                        fontWeight: '600',
                        margin: 0,
                        marginBottom: '0.25rem'
                      }}>
                        {court.name}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        backgroundColor: getCourtTypeColor(court.type),
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {court.type}
                      </span>
                    </div>
                  </div>

                  {/* Court Details */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
                      {court.location}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>groups</span>
                      Capacity: {court.capacity} people
                    </div>
                    {court.facilities && court.facilities.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        flexWrap: 'wrap'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>sports</span>
                        {court.facilities.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourtClick(court);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#1e40af',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#1e3a8a';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#1e40af';
                    }}
                  >
                    View Availability
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Court Detail Modal */}
      {selectedCourt && (
        <div
          onClick={() => {
            setSelectedCourt(null);
            setAvailabilityData(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '42rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: getCourtTypeColor(selectedCourt.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                    {getCourtTypeIcon(selectedCourt.type)}
                  </span>
                </div>
                <div>
                  <h2 style={{
                    color: '#1D3557',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {selectedCourt.name}
                  </h2>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0,
                    marginTop: '0.25rem'
                  }}>
                    {selectedCourt.type.charAt(0).toUpperCase() + selectedCourt.type.slice(1)} Court
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCourt(null);
                  setAvailabilityData(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  transition: 'background-color 0.2s'
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

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Court Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                <div>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    Location
                  </p>
                  <p style={{
                    color: '#1D3557',
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    margin: 0
                  }}>
                    {selectedCourt.location}
                  </p>
                </div>
                <div>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    Capacity
                  </p>
                  <p style={{
                    color: '#1D3557',
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    margin: 0
                  }}>
                    {selectedCourt.capacity} people
                  </p>
                </div>
                <div>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    Status
                  </p>
                  <p style={{
                    color: selectedCourt.isActive ? '#059669' : '#dc2626',
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    margin: 0
                  }}>
                    {selectedCourt.isActive ? 'Available' : 'Closed'}
                  </p>
                </div>
                {selectedCourt.facilities && selectedCourt.facilities.length > 0 && (
                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      margin: 0,
                      marginBottom: '0.25rem'
                    }}>
                      Facilities
                    </p>
                    <p style={{
                      color: '#1D3557',
                      fontSize: '0.9375rem',
                      fontWeight: '500',
                      margin: 0
                    }}>
                      {selectedCourt.facilities.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Date Selector */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Select Date to View Availability
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    loadCourtAvailability(selectedCourt._id || selectedCourt.id, e.target.value);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f3f4f6',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                />
              </div>

              {/* Availability Display */}
              {loadingAvailability ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #1e40af',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem',
                    margin: 0
                  }}>
                    Loading availability...
                  </p>
                </div>
              ) : availabilityData ? (
                <div>
                  <h3 style={{
                    color: '#1D3557',
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '1rem'
                  }}>
                    Available Time Slots
                  </h3>
                  {availabilityData.availableSlots && availabilityData.availableSlots.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '0.75rem'
                    }}>
                      {availabilityData.availableSlots.map((slot, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#d1fae5',
                            border: '1px solid #10b981',
                            textAlign: 'center'
                          }}
                        >
                          <p style={{
                            color: '#059669',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            margin: 0
                          }}>
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '0.5rem'
                    }}>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        No available time slots for this date
                      </p>
                    </div>
                  )}

                  {availabilityData.bookings && availabilityData.bookings.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1rem',
                        fontWeight: '600',
                        margin: 0,
                        marginBottom: '1rem'
                      }}>
                        Booked Time Slots
                      </h3>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {availabilityData.bookings.map((booking, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #f87171'
                            }}
                          >
                            <p style={{
                              color: '#dc2626',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              margin: 0
                            }}>
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Select a date to view availability
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StudentCourtsView;
