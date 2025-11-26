import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';
import { notificationApiService } from '../api/notificationApi';

const StaffFavorites = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [eventRatings, setEventRatings] = useState({});
  const [showRatingsCommentsModal, setShowRatingsCommentsModal] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [ratingsAndComments, setRatingsAndComments] = useState(null);
  const [loadingRatingsComments, setLoadingRatingsComments] = useState(false);
  const [ratingsLoadError, setRatingsLoadError] = useState('');

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

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
      if (showNotificationsDropdown && !event.target.closest('[data-notifications-dropdown]')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown, showNotificationsDropdown]);

  const loadFavoriteEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const result = await eventsApiService.getFavoriteEvents();
      
      if (result.success) {
        const eventsList = Array.isArray(result.data.events) ? result.data.events : [];
        const mapped = eventsList.map(ev => ({
          id: ev._id || ev.id,
          title: ev.title,
          type: ev.type,
          status: ev.status || 'pending',
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          registeredCount: ev.registeredCount,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          faculty: ev.faculty,
          professors: ev.professors,
          bannerFile: ev.bannerFile,
          creatorName: ev.creatorName,
          creatorRole: ev.creatorRole,
          vendors: ev.vendors || [],
          vendorRequests: ev.vendorRequests || []
        }))
        .filter(ev => {
          const type = (ev.type || '').toLowerCase();
          const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
          return validTypes.includes(type) && 
                 ev.title && ev.title.trim() !== '' && 
                 ev.location && ev.location.trim() !== '';
        });
        setFavoriteEvents(mapped);

        const ratingsMap = {};
        await Promise.all(mapped.map(async (ev) => {
          if (ev.id) {
            try {
              const ratingResult = await eventsApiService.getRatingsAndComments(ev.id);
              if (ratingResult.success && ratingResult.data?.ratings) {
                ratingsMap[ev.id] = {
                  average: ratingResult.data.ratings.average || 0,
                  count: ratingResult.data.ratings.count || 0
                };
              }
            } catch (err) {
              // ignore individual rating errors
            }
          }
        }));
        setEventRatings(ratingsMap);
      } else {
        setFavoriteEvents([]);
        setError(result.message || 'Failed to fetch favorite events');
      }
    } catch (error) {
      setError(error?.message || 'Error loading favorite events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavoriteEvents();
  }, [loadFavoriteEvents]);

  const handleRemoveFavorite = async (eventId, e) => {
    e.stopPropagation();
    
    try {
      const result = await eventsApiService.removeFromFavorites(eventId);
      if (result.success) {
        setFavoriteEvents(prev => prev.filter(ev => String(ev.id) !== String(eventId)));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1',
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

  const loadRatingsAndComments = async (eventId) => {
    if (!eventId) {
      setRatingsLoadError('Event ID is required');
      return;
    }
    setLoadingRatingsComments(true);
    setRatingsLoadError('');
    try {
      const result = await eventsApiService.getRatingsAndComments(String(eventId));
      if (result.success) {
        setRatingsAndComments(result.data);
      } else {
        setRatingsLoadError(result.message || result.error?.message || 'Failed to load ratings and comments');
      }
    } catch (err) {
      console.error('Error loading ratings and comments:', err);
      setRatingsLoadError(err.response?.data?.message || err.message || 'Error loading ratings and comments');
    } finally {
      setLoadingRatingsComments(false);
    }
  };

  const handleViewRatingsComments = async (event) => {
    if (!event?.id) {
      setRatingsLoadError('Event data not available');
      return;
    }

    setSelectedEventForView({
      eventId: String(event.id),
      eventTitle: event.title,
      eventDate: event.startDate,
      eventEndDate: event.endDate,
      eventLocation: event.location
    });
    setRatingsAndComments(null);
    setRatingsLoadError('');
    setShowRatingsCommentsModal(true);
    await loadRatingsAndComments(event.id);
  };

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);

      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(
          notificationsResult.data.data.notifications ||
          notificationsResult.data.data ||
          []
        );
      }

      if (countResult.success) {
        setUnreadCount(countResult.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationApiService.markAllAsRead();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || (user?.userType === 'TA' ? 'TA' : 'Staff');

  const userRole = user?.userType === 'TA' ? 'TA' : 'Staff';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557', flex: '0 0 auto' }}>
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
        
        {/* Centered Navigation Menu */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '1.25rem'
        }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #2563eb' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              dashboard
            </span>
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
              borderBottom: isActiveRoute('/staff/events') ? '2px solid #2563eb' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              explore
            </span>
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
              borderBottom: isActiveRoute('/staff/my-registrations') ? '2px solid #2563eb' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              event
            </span>
            My Events
          </Link>
          <Link
            to="/gym"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym') ? '2px solid #2563eb' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              fitness_center
            </span>
            Gym Sessions
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          {/* Heart Icon - Favorites */}
          <Link
            to="/staff/favorites"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              textDecoration: 'none',
              color: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: '1.5rem',
              color: '#1D3557'
            }}>
              favorite
            </span>
          </Link>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }} data-notifications-dropdown>
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowLogoutDropdown(false);
                if (!showNotificationsDropdown) {
                  loadNotifications();
                }
              }}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '1.5rem',
                color: '#1D3557'
              }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  backgroundColor: '#ef4444',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '1.125rem',
                  height: '1.125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  border: '2px solid #FFFFFF'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 1001,
                width: '360px',
                maxHeight: '500px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    margin: 0
                  }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        padding: '0.25rem 0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.textDecoration = 'none';
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{
                  overflowY: 'auto',
                  maxHeight: '400px'
                }}>
                  {loadingNotifications ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                          if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                            navigate('/staff/events');
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                            navigate('/staff/my-registrations');
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            navigate('/staff/loyalty-vendors');
                            setShowNotificationsDropdown(false);
                          }
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fff7ed'
                              : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          gap: '0.75rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#f8fafc' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#ffedd5'
                              : '#edf2ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fff7ed'
                              : '#f8fafc';
                        }}
                      >
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.75rem',
                          backgroundColor: notification.priority === 'high' ? '#fef3c7' : '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.25rem',
                            color: notification.priority === 'high' ? '#b45309' : '#4338ca'
                          }}>
                            {notification.type === 'event_announcement' || notification.type === 'new_event' ? 'campaign'
                              : notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder' ? 'event'
                              : 'notifications'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: notification.isRead ? '400' : '600',
                            color: '#1D3557',
                            fontSize: '0.875rem',
                            marginBottom: '0.25rem'
                          }}>
                            {notification.title || notification.message}
                          </div>
                          {notification.message && notification.message !== notification.title && (
                            <div style={{
                              fontSize: '0.8125rem',
                              color: '#475569',
                              marginBottom: '0.25rem'
                            }}>
                              {notification.message}
                            </div>
                          )}
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8'
                          }}>
                            {formatNotificationDate(notification.createdAt)}
                          </div>
                        </div>
                        {!notification.isRead && (
                          <span style={{
                            width: '0.5rem',
                            height: '0.5rem',
                            borderRadius: '50%',
                            backgroundColor: '#2563eb',
                            alignSelf: 'center'
                          }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
              {userRole}
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
                {(user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Student') && (
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

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          padding: '2rem 0',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
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
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/assets/images/events-banner.jpeg)',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                filter: 'blur(2px)'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(29, 53, 87, 0.75)'
              }}></div>
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
                  My Favorites
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  margin: 0
                }}>
                  Your favorite events saved for later.
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

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #1e40af',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  display: 'inline-block'
                }} className="spinner"></div>
                <p style={{ margin: 0, color: '#6b7280' }}>Loading favorite events...</p>
              </div>
            ) : favoriteEvents.length === 0 ? (
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
                }}>❤️</div>
                <p style={{
                  color: '#374151',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  marginTop: 0
                }}>
                  No favorite events yet
                </p>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  marginTop: 0
                }}>
                  Start exploring events and add them to your favorites!
                </p>
                <Link
                  to="/staff/events"
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#1e40af',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'inline-block',
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
                  Discover Events
                </Link>
              </div>
            ) : (
              <>
                <div style={{
                  marginBottom: '1.5rem',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {favoriteEvents.length} favorite event{favoriteEvents.length !== 1 ? 's' : ''}
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {favoriteEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
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
                      {/* Event Type Image */}
                      {getEventTypeImage(event.type) && (
                        <div style={{
                          width: '100%',
                          height: '180px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#f3f4f6',
                          flexShrink: 0
                        }}>
                          <img
                            src={getEventTypeImage(event.type)}
                            alt={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.style.backgroundColor = getEventTypeColor(event.type);
                              e.target.parentElement.style.display = 'flex';
                              e.target.parentElement.style.alignItems = 'center';
                              e.target.parentElement.style.justifyContent = 'center';
                              if (!e.target.parentElement.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text';
                                fallback.textContent = getEventTypeFallbackText(event.type);
                                fallback.style.color = '#FFFFFF';
                                fallback.style.fontSize = '1.5rem';
                                fallback.style.fontWeight = '700';
                                e.target.parentElement.appendChild(fallback);
                              }
                            }}
                          />
                          {/* Remove from Favorites Button */}
                          <button
                            onClick={(e) => handleRemoveFavorite(event.id, e)}
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
                                fontSize: '1.5rem',
                                color: '#ef4444'
                              }}
                            >
                              favorite
                            </span>
                          </button>
                        </div>
                      )}
                      
                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '0.5rem',
                            backgroundColor: getEventTypeColor(event.type),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {event.type}
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
                          {event.title}
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
                            {formatDate(event.startDate)}
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
                            {event.location}
                          </div>
                        </div>
                        <div style={{
                          marginTop: 'auto',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewRatingsComments(event);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              borderRadius: '0.375rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="View ratings and comments"
                          >
                            <span className="material-symbols-outlined" style={{
                              fontSize: '1rem',
                              color: '#fbbf24'
                            }}>
                              star
                            </span>
                            <span style={{
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              {eventRatings[event.id]?.average > 0
                                ? eventRatings[event.id].average.toFixed(1)
                                : '—'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      {showRatingsCommentsModal && selectedEventForView && (
        <div
          onClick={() => {
            setShowRatingsCommentsModal(false);
            setSelectedEventForView(null);
            setRatingsAndComments(null);
            setRatingsLoadError('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1002
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  color: '#1D3557',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: 0
                }}>
                  Ratings & Comments
                </h2>
                {selectedEventForView.eventTitle && (
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    {selectedEventForView.eventTitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowRatingsCommentsModal(false);
                  setSelectedEventForView(null);
                  setRatingsAndComments(null);
                  setRatingsLoadError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'all 0.2s',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
                position: 'relative',
                zIndex: 10
              }}
            >
              {ratingsLoadError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  {ratingsLoadError}
                </div>
              )}

              {loadingRatingsComments ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6b7280'
                }}>
                  Loading...
                </div>
              ) : ratingsAndComments ? (
                <>
                  {ratingsAndComments.ratings && (
                    <div style={{
                      marginBottom: '2rem',
                      padding: '1.5rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.5rem'
                    }}>
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        marginTop: 0
                      }}>
                        Ratings
                      </h3>
                      {ratingsAndComments.ratings.count > 0 ? (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              fontSize: '2.5rem',
                              fontWeight: '700',
                              color: '#1D3557'
                            }}>
                              {ratingsAndComments.ratings.average.toFixed(1)}
                            </div>
                            <div>
                              <div style={{
                                display: 'flex',
                                gap: '0.25rem',
                                marginBottom: '0.25rem'
                              }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    style={{
                                      fontSize: '1.25rem',
                                      color: star <= Math.round(ratingsAndComments.ratings.average) ? '#fbbf24' : '#d1d5db'
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                Based on {ratingsAndComments.ratings.count} rating{ratingsAndComments.ratings.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          {ratingsAndComments.ratings.distribution && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}>
                              {[5, 4, 3, 2, 1].map((star) => (
                                <div key={star} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem'
                                }}>
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '60px' }}>
                                    {star} star{star !== 1 ? 's' : ''}
                                  </span>
                                  <div style={{
                                    flex: 1,
                                    height: '8px',
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '0.25rem',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${ratingsAndComments.ratings.count > 0 ? (ratingsAndComments.ratings.distribution[star] || 0) / ratingsAndComments.ratings.count * 100 : 0}%`,
                                      height: '100%',
                                      backgroundColor: '#fbbf24',
                                      transition: 'width 0.3s'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '40px' }}>
                                    {ratingsAndComments.ratings.distribution[star] || 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p style={{
                          color: '#6b7280',
                          fontSize: '0.875rem',
                          margin: 0
                        }}>
                          No ratings yet
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 style={{
                      color: '#1D3557',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      marginTop: 0
                    }}>
                      Comments ({ratingsAndComments.comments?.length || 0})
                    </h3>
                    {ratingsAndComments.comments && ratingsAndComments.comments.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {ratingsAndComments.comments.map((comment) => (
                          <div
                            key={comment._id}
                            style={{
                              padding: '1rem',
                              backgroundColor: '#f9fafb',
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '0.5rem'
                            }}>
                              <div>
                                <div style={{
                                  fontWeight: '600',
                                  color: '#1D3557',
                                  fontSize: '0.875rem'
                                }}>
                                  {comment.user?.firstName} {comment.user?.lastName}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  {comment.user?.userType || 'User'}
                                </div>
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280'
                              }}>
                                {formatNotificationDate(comment.createdAt)}
                              </div>
                            </div>
                            <p style={{
                              color: '#374151',
                              fontSize: '0.875rem',
                              lineHeight: '1.6',
                              margin: 0
                            }}>
                              {comment.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem'
                      }}>
                        No comments yet
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6b7280'
                }}>
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffFavorites;

