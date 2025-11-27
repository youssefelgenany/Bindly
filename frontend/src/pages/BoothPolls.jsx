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
          {getNavigationLinks().map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                textDecoration: 'none',
                color: isActiveRoute(link.to) ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute(link.to) ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute(link.to) ? '2px solid #2563eb' : '2px solid transparent',
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
                          handleMarkAsRead(notification._id);
                          setShowNotificationsDropdown(false);
                        }}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          backgroundColor: notification.isRead 
                            ? '#FFFFFF' 
                            : '#eff6ff',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#f9fafb' 
                            : '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#FFFFFF' 
                            : '#eff6ff';
                        }}
                      >
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
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
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
              color: '#1D3557',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
              favorite
            </span>
          </Link>

          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }} data-profile-dropdown>
            <button
              onClick={() => {
                setShowLogoutDropdown(!showLogoutDropdown);
                setShowNotificationsDropdown(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {user?.profilePicturePath ? (
                <img
                  src={`http://localhost:5000${user.profilePicturePath}`}
                  alt="Profile"
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
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <span className="material-symbols-outlined" style={{
                fontSize: '1.25rem',
                color: '#6b7280'
              }}>
                expand_more
              </span>
            </button>
            {showLogoutDropdown && (
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
                minWidth: '200px',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    {displayName}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {user?.email || ''}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
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
        {/* Page Title */}
        <div style={{
          position: 'relative',
          height: '160px',
          borderRadius: '1rem',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/images/bazaar-background.jpg)',
            backgroundPosition: 'center',
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
            padding: '2.5rem',
            color: '#FFFFFF'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              Vendor Polls
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              margin: 0
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
            borderRadius: '0.75rem',
            color: '#6b7280'
          }}>
            Loading polls...
          </div>
        ) : error ? (
          <div style={{
            padding: '2rem',
            backgroundColor: '#fee2e2',
            borderRadius: '0.75rem',
            color: '#991b1b',
            textAlign: 'center'
          }}>
            {error}
          </div>
        ) : polls.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            color: '#6b7280'
          }}>
            No active polls available
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {polls.map((poll) => {
              const totalVotes = poll.totalVotes || 0;
              const hasVoted = poll.hasVoted || false;
              const userVoteIndex = poll.userVoteIndex;

              return (
                <div
                  key={poll._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0,
                      marginBottom: '0.5rem'
                    }}>
                      {poll.title}
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: 0,
                      marginBottom: '1rem'
                    }}>
                      {poll.description}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      <span>Total Votes: {totalVotes}</span>
                      {hasVoted && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: '500'
                        }}>
                          ✓ You voted
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {poll.options.map((option, index) => {
                      const vendorRequest = option.vendorRequest;
                      const vendor = vendorRequest?.vendor || {};
                      const voteCount = option.voteCount || 0;
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      const isUserVote = hasVoted && userVoteIndex === index;
                      const isVoting = voting[poll._id];

                      return (
                        <div
                          key={index}
                          style={{
                            border: `2px solid ${isUserVote ? '#1e40af' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            padding: '1.5rem',
                            backgroundColor: isUserVote ? '#eff6ff' : '#f9fafb',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#111827',
                                marginBottom: '0.5rem'
                              }}>
                                {vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Unknown Vendor'}
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                display: 'flex',
                                gap: '1rem',
                                flexWrap: 'wrap',
                                marginBottom: '0.5rem'
                              }}>
                                <span>Booth Size: {vendorRequest?.boothSize || 'N/A'}</span>
                                <span>Duration: {vendorRequest?.durationWeeks || 'N/A'} week{vendorRequest?.durationWeeks !== 1 ? 's' : ''}</span>
                                <span>Location: {getLocationName(vendorRequest?.boothLocation)}</span>
                              </div>
                              {option.description && (
                                <div style={{
                                  fontSize: '0.875rem',
                                  color: '#6b7280',
                                  fontStyle: 'italic'
                                }}>
                                  {option.description}
                                </div>
                              )}
                            </div>
                            {!hasVoted && (
                              <button
                                onClick={() => handleVote(poll._id, index)}
                                disabled={isVoting}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  backgroundColor: isVoting ? '#9ca3af' : '#1e40af',
                                  color: '#FFFFFF',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  cursor: isVoting ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isVoting) {
                                    e.target.style.backgroundColor = '#1e3a8a';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isVoting) {
                                    e.target.style.backgroundColor = '#1e40af';
                                  }
                                }}
                              >
                                {isVoting ? 'Voting...' : 'Vote'}
                              </button>
                            )}
                          </div>

                          {/* Vote Count Bar */}
                          {hasVoted && (
                            <div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem'
                              }}>
                                <span style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#111827'
                                }}>
                                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                </span>
                                <span style={{
                                  fontSize: '0.875rem',
                                  color: '#6b7280'
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
                                  transition: 'width 0.3s ease'
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
  );
};

export default BoothPolls;
