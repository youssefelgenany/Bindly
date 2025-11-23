import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { eventsApiService } from '../api/eventsApi';
import { useAuth } from '../contexts/AuthContext';

const StaffMyRegistrations = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRegistrationData, setCancelRegistrationData] = useState(null);
  const [favoriteEventIds, setFavoriteEventIds] = useState(new Set());
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [cancelSuccessData, setCancelSuccessData] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Staff';

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown]);

  const loadMyRegistrations = useCallback(async () => {
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
        // Filter out unpaid registrations (only show paid registrations)
        const allRegistrations = result.data.registrations || [];
        const paidRegistrations = allRegistrations.filter(reg => reg.paid === true);
        setRegistrations(paidRegistrations);
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
  }, [user]);

  useEffect(() => {
    if (user && user.email) {
      loadMyRegistrations();
    }
    
    // Check for payment success query param
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('payment_success') === 'true') {
      const eventTitle = searchParams.get('event_title') || 'the event';
      setShowPaymentSuccess(true);
      // Store event title for display
      sessionStorage.setItem('paymentSuccessEventTitle', eventTitle);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, loadMyRegistrations]);

  // Load user's favorite events (for TA users)
  useEffect(() => {
    const loadFavoriteEvents = async () => {
      if (!user || user.userType !== 'TA') return;
      
      try {
        const result = await eventsApiService.getFavoriteEvents();
        if (result.success) {
          const favoriteIds = new Set();
          const events = Array.isArray(result.data) ? result.data : (result.data.events || []);
          events.forEach(event => {
            if (event._id) favoriteIds.add(String(event._id));
            if (event.id) favoriteIds.add(String(event.id));
          });
          setFavoriteEventIds(favoriteIds);
        }
      } catch (error) {
        console.error('Error loading favorite events:', error);
      }
    };

    loadFavoriteEvents();
  }, [user]);

  const handleToggleFavorite = async (eventId, e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!user || user.userType !== 'TA') return;
    
    const isFavorite = favoriteEventIds.has(String(eventId));
    
    try {
      if (isFavorite) {
        const result = await eventsApiService.removeFromFavorites(eventId);
        if (result.success) {
          setFavoriteEventIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(eventId));
            return newSet;
          });
        }
      } else {
        const result = await eventsApiService.addToFavorites(eventId);
        if (result.success) {
          setFavoriteEventIds(prev => new Set([...prev, String(eventId)]));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
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
              Staff
            </p>
          </div>
          <div 
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
          >
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
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'S').toUpperCase()}
              </div>
            )}
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '150px'
              }}>
                {user?.userType === 'TA' && (
                  <Link
                    to="/wallet"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#1D3557',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowLogoutDropdown(false)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                      account_balance_wallet
                    </span>
                    My Wallet
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    logout
                  </span>
                  Logout
                </button>
              </div>
            )}
          </div>
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
            to="/staff/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/staff/events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/staff/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/staff/events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Events
          </Link>
          <Link
            to="/staff/my-registrations"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/staff/my-registrations') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/staff/my-registrations') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/staff/my-registrations') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Events
          </Link>
          <Link
            to="/staff/favorites"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/staff/favorites') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/staff/favorites') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/staff/favorites') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Favorites
          </Link>
          <Link
            to="/gym-schedule"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym-schedule') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym-schedule') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym-schedule') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            View Gym Sessions
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
          padding: '2rem 0',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Content Wrapper with Margins */}
          <div style={{
            marginLeft: '4rem',
            marginRight: '4rem'
          }}>
          {/* Page Title Banner */}
          <div style={{
            position: 'relative',
            height: '140px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/events-banner.jpeg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)'
            }}></div>
            {/* Blue Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)'
            }}></div>
            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '2rem 2.5rem',
              color: '#FFFFFF'
            }}>
              <h3 style={{
                color: '#FFFFFF',
                fontSize: '1.75rem',
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                My Events
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                View and manage your event registrations.
              </p>
            </div>
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
                onClick={() => navigate('/staff/events')}
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
                        {/* Heart Icon for TA users */}
                        {user?.userType === 'TA' && (
                          <button
                            onClick={(e) => handleToggleFavorite(registration.eventId, e)}
                            style={{
                              position: 'absolute',
                              top: '0.75rem',
                              right: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '2.5rem',
                              height: '2.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#ffffff';
                              e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            <span 
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '1.25rem',
                                color: favoriteEventIds.has(String(registration.eventId)) ? '#dc2626' : '#6b7280',
                                transition: 'color 0.2s'
                              }}
                            >
                              {favoriteEventIds.has(String(registration.eventId)) ? 'favorite' : 'favorite_border'}
                            </span>
                          </button>
                        )}
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
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (registration.status?.toLowerCase() === 'approved') {
                              setCancelRegistrationData(registration);
                              setShowCancelModal(true);
                            }
                          }}
                          style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '0.5rem',
                            backgroundColor: getStatusColor(registration.status),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: registration.status?.toLowerCase() === 'approved' ? 'pointer' : 'default',
                            transition: registration.status?.toLowerCase() === 'approved' ? 'all 0.2s' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (registration.status?.toLowerCase() === 'approved') {
                              e.target.style.opacity = '0.9';
                              e.target.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (registration.status?.toLowerCase() === 'approved') {
                              e.target.style.opacity = '1';
                              e.target.style.transform = 'scale(1)';
                            }
                          }}
                        >
                          {getDisplayStatus(registration.status)}
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
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>{selectedRegistration.studentName}</div>
              </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{user?.userType === 'TA' ? 'TA ID' : 'Student ID'}</div>
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

              {/* Cancel Button - Only show for paid registrations that haven't started */}
              {selectedRegistration.paid && 
               selectedRegistration.eventDate && 
               new Date(selectedRegistration.eventDate) > new Date() && (
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to cancel this registration? The refund will be added to your wallet.')) {
                        setCancelling(true);
                        try {
                          const eventId = selectedRegistration.eventId;
                          if (!eventId) {
                            alert('Event ID not found');
                            setCancelling(false);
                            return;
                          }
                          const result = await eventsApiService.cancelRegistration(eventId);
                          if (result.success) {
                            alert(result.data.msg || 'Registration cancelled successfully. Refund has been added to your wallet.');
                            setSelectedRegistration(null);
                            loadMyRegistrations();
                            // Reload wallet balance if on wallet page
                            if (window.location.pathname === '/wallet') {
                              window.location.reload();
                            }
                          } else {
                            alert(result.message || 'Failed to cancel registration');
                          }
                        } catch (err) {
                          console.error('Cancel error:', err);
                          alert('An error occurred while cancelling registration');
                        } finally {
                          setCancelling(false);
                        }
                      }
                    }}
                    disabled={cancelling}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: cancelling ? '#9ca3af' : '#dc2626',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: cancelling ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      cancel
                    </span>
                    {cancelling ? 'Cancelling...' : 'Cancel Registration & Get Refund'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Registration Modal */}
      {showCancelModal && cancelRegistrationData && (
        <div
          onClick={() => setShowCancelModal(false)}
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
              maxWidth: '400px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              marginTop: 0
            }}>
              Cancel Registration
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              Are you sure you want to cancel your registration for <strong>{cancelRegistrationData.eventTitle}</strong>?
              {cancelRegistrationData.paid && ' The refund will be added to your wallet.'}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
              <button
                onClick={async () => {
                  setCancelling(true);
                  try {
                    const eventId = cancelRegistrationData.eventId;
                    if (!eventId) {
                      alert('Event ID not found');
                      setCancelling(false);
                      return;
                    }
                    const result = await eventsApiService.cancelRegistration(eventId);
                    if (result.success) {
                      setCancelSuccessData({
                        eventTitle: cancelRegistrationData.eventTitle,
                        refunded: result.data.refunded || false
                      });
                      setShowCancelModal(false);
                      setCancelRegistrationData(null);
                      setShowCancelSuccess(true);
                      loadMyRegistrations();
                      // Trigger wallet refresh event for wallet page if open
                      window.dispatchEvent(new Event('walletRefresh'));
                    } else {
                      alert(result.message || 'Failed to cancel registration');
                    }
                  } catch (err) {
                    console.error('Cancel error:', err);
                    alert('An error occurred while cancelling registration');
                  } finally {
                    setCancelling(false);
                  }
                }}
                disabled={cancelling}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: cancelling ? '#9ca3af' : '#dc2626',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Success Modal */}
      {showCancelSuccess && cancelSuccessData && (
        <div
          onClick={() => {
            setShowCancelSuccess(false);
            setCancelSuccessData(null);
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
              maxWidth: '500px',
              width: '100%',
              padding: '3rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2rem'
            }}>
              ✅
            </div>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              marginTop: 0
            }}>
              Registration Cancelled!
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}>
              Your registration for <strong style={{ color: '#1D3557' }}>{cancelSuccessData.eventTitle}</strong> has been cancelled successfully.
            </p>
            {cancelSuccessData.refunded && (
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem'
              }}>
                The refund has been added to your wallet.
              </p>
            )}
            <button
              onClick={() => {
                setShowCancelSuccess(false);
                setCancelSuccessData(null);
              }}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1e3a8a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#1e40af';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div
          onClick={() => setShowPaymentSuccess(false)}
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
              maxWidth: '500px',
              width: '100%',
              padding: '3rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2rem'
            }}>
              ✅
            </div>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              marginTop: 0
            }}>
              Registration Successful!
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}>
              You have been successfully registered for <strong style={{ color: '#1D3557' }}>{sessionStorage.getItem('paymentSuccessEventTitle') || 'the event'}</strong>
            </p>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              A payment confirmation email has been sent to <strong style={{ color: '#1D3557' }}>{user?.email}</strong>
            </p>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1e3a8a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#1e40af';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMyRegistrations;
