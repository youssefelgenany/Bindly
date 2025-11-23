import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import courtsApiService from '../api/courtsApi';
import { notificationApiService } from '../api/notificationApi';

const StudentCourtsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingData, setBookingData] = useState({
    purpose: '',
    participants: [{ name: '', email: '' }],
    notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
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

  const loadCourts = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      const result = await courtsApiService.getCourts();
      
      if (result.success) {
        // Filter out courts with empty or missing essential data
        const allCourts = result.data.courts || [];
        const filteredCourts = allCourts.filter(court => {
          // Keep only courts with name, type, and location
          return court && 
                 court.name && 
                 court.name.trim() !== '' && 
                 court.type && 
                 court.type.trim() !== '' &&
                 court.location && 
                 court.location.trim() !== '';
        });
        setCourts(filteredCourts);
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

  // Load notifications on mount and poll for updates
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark notification as read
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

  // Mark all as read
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

  // Format notification date
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

  const getCourtTypeImage = (type) => {
    const imageMap = {
      basketball: '/assets/images/basketball.webp',
      tennis: '/assets/images/tennis.jpg',
      football: '/assets/images/football.jpg',
      soccer: '/assets/images/football.jpg' // Alias for football
    };
    const normalizedType = (type || '').toString().trim().toLowerCase();
    return imageMap[normalizedType] || '/assets/images/campus-courts.png'; // Fallback to campus-courts.png
  };

  const getCourtTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'COURT';
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

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setBookingData({
      purpose: '',
      participants: [{ name: '', email: '' }],
      notes: ''
    });
    setBookingError('');
    setBookingSuccess(false);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourt || !selectedSlot) return;

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      const result = await courtsApiService.bookCourt({
        courtId: selectedCourt._id || selectedCourt.id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        purpose: bookingData.purpose,
        participants: bookingData.participants.filter(p => p.name && p.email),
        notes: bookingData.notes
      });

      if (result.success) {
        setBookingSuccess(true);
        setTimeout(() => {
          setShowBookingForm(false);
          setSelectedSlot(null);
          setBookingData({
            purpose: '',
            participants: [{ name: '', email: '' }],
            notes: ''
          });
          // Refresh availability
          loadCourtAvailability(selectedCourt._id || selectedCourt.id, selectedDate);
        }, 2000);
      } else {
        setBookingError(result.message || 'Failed to book court');
      }
    } catch (error) {
      setBookingError('An unexpected error occurred. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setBookingLoading(false);
    }
  };

  const addParticipant = () => {
    setBookingData({
      ...bookingData,
      participants: [...bookingData.participants, { name: '', email: '' }]
    });
  };

  const removeParticipant = (index) => {
    const newParticipants = bookingData.participants.filter((_, i) => i !== index);
    setBookingData({
      ...bookingData,
      participants: newParticipants.length > 0 ? newParticipants : [{ name: '', email: '' }]
    });
  };

  const updateParticipant = (index, field, value) => {
    const newParticipants = [...bookingData.participants];
    newParticipants[index][field] = value;
    setBookingData({
      ...bookingData,
      participants: newParticipants
    });
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'User';

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
                            navigate(`/student/events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                            // Navigate to My Events for reminders
                            navigate(`/student/my-registrations`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            // Navigate to Loyalty Partners page
                            navigate(`/student/loyalty-vendors`);
                            setShowNotificationsDropdown(false);
                          }
                        }}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          backgroundColor: notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
                              : '#eff6ff',
                          borderLeft: notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder') && !notification.isRead
                            ? '3px solid #ef4444'
                            : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#f9fafb' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fee2e2'
                              : '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
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

          {/* Student Profile Icon */}
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

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem 0',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
          {/* Content Wrapper with Margins */}
          <div style={{
            marginLeft: '4rem',
            marginRight: '4rem'
          }}>
          {/* Page Title Box */}
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
              backgroundImage: 'url(/assets/images/campus-courts.png)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)'
            }}></div>
            {/* Blue Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(10, 20, 40, 0.85)'
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
                Campus Courts
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                View all courts and their availability.
              </p>
            </div>
          </div>

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
                    padding: 0,
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
                  {/* Court Type Image - Top Half */}
                  {getCourtTypeImage(court.type) && (
                    <div style={{
                      width: '100%',
                      height: '180px',
                      overflow: 'hidden',
                      position: 'relative',
                      backgroundColor: '#f3f4f6',
                      flexShrink: 0
                    }}>
                      <img
                        src={getCourtTypeImage(court.type)}
                        alt={court.type ? court.type.charAt(0).toUpperCase() + court.type.slice(1) : 'Court'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.backgroundColor = getCourtTypeColor(court.type);
                          e.target.parentElement.style.display = 'flex';
                          e.target.parentElement.style.alignItems = 'center';
                          e.target.parentElement.style.justifyContent = 'center';
                          if (!e.target.parentElement.querySelector('.fallback-text')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-text';
                            fallback.textContent = getCourtTypeFallbackText(court.type);
                            fallback.style.color = '#FFFFFF';
                            fallback.style.fontSize = '1.5rem';
                            fallback.style.fontWeight = '700';
                            e.target.parentElement.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    {court.location && court.location.trim() !== '' && (
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
                    )}
                    {court.capacity && (
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
                    )}
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
                </div>
              ))}
            </div>
          )}
          </div>
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
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}
          >
            {/* Court Image at Top */}
            {getCourtTypeImage(selectedCourt.type) && (
              <div style={{
                width: '100%',
                height: '200px',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#f3f4f6',
                flexShrink: 0
              }}>
                <img
                  src={getCourtTypeImage(selectedCourt.type)}
                  alt={selectedCourt.type ? selectedCourt.type.charAt(0).toUpperCase() + selectedCourt.type.slice(1) : 'Court'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = getCourtTypeColor(selectedCourt.type);
                    e.target.parentElement.style.display = 'flex';
                    e.target.parentElement.style.alignItems = 'center';
                    e.target.parentElement.style.justifyContent = 'center';
                    if (!e.target.parentElement.querySelector('.fallback-text')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-text';
                      fallback.textContent = getCourtTypeFallbackText(selectedCourt.type);
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
              onClick={() => {
                setSelectedCourt(null);
                setAvailabilityData(null);
              }}
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
            
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
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
            </div>

            {/* Modal Body */}
            <div style={{ 
              padding: '1rem 1.5rem 1.5rem 1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
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
                      {availabilityData.availableSlots
                        .filter(slot => slot && slot.startTime && slot.endTime && slot.startTime.trim() !== '' && slot.endTime.trim() !== '')
                        .map((slot, index) => (
                        <div
                          key={index}
                          onClick={() => handleSlotClick(slot)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#d1fae5',
                            border: '1px solid #10b981',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#d1fae5';
                            e.currentTarget.style.transform = 'scale(1)';
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
                          <p style={{
                            color: '#059669',
                            fontSize: '0.75rem',
                            margin: '0.25rem 0 0 0',
                            opacity: 0.8
                          }}>
                            Click to book
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
                        {availabilityData.bookings
                          .filter(booking => booking && booking.startTime && booking.endTime && booking.startTime.trim() !== '' && booking.endTime.trim() !== '')
                          .map((booking, index) => (
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

      {/* Booking Form Modal */}
      {showBookingForm && selectedSlot && selectedCourt && (
        <div
          onClick={() => {
            if (!bookingLoading) {
              setShowBookingForm(false);
              setSelectedSlot(null);
              setBookingError('');
              setBookingSuccess(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              position: 'relative'
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
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: 0
              }}>
                Book Court
              </h2>
              <button
                onClick={() => {
                  if (!bookingLoading) {
                    setShowBookingForm(false);
                    setSelectedSlot(null);
                    setBookingError('');
                    setBookingSuccess(false);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'all 0.2s'
                }}
                disabled={bookingLoading}
                onMouseEnter={(e) => {
                  if (!bookingLoading) {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.color = '#1D3557';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!bookingLoading) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '50%',
                    backgroundColor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <span style={{ fontSize: '2rem' }}>✓</span>
                  </div>
                  <h3 style={{
                    color: '#059669',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0'
                  }}>
                    Booking Successful!
                  </h3>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Your reservation has been submitted. Your name and GUC ID have been automatically included.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit}>
                  {/* Court and Time Info */}
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Court
                      </p>
                      <p style={{
                        color: '#1D3557',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        margin: 0
                      }}>
                        {selectedCourt.name}
                      </p>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Date
                      </p>
                      <p style={{
                        color: '#1D3557',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        margin: 0
                      }}>
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: '0 0 0.25rem 0'
                      }}>
                        Time Slot
                      </p>
                      <p style={{
                        color: '#1D3557',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        margin: 0
                      }}>
                        {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                      </p>
                    </div>
                  </div>

                  {/* Student Info Notice */}
                  <div style={{
                    backgroundColor: '#dbeafe',
                    border: '1px solid #3b82f6',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{
                      color: '#1e40af',
                      fontSize: '0.875rem',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                        info
                      </span>
                      Your name ({user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name || 'N/A'}) and GUC ID ({user?.gucId || 'N/A'}) will be automatically included in the reservation.
                    </p>
                  </div>

                  {/* Purpose */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Purpose <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={bookingData.purpose}
                      onChange={(e) => setBookingData({ ...bookingData, purpose: e.target.value })}
                      placeholder="e.g., Basketball practice, Tennis match"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Participants */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Participants (Optional)
                    </label>
                    {bookingData.participants.map((participant, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <input
                          type="text"
                          value={participant.name}
                          onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                          placeholder="Name"
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                        <input
                          type="email"
                          value={participant.email}
                          onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                          placeholder="Email"
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                        {bookingData.participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #f87171',
                              color: '#dc2626',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#fee2e2';
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {bookingData.participants.length < 5 && (
                      <button
                        type="button"
                        onClick={addParticipant}
                        style={{
                          background: '#d1fae5',
                          border: '1px solid #10b981',
                          color: '#059669',
                          borderRadius: '0.5rem',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          marginTop: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#a7f3d0';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#d1fae5';
                        }}
                      >
                        + Add Participant
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={bookingData.notes}
                      onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Error Message */}
                  {bookingError && (
                    <div style={{
                      backgroundColor: '#fee2e2',
                      border: '1px solid #f87171',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      marginBottom: '1.5rem'
                    }}>
                      <p style={{
                        color: '#dc2626',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {bookingError}
                      </p>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingForm(false);
                        setSelectedSlot(null);
                        setBookingError('');
                        setBookingSuccess(false);
                      }}
                      disabled={bookingLoading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        cursor: bookingLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!bookingLoading) {
                          e.target.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!bookingLoading) {
                          e.target.style.backgroundColor = '#FFFFFF';
                        }
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        backgroundColor: bookingLoading ? '#9ca3af' : '#1e40af',
                        color: '#FFFFFF',
                        cursor: bookingLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!bookingLoading) {
                          e.target.style.backgroundColor = '#1e3a8a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!bookingLoading) {
                          e.target.style.backgroundColor = '#1e40af';
                        }
                      }}
                    >
                      {bookingLoading ? 'Submitting...' : 'Submit Booking'}
                    </button>
                  </div>
                </form>
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
