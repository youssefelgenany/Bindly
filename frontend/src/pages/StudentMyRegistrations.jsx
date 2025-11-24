import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { eventsApiService } from '../api/eventsApi';
import { notificationApiService } from '../api/notificationApi';
import { useAuth } from '../contexts/AuthContext';

const StudentMyRegistrations = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showRatingsCommentsModal, setShowRatingsCommentsModal] = useState(false);
  const [selectedEventForRating, setSelectedEventForRating] = useState(null);
  const [selectedEventForComment, setSelectedEventForComment] = useState(null);
  const [selectedEventForView, setSelectedEventForView] = useState(null); // { eventId, eventDate, eventEndDate, eventTitle }
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [ratingsAndComments, setRatingsAndComments] = useState(null);
  const [loadingRatingsComments, setLoadingRatingsComments] = useState(false);
  const [eventRatings, setEventRatings] = useState({}); // { eventId: { average: number, count: number } }
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRegistrationData, setCancelRegistrationData] = useState(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [cancelSuccessData, setCancelSuccessData] = useState(null);

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
        const regs = result.data.registrations || [];
        setRegistrations(regs);
        
        // Load ratings for all events
        const ratingsMap = {};
        await Promise.all(regs.map(async (reg) => {
          if (reg.eventId) {
            try {
              const ratingResult = await eventsApiService.getRatingsAndComments(reg.eventId);
              if (ratingResult.success && ratingResult.data?.ratings) {
                ratingsMap[reg.eventId] = {
                  average: ratingResult.data.ratings.average || 0,
                  count: ratingResult.data.ratings.count || 0
                };
              }
            } catch (err) {
              console.error(`Error loading rating for event ${reg.eventId}:`, err);
            }
          }
        }));
        setEventRatings(ratingsMap);
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
    const texts = {
      bazaar: 'BAZAAR',
      trip: 'TRIP',
      workshop: 'WORKSHOP',
      conference: 'CONFERENCE',
      booth: 'BOOTH',
      other: 'EVENT'
    };
    return texts[type?.toLowerCase()] || texts.other;
  };

  // Check if event has passed (can rate/comment)
  // Uses the same logic as getDaysUntilEvent for consistency
  const hasEventPassed = (eventDate, eventEndDate) => {
    try {
      // Check endDate first (most accurate), then eventDate
      let checkDate = null;
      if (eventEndDate) {
        checkDate = new Date(eventEndDate);
        if (isNaN(checkDate.getTime())) {
          checkDate = null;
        }
      }
      
      if (!checkDate && eventDate) {
        checkDate = new Date(eventDate);
        if (isNaN(checkDate.getTime())) {
          return false;
        }
      }
      
      if (!checkDate) {
        return false;
      }
      
      // Use the same logic as getDaysUntilEvent: check if date is in the past
      const today = new Date();
      const diffTime = checkDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Event has passed if diffDays < 0 (same logic as getDaysUntilEvent)
      return diffDays < 0;
    } catch (error) {
      console.error('❌ Error checking if event has passed:', error, { eventDate, eventEndDate });
      return false;
    }
  };

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!selectedEventForRating || rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      const result = await eventsApiService.submitRating(selectedEventForRating.eventId, rating);
      if (result.success) {
        setShowRatingModal(false);
        setRating(0);
        setHoveredRating(0);
        // Update rating in state
        const updatedRatings = { ...eventRatings };
        const ratingResult = await eventsApiService.getRatingsAndComments(selectedEventForRating.eventId);
        if (ratingResult.success && ratingResult.data?.ratings) {
          updatedRatings[selectedEventForRating.eventId] = {
            average: ratingResult.data.ratings.average || 0,
            count: ratingResult.data.ratings.count || 0
          };
          setEventRatings(updatedRatings);
        }
        setSelectedEventForRating(null);
        setError('');
      } else {
        setError(result.message || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(err.message || 'Error submitting rating');
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!selectedEventForComment || !commentText.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (commentText.trim().length > 1000) {
      setError('Comment cannot exceed 1000 characters');
      return;
    }

    try {
      const result = await eventsApiService.submitComment(selectedEventForComment.eventId, commentText.trim());
      if (result.success) {
        setShowCommentModal(false);
        setCommentText('');
        setSelectedEventForComment(null);
        setError('');
      } else {
        setError(result.message || 'Failed to submit comment');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err.message || 'Error submitting comment');
    }
  };

  // Load ratings and comments for viewing
  const loadRatingsAndComments = async (eventId) => {
    if (!eventId) {
      setError('Event ID is required');
      return;
    }
    setLoadingRatingsComments(true);
    setError(''); // Clear previous errors
    try {
      const eventIdStr = String(eventId);
      const result = await eventsApiService.getRatingsAndComments(eventIdStr);
      if (result.success) {
        setRatingsAndComments(result.data);
      } else {
        setError(result.message || result.error?.message || 'Failed to load ratings and comments');
      }
    } catch (err) {
      console.error('Error loading ratings and comments:', err);
      setError(err.response?.data?.message || err.message || 'Error loading ratings and comments');
    } finally {
      setLoadingRatingsComments(false);
    }
  };

  // Handle view ratings and comments
  const handleViewRatingsComments = async (eventId) => {
    // Find the registration to get event dates
    const registration = registrations.find(r => r.eventId === eventId || r.eventId?.toString() === eventId?.toString());
    console.log('📋 Registration found:', registration);
    
    // Also try to fetch event details to get accurate dates
    let eventDetails = null;
    try {
      const eventResult = await eventsApiService.getAllEventsAuthenticated({});
      if (eventResult.success && Array.isArray(eventResult.data)) {
        eventDetails = eventResult.data.find(e => (e._id || e.id) === eventId || String(e._id || e.id) === String(eventId));
        console.log('📅 Event details from API:', eventDetails);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
    }
    
    // Try all possible date field names - prioritize event details, then registration
    const eventData = {
      eventId: eventId,
      eventDate: eventDetails?.startDate || eventDetails?.eventDate || registration?.eventDate || registration?.startDate,
      eventEndDate: eventDetails?.endDate || eventDetails?.eventEndDate || registration?.eventEndDate || registration?.endDate,
      eventTitle: registration?.eventTitle || registration?.title || eventDetails?.title,
      // Also store the full registration for debugging
      registration: registration,
      eventDetails: eventDetails
    };
    console.log('📅 Event data for modal:', eventData);
    const isPast = hasEventPassed(eventData.eventDate, eventData.eventEndDate);
    console.log('🔍 Date check result:', {
      eventDate: eventData.eventDate,
      eventEndDate: eventData.eventEndDate,
      isPast,
      now: new Date(),
      checkDate: eventData.eventEndDate ? new Date(eventData.eventEndDate) : (eventData.eventDate ? new Date(eventData.eventDate) : null)
    });
    setSelectedEventForView(eventData);
    // Reset rating and comment state when opening modal
    setRating(0);
    setHoveredRating(0);
    setCommentText('');
    setShowRatingsCommentsModal(true);
    await loadRatingsAndComments(eventId);
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
                            // Already on My Events page, just close dropdown
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
            to="/student/favorites"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/student/favorites') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/student/favorites') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/student/favorites') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Favorites
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
          padding: '2rem 0',
          overflowY: 'auto',
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

                      {/* Bottom Section: Rating Display and Action Buttons */}
                      <div style={{
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}>
                        {/* Average Rating Display - Bottom Left (Clickable to view ratings/comments for ALL events) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRatingsComments(registration.eventId);
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
                            {eventRatings[registration.eventId]?.average > 0 
                              ? eventRatings[registration.eventId].average.toFixed(1)
                              : '—'}
                          </span>
                        </button>

                        {/* Rating and Comment Icons - Only for Past Events */}
                        {(() => {
                          // Try multiple possible date property names
                          const eventDate = registration.eventDate || registration.startDate || registration.event?.startDate || registration.event?.eventDate;
                          const eventEndDate = registration.eventEndDate || registration.endDate || registration.event?.endDate || registration.event?.eventEndDate;
                          const isPast = hasEventPassed(eventDate, eventEndDate);
                          return isPast;
                        })() && (
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginLeft: 'auto'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('Rating button clicked for:', registration.eventTitle);
                                setSelectedEventForRating({
                                  eventId: registration.eventId,
                                  eventTitle: registration.eventTitle
                                });
                                setShowRatingModal(true);
                              }}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                backgroundColor: 'transparent',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                zIndex: 10,
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.borderColor = '#d1d5db';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = '#e5e7eb';
                              }}
                              title="Rate this event"
                            >
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.25rem',
                                color: '#1e40af'
                              }}>
                                star
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('Comment button clicked for:', registration.eventTitle);
                                setSelectedEventForComment({
                                  eventId: registration.eventId,
                                  eventTitle: registration.eventTitle
                                });
                                setShowCommentModal(true);
                              }}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                backgroundColor: 'transparent',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                zIndex: 10,
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.borderColor = '#d1d5db';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = '#e5e7eb';
                              }}
                              title="Comment on this event"
                            >
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.25rem',
                                color: '#1e40af'
                              }}>
                                comment
                              </span>
                            </button>
                          </div>
                        )}
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
                    onClick={() => {
                      setCancelRegistrationData({
                        eventId: selectedRegistration.eventId,
                        eventTitle: selectedRegistration.eventTitle
                      });
                      setShowCancelModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#dc2626',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
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
                    Cancel Registration & Get Refund
                  </button>
                </div>
              )}
      </div>
    </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedEventForRating && (
        <div
          onClick={() => {
            setShowRatingModal(false);
            setRating(0);
            setSelectedEventForRating(null);
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
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              marginTop: 0
            }}>
              Rate Event: {selectedEventForRating.eventTitle}
            </h2>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '1rem 0'
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '2.5rem',
                    color: (hoveredRating >= star || rating >= star) ? '#fbbf24' : '#d1d5db',
                    transition: 'all 0.2s',
                    lineHeight: 1
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setSelectedEventForRating(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: rating === 0 ? '#d1d5db' : '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: rating === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (rating !== 0) {
                    e.target.style.backgroundColor = '#1e3a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (rating !== 0) {
                    e.target.style.backgroundColor = '#1e40af';
                  }
                }}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedEventForComment && (
        <div
          onClick={() => {
            setShowCommentModal(false);
            setCommentText('');
            setSelectedEventForComment(null);
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
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              marginTop: 0
            }}>
              Comment on: {selectedEventForComment.eventTitle}
            </h2>
            
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts about this event..."
              maxLength={1000}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '0.5rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1e40af';
                e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'right',
              marginBottom: '1.5rem'
            }}>
              {commentText.length}/1000 characters
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                  setSelectedEventForComment(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: !commentText.trim() ? '#d1d5db' : '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: !commentText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (commentText.trim()) {
                    e.target.style.backgroundColor = '#1e3a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (commentText.trim()) {
                    e.target.style.backgroundColor = '#1e40af';
                  }
                }}
              >
                Submit Comment
              </button>
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
              Are you sure you want to cancel your registration for <strong>{cancelRegistrationData.eventTitle}</strong>? The refund will be added to your wallet.
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
                        refunded: result.data.refunded || false,
                        refundAmount: result.data.refundAmount || 0
                      });
                      setShowCancelModal(false);
                      setCancelRegistrationData(null);
                      setShowCancelSuccess(true);
                      loadMyRegistrations();
                      // Trigger wallet refresh event for wallet page if open
                      window.dispatchEvent(new Event('walletRefresh'));
                      // Refresh user object to get latest wallet balance
                      if (refreshUser) {
                        refreshUser();
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
                color: '#059669',
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  account_balance_wallet
                </span>
                {cancelSuccessData.refundAmount > 0 
                  ? `${cancelSuccessData.refundAmount} EGP has been refunded to your wallet.`
                  : 'The refund has been added to your wallet.'}
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

      {/* View All Ratings and Comments Modal */}
      {showRatingsCommentsModal && selectedEventForView && (
        <div
          onClick={() => {
            setShowRatingsCommentsModal(false);
            setSelectedEventForView(null);
            setRatingsAndComments(null);
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
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                Ratings & Comments
              </h2>
              <button
                onClick={() => {
                  setShowRatingsCommentsModal(false);
                  setSelectedEventForView(null);
                  setRatingsAndComments(null);
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
                  {/* Ratings Section */}
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

                  {/* Rate/Comment Forms - ONLY for Past Events in My Registrations */}
                  {selectedEventForView && (() => {
                    // Get dates - registration object has eventDate and eventEndDate directly
                    const eventDate = selectedEventForView.eventDate;
                    const eventEndDate = selectedEventForView.eventEndDate;
                    
                    // If no dates in selectedEventForView, try registration object
                    const regDate = selectedEventForView.registration?.eventDate;
                    const regEndDate = selectedEventForView.registration?.eventEndDate;
                    
                    const finalEventDate = eventDate || regDate;
                    const finalEventEndDate = eventEndDate || regEndDate;
                    
                    // Check if event is past
                    const isPast = hasEventPassed(finalEventDate, finalEventEndDate);
                    
                    // Debug logging
                    console.log('🔍 Forms visibility check:', {
                      selectedEventForView,
                      eventDate,
                      eventEndDate,
                      regDate,
                      regEndDate,
                      finalEventDate,
                      finalEventEndDate,
                      registration: selectedEventForView.registration,
                      isPast,
                      now: new Date()
                    });
                    
                    // If we can't determine dates, don't show forms (be safe)
                    if (!finalEventDate && !finalEventEndDate) {
                      console.warn('⚠️ No dates found, hiding forms');
                      return false;
                    }
                    
                    return isPast;
                  })() && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        position: 'relative',
                        zIndex: 10
                      }}
                    >
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        marginTop: 0
                      }}>
                        Rate & Comment
                      </h3>
                      
                      {error && (
                        <div style={{
                          padding: '0.75rem',
                          marginBottom: '1rem',
                          borderRadius: '0.5rem',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '0.875rem'
                        }}>
                          {error}
                        </div>
                      )}
                      
                      {/* Rating Section */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Your Rating
                        </label>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          gap: '0.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setRating(star);
                              }}
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoveredRating(star);
                              }}
                              onMouseLeave={(e) => {
                                e.stopPropagation();
                                setHoveredRating(0);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '2rem',
                                color: (hoveredRating >= star || rating >= star) ? '#fbbf24' : '#d1d5db',
                                transition: 'all 0.2s',
                                lineHeight: 1,
                                zIndex: 10,
                                position: 'relative'
                              }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (rating > 0 && selectedEventForView?.eventId) {
                                try {
                                  const eventId = String(selectedEventForView.eventId);
                                  console.log('🚀 Submitting rating:', { eventId, rating, selectedEventForView });
                                  setError(''); // Clear previous errors
                                  const result = await eventsApiService.submitRating(eventId, rating);
                                  console.log('📊 Rating submission result:', result);
                                  if (result.success) {
                                    setRating(0);
                                    setHoveredRating(0);
                                    setError('');
                                    // Reload ratings and comments
                                    await loadRatingsAndComments(eventId);
                                    // Update event ratings
                                    const ratingResult = await eventsApiService.getRatingsAndComments(eventId);
                                    if (ratingResult.success && ratingResult.data?.ratings) {
                                      setEventRatings(prev => ({
                                        ...prev,
                                        [eventId]: {
                                          average: ratingResult.data.ratings.average || 0,
                                          count: ratingResult.data.ratings.count || 0
                                        }
                                      }));
                                    }
                                  } else {
                                    const errorMsg = result.message || result.error?.message || result.error?.msg || 'Failed to submit rating';
                                    console.error('❌ Rating submission failed:', errorMsg, result);
                                    setError(errorMsg);
                                  }
                                } catch (err) {
                                  console.error('❌ Error submitting rating:', err);
                                  const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting rating';
                                  setError(errorMsg);
                                }
                              } else {
                                console.warn('⚠️ Cannot submit rating:', { rating, eventId: selectedEventForView?.eventId });
                                setError('Please select a rating and ensure event is selected');
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#1e40af',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              zIndex: 10,
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              e.target.style.backgroundColor = '#1e3a8a';
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              e.target.style.backgroundColor = '#1e40af';
                            }}
                          >
                            Submit Rating
                          </button>
                        )}
                      </div>

                      {/* Comment Section */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Your Comment
                        </label>
                        <textarea
                          value={commentText}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCommentText(e.target.value);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onFocus={(e) => {
                            e.stopPropagation();
                            e.target.style.borderColor = '#1e40af';
                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.stopPropagation();
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="Share your thoughts about this event..."
                          maxLength={1000}
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '0.875rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            marginBottom: '0.5rem',
                            outline: 'none',
                            transition: 'all 0.2s',
                            zIndex: 10,
                            position: 'relative',
                            pointerEvents: 'auto'
                          }}
                        />
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {commentText.length}/1000 characters
                          </div>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (commentText.trim() && selectedEventForView?.eventId) {
                                try {
                                  const eventId = String(selectedEventForView.eventId);
                                  console.log('🚀 Submitting comment:', { eventId, commentLength: commentText.trim().length, selectedEventForView });
                                  setError(''); // Clear previous errors
                                  const result = await eventsApiService.submitComment(eventId, commentText.trim());
                                  console.log('📊 Comment submission result:', result);
                                  if (result.success) {
                                    setCommentText('');
                                    setError('');
                                    // Reload ratings and comments
                                    await loadRatingsAndComments(eventId);
                                  } else {
                                    const errorMsg = result.message || result.error?.message || result.error?.msg || 'Failed to submit comment';
                                    console.error('❌ Comment submission failed:', errorMsg, result);
                                    setError(errorMsg);
                                  }
                                } catch (err) {
                                  console.error('❌ Error submitting comment:', err);
                                  const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting comment';
                                  setError(errorMsg);
                                }
                              } else {
                                console.warn('⚠️ Cannot submit comment:', { hasText: !!commentText.trim(), eventId: selectedEventForView?.eventId });
                                setError('Please enter a comment and ensure event is selected');
                              }
                            }}
                            disabled={!commentText.trim()}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.5rem',
                              backgroundColor: !commentText.trim() ? '#d1d5db' : '#1e40af',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: !commentText.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              zIndex: 10,
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              if (commentText.trim()) {
                                e.target.style.backgroundColor = '#1e3a8a';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              if (commentText.trim()) {
                                e.target.style.backgroundColor = '#1e40af';
                              }
                            }}
                          >
                            Submit Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments Section */}
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
                        {ratingsAndComments.comments.map((comment) => {
                          const isOwnComment = user && (
                            comment.user?._id === user._id || 
                            comment.user?._id?.toString() === user._id?.toString() ||
                            comment.user?.email?.toLowerCase() === user.email?.toLowerCase()
                          );
                          
                          return (
                            <div
                              key={comment._id}
                              style={{
                                padding: '1rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb',
                                position: 'relative'
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
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem'
                                }}>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280'
                                  }}>
                                    {formatDate(comment.createdAt)}
                                  </div>
                                  {isOwnComment && (
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (window.confirm('Are you sure you want to delete this comment?')) {
                                          try {
                                            const eventId = String(selectedEventForView.eventId);
                                            const result = await eventsApiService.deleteComment(
                                              eventId,
                                              comment._id
                                            );
                                            if (result.success) {
                                              setError(''); // Clear any previous errors
                                              // Reload ratings and comments
                                              await loadRatingsAndComments(eventId);
                                            } else {
                                              setError(result.message || result.error?.message || 'Failed to delete comment');
                                            }
                                          } catch (err) {
                                            console.error('Error deleting comment:', err);
                                            setError(err.response?.data?.message || err.message || 'Error deleting comment');
                                          }
                                        }
                                      }}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #ef4444',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.stopPropagation();
                                        e.target.style.backgroundColor = '#fee2e2';
                                        e.target.style.borderColor = '#dc2626';
                                        e.target.style.color = '#dc2626';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.stopPropagation();
                                        e.target.style.backgroundColor = 'transparent';
                                        e.target.style.borderColor = '#ef4444';
                                        e.target.style.color = '#ef4444';
                                      }}
                                      title="Delete comment"
                                    >
                                      <span className="material-symbols-outlined" style={{
                                        fontSize: '0.875rem'
                                      }}>
                                        delete
                                      </span>
                                      Delete
                                    </button>
                                  )}
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
                          );
                        })}
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

export default StudentMyRegistrations;
