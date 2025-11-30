import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorRequestApi } from '../api/vendorRequestApi';
import { notificationApiService } from '../api/notificationApi';

const BoothPolls = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState({});
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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

  // Determine user type for navigation
  const userType = user?.userType?.toLowerCase() || 'student';
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || (userType.charAt(0).toUpperCase() + userType.slice(1));

  // Get navigation links based on user type
  const getNavigationLinks = () => {
    const baseLinks = [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }
    ];

    if (userType === 'student') {
      return [
        ...baseLinks,
        { to: '/student/events', label: 'Discover Events', icon: 'explore' },
        { to: '/student/my-registrations', label: 'My Events', icon: 'event' },
        { to: '/student/courts', label: 'Campus Courts', icon: 'sports_tennis' },
        { to: '/gym', label: 'Gym Sessions', icon: 'fitness_center' },
        { to: '/booth-polls', label: 'Vendor Polls', icon: 'poll' }
      ];
    } else if (userType === 'staff') {
      return [
        ...baseLinks,
        { to: '/staff/events', label: 'Discover Events', icon: 'explore' },
        { to: '/staff/my-registrations', label: 'My Events', icon: 'event' },
        { to: '/gym', label: 'Gym Sessions', icon: 'fitness_center' },
        { to: '/booth-polls', label: 'Vendor Polls', icon: 'poll' }
      ];
    } else if (userType === 'ta') {
      return [
        ...baseLinks,
        { to: '/ta/events', label: 'Discover Events', icon: 'explore' },
        { to: '/ta/my-registrations', label: 'My Events', icon: 'event' },
        { to: '/gym', label: 'Gym Sessions', icon: 'fitness_center' },
        { to: '/booth-polls', label: 'Vendor Polls', icon: 'poll' }
      ];
    } else if (userType === 'professor') {
      return [
        ...baseLinks,
        { to: '/professor/all-events', label: 'Discover Events', icon: 'explore' },
        { to: '/professor/events', label: 'My Events', icon: 'event' },
        { to: '/professor/my-workshops', label: 'My Workshops', icon: 'school' },
        { to: '/gym', label: 'Gym Sessions', icon: 'fitness_center' },
        { to: '/booth-polls', label: 'Vendor Polls', icon: 'poll' }
      ];
    }
    return baseLinks;
  };

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);
      
      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(notificationsResult.data.data.notifications || notificationsResult.data.data || []);
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

  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev => prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        ));
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
      console.error('Error marking all as read:', error);
    }
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now - date;
      const diffInMins = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMs / 3600000);
      const diffInDays = Math.floor(diffInMs / 86400000);

      if (diffInMins < 1) return 'Just now';
      if (diffInMins < 60) return `${diffInMins} min${diffInMins !== 1 ? 's' : ''} ago`;
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const loadPolls = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await vendorRequestApi.getPublicPolls();
      
      if (result.success) {
        setPolls(result.polls || []);
      } else {
        setError(result.message || 'Failed to load polls');
        setPolls([]);
      }
    } catch (err) {
      console.error('Error loading polls:', err);
      setError('Failed to load polls');
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const handleVote = async (pollId, optionIndex) => {
    // Prevent multiple clicks while voting
    if (voting[pollId]) {
      return;
    }
    
    try {
      setVoting(prev => ({ ...prev, [pollId]: true }));
      
      const result = await vendorRequestApi.voteInPoll(pollId, optionIndex);
      
      if (result.success) {
        await loadPolls();
      } else {
        alert(result.message || 'Failed to vote');
      }
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to vote. Please try again.');
    } finally {
      setVoting(prev => {
        const newState = { ...prev };
        delete newState[pollId];
        return newState;
      });
    }
  };

  const getLocationName = (location) => {
    const locationNames = {
      'sports-area': 'Sports Area',
      'parking': 'Parking',
      'main-gate': 'Main Gate',
      'platform': 'Platform',
      'exam-halls': 'Exam Halls'
    };
    return locationNames[location] || location;
  };

  const getFavoritesPath = () => {
    if (userType === 'student') return '/student/favorites';
    if (userType === 'staff') return '/staff/favorites';
    if (userType === 'ta') return '/ta/favorites';
    if (userType === 'professor') return '/professor/favorites';
    return '/dashboard';
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes zoomIn {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.1);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .banner-animate {
          animation: fadeInUp 0.6s ease-out;
        }
        .banner-content-animate {
          animation: slideInLeft 1s ease-out 0.2s both;
        }
      `}</style>
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
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2.5rem',
        backgroundColor: '#1D3557'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{
              color: '#FFFFFF',
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
          {getNavigationLinks().map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                textDecoration: 'none',
                color: isActiveRoute(link.to) ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute(link.to) ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute(link.to) ? '2px solid #FFFFFF' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          {/* Heart Icon - Favorites */}
          <Link
            to={getFavoritesPath()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ 
              fontSize: '1.5rem',
              color: '#FFFFFF'
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
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '1.5rem',
                color: '#FFFFFF'
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
                    notifications.map((notification) => {
                      const isTA = user?.userType === 'TA';
                      return (
                        <div
                          key={notification._id}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification._id);
                            }
                            if (isTA) {
                              // All event-related notifications redirect to discover events for TA
                              if ((notification.type === 'event_announcement' || notification.type === 'new_event' || 
                                   notification.type === 'event_reminder' || 
                                   notification.type === 'workshop_reminder' || 
                                   notification.type === 'trip_reminder' ||
                                   notification.type === 'gym_session_reminder') && 
                                  (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)) {
                                navigate('/ta/events');
                                setShowNotificationsDropdown(false);
                              } else if (
                                notification.type === 'new_loyalty_partner' || 
                                notification.type === 'loyalty_partner_added' ||
                                notification.type === 'loyalty_program_application' ||
                                (notification.type === 'system' && notification.metadata?.vendorId)
                              ) {
                                navigate('/ta/loyalty-vendors');
                                setShowNotificationsDropdown(false);
                              } else {
                                setShowNotificationsDropdown(false);
                              }
                            } else {
                              handleMarkAsRead(notification._id);
                              setShowNotificationsDropdown(false);
                            }
                          }}
                          style={isTA ? {
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
                          } : {
                            padding: '1rem',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: notification.isRead 
                              ? '#FFFFFF' 
                              : '#eff6ff',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (isTA) {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#f8fafc' 
                                : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                                  ? '#ffedd5'
                                  : '#edf2ff';
                            } else {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#f9fafb' 
                                : '#dbeafe';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isTA) {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#FFFFFF' 
                                : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                                  ? '#fff7ed'
                                  : '#f8fafc';
                            } else {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#FFFFFF' 
                                : '#eff6ff';
                            }
                          }}
                        >
                          {isTA ? (
                            <>
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
                                  color: '#9ca3af'
                                }}>
                                  {formatNotificationDate(notification.createdAt)}
                                </div>
                              </div>
                              {!notification.isRead && (
                                <div style={{
                                  width: '0.5rem',
                                  height: '0.5rem',
                                  borderRadius: '50%',
                                  backgroundColor: '#1e40af',
                                  flexShrink: 0,
                                  marginTop: '0.25rem'
                                }} />
                              )}
                            </>
                          ) : (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '0.5rem'
                            }}>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: notification.isRead ? '400' : '600',
                                  color: '#1D3557',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {notification.title || notification.message}
                                </p>
                                {notification.message && notification.message !== notification.title && (
                                  <p style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    margin: 0
                                  }}>
                                    {notification.message}
                                  </p>
                                )}
                                <p style={{
                                  fontSize: '0.625rem',
                                  color: '#9ca3af',
                                  margin: '0.5rem 0 0 0'
                                }}>
                                  {formatNotificationDate(notification.createdAt)}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div style={{
                                  width: '0.5rem',
                                  height: '0.5rem',
                                  borderRadius: '50%',
                                  backgroundColor: '#1e40af',
                                  flexShrink: 0,
                                  marginTop: '0.25rem'
                                }} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#FFFFFF',
              margin: 0
            }}>
              {displayName}
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0
            }}>
              {userType.charAt(0).toUpperCase() + userType.slice(1)}
            </p>
          </div>

          {/* Profile Icon */}
          <div 
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              setShowLogoutDropdown(!showLogoutDropdown);
              setShowNotificationsDropdown(false);
            }}
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
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
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
                {user?.userType === 'Professor' && (
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

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '2rem',
        paddingLeft: '6rem',
        paddingRight: '6rem',
        overflowY: 'auto',
        backgroundColor: '#f6f7f8'
      }}>
        {/* Page Title Banner */}
        <div 
          className="banner-animate"
          style={{
            position: 'relative',
            height: '140px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
        >
          {/* Background Image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/images/bazaar-background.jpg)',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            filter: 'blur(2px)',
            transition: 'transform 0.5s ease, filter 0.5s ease'
          }}></div>
          {/* Blue Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(29, 53, 87, 0.75)',
            transition: 'background-color 0.3s ease'
          }}></div>
          {/* Animated Pattern Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            animation: 'pulse 4s ease-in-out infinite',
            zIndex: 1,
            pointerEvents: 'none'
          }}></div>
          {/* Content */}
          <div 
            className="banner-content-animate"
            style={{
              position: 'relative',
              zIndex: 10,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '2rem 2.5rem',
              color: '#FFFFFF'
            }}
          >
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '1.75rem',
              fontWeight: '700',
              margin: 0,
              marginBottom: '0.5rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              Vendor Polls
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              fontWeight: '400',
              margin: 0,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}>
              Vote for vendors to set up booths in the platform
            </p>
          </div>
        </div>

        {/* Polls List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '1rem',
            color: '#6b7280',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #1e40af',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              display: 'inline-block',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>Loading polls...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '2.5rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '1rem',
            color: '#991b1b',
            textAlign: 'center',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #fee2e2',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '3rem',
              color: '#ef4444',
              marginBottom: '1rem',
              display: 'block'
            }}>
              error_outline
            </span>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>{error}</p>
          </div>
        ) : polls.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '1rem',
            color: '#6b7280',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '4rem',
              color: '#d1d5db',
              marginBottom: '1.5rem',
              display: 'block',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              poll
            </span>
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '500' }}>No active polls available</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>Check back later for new voting opportunities</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem'
          }}>
            {polls.map((poll, pollIndex) => {
              const totalVotes = poll.totalVotes || 0;
              const hasVoted = poll.hasVoted || false;
              const userVoteIndex = poll.userVoteIndex;

              return (
                <div
                  key={poll._id}
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
                    overflow: 'hidden',
                    animation: `fadeInUp 0.6s ease-out ${pollIndex * 0.1}s both`
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
                  {/* Poll Header */}
                  <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827',
                        margin: 0,
                        flex: 1
                      }}>
                        {poll.title}
                      </h3>
                      {hasVoted && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: '600',
                          fontSize: '0.75rem'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '0.875rem'
                          }}>
                            check_circle
                          </span>
                          <span>Voted</span>
                        </div>
                      )}
                    </div>
                    {poll.description && (
                      <p style={{
                        fontSize: '0.8125rem',
                        color: '#6b7280',
                        margin: 0,
                        marginBottom: '0.5rem',
                        lineHeight: '1.4'
                      }}>
                        {poll.description}
                      </p>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: '0.875rem',
                        color: '#9ca3af'
                      }}>
                        how_to_vote
                      </span>
                      <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                    </div>
                  </div>

                  {/* Vendor Options */}
                  <div style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {poll.options.map((option, index) => {
                      const vendorRequest = option.vendorRequest;
                      const vendor = vendorRequest?.vendor || {};
                      const voteCount = option.voteCount || 0;
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      const isUserVote = hasVoted && userVoteIndex === index;
                      const isVoting = voting[poll._id];
                      const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Unknown Vendor';

                      return (
                        <div
                          key={index}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isVoting) {
                              handleVote(poll._id, index);
                            }
                          }}
                          style={{
                            border: `1.5px solid ${isUserVote ? '#1e40af' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            padding: '0.875rem',
                            backgroundColor: isUserVote ? '#eff6ff' : '#FFFFFF',
                            transition: 'all 0.2s',
                            position: 'relative',
                            cursor: isVoting ? 'not-allowed' : 'pointer',
                            opacity: isVoting ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!isVoting) {
                              e.currentTarget.style.borderColor = '#1e40af';
                              e.currentTarget.style.backgroundColor = isUserVote ? '#dbeafe' : '#f9fafb';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isVoting) {
                              e.currentTarget.style.borderColor = isUserVote ? '#1e40af' : '#e5e7eb';
                              e.currentTarget.style.backgroundColor = isUserVote ? '#eff6ff' : '#FFFFFF';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            {/* Vendor Icon */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: isUserVote ? '#dbeafe' : '#f3f4f6',
                              borderRadius: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: `1.5px solid ${isUserVote ? '#1e40af' : '#e5e7eb'}`
                            }}>
                              {vendor.companyName ? (
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '700',
                                  color: isUserVote ? '#1e40af' : '#6b7280',
                                  textTransform: 'uppercase'
                                }}>
                                  {vendor.companyName.substring(0, 2)}
                                </div>
                              ) : (
                                <span className="material-symbols-outlined" style={{
                                  fontSize: '1.25rem',
                                  color: isUserVote ? '#1e40af' : '#9ca3af'
                                }}>
                                  storefront
                                </span>
                              )}
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                marginBottom: '0.375rem'
                              }}>
                                <h4 style={{
                                  fontSize: '0.9375rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {vendorName}
                                </h4>
                                {isUserVote && (
                                  <span className="material-symbols-outlined" style={{
                                    fontSize: '1.125rem',
                                    color: '#1e40af',
                                    flexShrink: 0,
                                    fontWeight: '600'
                                  }}>
                                    check_circle
                                  </span>
                                )}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <span style={{
                                  fontSize: '0.6875rem',
                                  color: '#6b7280',
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#f3f4f6',
                                  borderRadius: '0.25rem'
                                }}>
                                  {vendorRequest?.boothSize || 'N/A'}
                                </span>
                                <span style={{
                                  fontSize: '0.6875rem',
                                  color: '#6b7280',
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#f3f4f6',
                                  borderRadius: '0.25rem'
                                }}>
                                  {vendorRequest?.durationWeeks || 'N/A'}w
                                </span>
                                <span style={{
                                  fontSize: '0.6875rem',
                                  color: '#6b7280',
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#f3f4f6',
                                  borderRadius: '0.25rem'
                                }}>
                                  {getLocationName(vendorRequest?.boothLocation)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Compact Vote Count Bar */}
                          {hasVoted && (
                            <div style={{
                              marginTop: '0.5rem',
                              paddingTop: '0.5rem',
                              borderTop: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.375rem'
                              }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#111827'
                                }}>
                                  {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                                </span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: isUserVote ? '#1e40af' : '#3b82f6'
                                }}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '0.5rem',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '9999px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  backgroundColor: isUserVote ? '#1e40af' : '#3b82f6',
                                  borderRadius: '9999px',
                                  transition: 'width 0.5s ease'
                                }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default BoothPolls;

