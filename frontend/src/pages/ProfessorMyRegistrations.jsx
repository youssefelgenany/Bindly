import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import professorApiService from '../api/professorApi';
import { eventsApiService } from '../api/eventsApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { notificationApiService } from '../api/notificationApi';

import { useAuth } from '../contexts/AuthContext';

const canCancelRegistration = (registration) => {
  if (!registration) return false;
  if (!registration.paid) return false;
  if (!registration.eventDate) return false;
  
  const eventDate = new Date(registration.eventDate);
  const now = new Date();
  
  // Check if event has already started
  if (eventDate <= now) return false;
  
  // Check if less than 2 weeks remain (14 days)
  const twoWeeksInMs = 14 * 24 * 60 * 60 * 1000;
  const timeUntilEvent = eventDate.getTime() - now.getTime();
  
  return timeUntilEvent >= twoWeeksInMs;
};

const ProfessorMyRegistrations = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showRatingsCommentsModal, setShowRatingsCommentsModal] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [ratingsAndComments, setRatingsAndComments] = useState(null);
  const [loadingRatingsComments, setLoadingRatingsComments] = useState(false);
  const [eventRatings, setEventRatings] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRegistrationData, setCancelRegistrationData] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [cancelSuccessData, setCancelSuccessData] = useState({
    eventTitle: '',
    refunded: false,
    refundAmount: 0
  });
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalFocus, setModalFocus] = useState(null);
  const ratingSectionRef = useRef(null);
  const commentSectionRef = useRef(null);

  const resetModalState = () => {
    setRating(0);
    setHoveredRating(0);
    setCommentText('');
    setModalError('');
    setModalSuccess('');
    setModalFocus(null);
  };

  useEffect(() => {
    if (!showRatingsCommentsModal || !modalFocus) return;
    const target = modalFocus === 'comment' ? commentSectionRef.current : ratingSectionRef.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setModalFocus(null);
  }, [showRatingsCommentsModal, modalFocus]);

  const canCancelSelectedRegistration = canCancelRegistration(selectedRegistration);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    // Exact match
    if (currentPath === path) return true;
    // For dashboard, check if it's exactly /dashboard (not /dashboard/something)
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    // For other routes, check if current path starts with the route path
    return currentPath.startsWith(path);
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
      
      // Professor users should use the regular Registration API, not StudentRegistration
      const result = await eventsApiService.getMyRegistrations();
      console.log('📦 Raw API result:', result);
      
      const allRegistrations = [];
      
      // Load regular registrations (Registration model)
      if (result.success && result.data) {
        const registrations = Array.isArray(result.data) ? result.data : [];
        registrations
          .filter(reg => reg.event && reg.status !== 'cancelled')
          .forEach(reg => {
            allRegistrations.push({
              id: reg._id,
              eventId: reg.event?._id ? String(reg.event._id) : null,
              eventTitle: reg.event?.title || 'Event Deleted',
              eventType: reg.event?.type || 'unknown',
              eventDate: reg.event?.startDate || null,
              eventEndDate: reg.event?.endDate || null,
              eventLocation: reg.event?.location || 'N/A',
              eventDescription: reg.event?.description || '',
              paid: reg.paid || false,
              status: reg.status || 'approved',
              registeredAt: reg.registeredAt || reg.createdAt,
              professorName: user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.name || 'Professor',
              professorEmail: user?.email || ''
            });
          });
      }
      
      // Also check StudentRegistration by email (for workshops/trips registered through StudentRegistrationForm)
      if (user.email) {
        try {
          const studentRegResult = await studentRegistrationApi.getMyRegistrations();
          if (studentRegResult.success && studentRegResult.data?.registrations) {
            studentRegResult.data.registrations
              .filter(reg => reg.status !== 'cancelled')
              .forEach(reg => {
                // Only add if not already in allRegistrations (avoid duplicates)
                const alreadyExists = allRegistrations.some(r => r.eventId === reg.eventId);
                if (!alreadyExists) {
                  allRegistrations.push({
                    id: reg.id,
                    eventId: reg.eventId,
                    eventTitle: reg.eventTitle,
                    eventType: reg.eventType,
                    eventDate: reg.eventDate,
                    eventEndDate: reg.eventEndDate,
                    eventLocation: reg.eventLocation,
                    eventDescription: reg.eventDescription || '',
                    paid: reg.paid || false,
                    status: reg.status || 'approved',
                    registeredAt: reg.registeredAt,
                    professorName: user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.name || 'Professor',
                    professorEmail: user?.email || ''
                  });
                }
              });
          }
        } catch (studentRegError) {
          console.error('Error loading student registrations:', studentRegError);
        }
      }
      
      const formattedRegistrations = allRegistrations;
      
      console.log('📋 Raw registrations:', formattedRegistrations);
      console.log('📊 Number of registrations:', formattedRegistrations.length);
      console.log('✨ Final formatted registrations:', formattedRegistrations);
      console.log('📊 Final count:', formattedRegistrations.length);
      setRegistrations(formattedRegistrations);
      
      // Load ratings for all events
      const ratingsMap = {};
      await Promise.all(formattedRegistrations.map(async (reg) => {
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
            // Silently fail - ratings are optional
          }
        }
      }));
      setEventRatings(ratingsMap);
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

  // Load ratings and comments for viewing
  const loadRatingsAndComments = async (eventId) => {
    if (!eventId) {
      setModalError('Event ID is required');
      return;
    }
    setLoadingRatingsComments(true);
    setModalError('');
    try {
      const eventIdStr = String(eventId);
      const result = await eventsApiService.getRatingsAndComments(eventIdStr);
      if (result.success) {
        setRatingsAndComments(result.data);
      } else {
        setModalError(result.message || result.error?.message || 'Failed to load ratings and comments');
      }
    } catch (err) {
      console.error('Error loading ratings and comments:', err);
      setModalError(err.response?.data?.message || err.message || 'Error loading ratings and comments');
    } finally {
      setLoadingRatingsComments(false);
    }
  };

  // Handle view ratings and comments
  const handleViewRatingsComments = async (registrationOrEventId, options = {}) => {
    let registration = null;
    let eventId = null;

    if (registrationOrEventId && typeof registrationOrEventId === 'object') {
      registration = registrationOrEventId;
      eventId = registration.eventId || registration.event?._id || registration.event?.id;
    } else {
      eventId = registrationOrEventId;
      registration = registrations.find(r => {
        const regId = r.eventId || r.event?._id || r.event?.id;
        return String(regId) === String(eventId);
      });
    }

    if (!eventId) {
      setModalError('Event data not available.');
      return;
    }

    let eventDetails = null;
    try {
      const eventResult = await eventsApiService.getAllEventsAuthenticated({});
      if (eventResult.success && Array.isArray(eventResult.data)) {
        eventDetails = eventResult.data.find(e => String(e._id || e.id) === String(eventId));
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
    }

    const eventData = {
      eventId: String(eventId),
      eventDate: eventDetails?.startDate || eventDetails?.eventDate || registration?.eventDate || registration?.startDate,
      eventEndDate: eventDetails?.endDate || eventDetails?.eventEndDate || registration?.eventEndDate || registration?.endDate,
      eventTitle: registration?.eventTitle || registration?.title || eventDetails?.title,
      registration,
      eventDetails
    };

    setSelectedEventForView(eventData);
    resetModalState();
    if (options.focus) {
      setModalFocus(options.focus);
    }
    setShowRatingsCommentsModal(true);
    await loadRatingsAndComments(eventId);
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
    return colors[type] || colors.other;
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
  const normalized = status?.toLowerCase();
  if (normalized === 'approved' || normalized === 'registered') {
    return 'REGISTERED';
  }
  if (normalized === 'pending') {
    return 'PENDING';
  }
  if (normalized === 'rejected') {
    return 'REJECTED';
  }
  return status ? status.toUpperCase() : 'STATUS';
};

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    
    // Set both dates to midnight for accurate day comparison
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = eventDateOnly - todayOnly;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const isMarkedAsPastEvent = (registration) => {
    if (!registration) return false;
    const typeString = registration.eventType || registration.eventCategory || registration.type || registration.event?.type || '';
    const normalized = typeString?.toString().trim().toLowerCase();
    if (!normalized) return false;
    return normalized === 'past event' || normalized === 'past events' || normalized === 'past';
  };

  const isRegistrationPast = (registration) => {
    if (!registration) return false;
    const eventDate = registration.eventDate || registration.startDate || registration.event?.startDate || registration.event?.eventDate;
    const eventEndDate = registration.eventEndDate || registration.endDate || registration.event?.endDate || registration.event?.eventEndDate;
    if (eventDate && getDaysUntilEvent(eventDate) === 'Past') {
      return true;
    }
    return hasEventPassed(eventDate, eventEndDate) || isMarkedAsPastEvent(registration);
  };

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

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

  // Check if event has passed (can rate/comment)
  const hasEventPassed = (eventDate, eventEndDate) => {
    try {
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Set to end of today to include events that ended today
      
      // Check endDate first (most accurate), then eventDate
      let checkDate = null;
      if (eventEndDate) {
        checkDate = new Date(eventEndDate);
        if (isNaN(checkDate.getTime())) {
          checkDate = null;
        } else {
          // Use the full datetime, not just date
          // If it's a date string without time, set to end of that day
          if (checkDate.getHours() === 0 && checkDate.getMinutes() === 0 && checkDate.getSeconds() === 0) {
            checkDate.setHours(23, 59, 59, 999);
          }
        }
      }
      
      if (!checkDate && eventDate) {
        checkDate = new Date(eventDate);
        if (isNaN(checkDate.getTime())) {
          return false;
        } else {
          // Use the full datetime, not just date
          // If it's a date string without time, set to end of that day
          if (checkDate.getHours() === 0 && checkDate.getMinutes() === 0 && checkDate.getSeconds() === 0) {
            checkDate.setHours(23, 59, 59, 999);
          }
        }
      }
      
      if (!checkDate) {
        return false;
      }
      
      // Event has passed if the checkDate is before or equal to now
      return checkDate <= now;
    } catch (error) {
      console.error('Error checking if event has passed:', error);
      return false;
    }
  };

  // Handle rating submission
  const refreshEventRatingStats = async (eventId) => {
    try {
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
    } catch (err) {
      console.error('Error refreshing rating stats:', err);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedEventForView?.eventId) {
      setModalError('No event selected.');
      return;
    }
    if (!rating || rating < 1) {
      setModalError('Please select a rating between 1 and 5.');
      return;
    }
    setModalError('');
    try {
      const eventId = String(selectedEventForView.eventId);
      const result = await eventsApiService.submitRating(eventId, rating);
      if (result.success) {
        setRating(0);
        setHoveredRating(0);
        setModalSuccess('Rating submitted successfully.');
        await loadRatingsAndComments(eventId);
        await refreshEventRatingStats(eventId);
      } else {
        setModalSuccess('');
        setModalError(result.message || result.error?.message || 'Failed to submit rating.');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setModalSuccess('');
      setModalError(err.response?.data?.message || err.message || 'Error submitting rating.');
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!selectedEventForView?.eventId) {
      setModalError('No event selected.');
      return;
    }
    if (!commentText.trim()) {
      setModalError('Please enter a comment.');
      return;
    }

    if (commentText.trim().length > 1000) {
      setModalError('Comment cannot exceed 1000 characters.');
      return;
    }

    setModalError('');

    try {
      const eventId = String(selectedEventForView.eventId);
      const result = await eventsApiService.submitComment(eventId, commentText.trim());
      if (result.success) {
        setCommentText('');
        setModalSuccess('Comment submitted successfully.');
        await loadRatingsAndComments(eventId);
      } else {
        setModalSuccess('');
        setModalError(result.message || result.error?.message || 'Failed to submit comment.');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setModalSuccess('');
      setModalError(err.response?.data?.message || err.message || 'Error submitting comment.');
    }
  };

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
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #FFFFFF' : '2px solid transparent',
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
            to="/professor/all-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
            to="/professor/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
            to="/professor/my-workshops"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/my-workshops') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/my-workshops') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              school
            </span>
            My Workshops
          </Link>
          <Link
            to="/gym"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym') ? '2px solid #FFFFFF' : '2px solid transparent',
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
          <Link
            to="/booth-polls"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/booth-polls') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/booth-polls') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/booth-polls') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              poll
            </span>
            Vendor Polls
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          {/* Heart Icon - Favorites */}
          <Link
            to="/professor/favorites"
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
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                          if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                            navigate(`/professor/all-events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                            // Navigate to My Events for reminders
                            navigate(`/professor/events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            notification.type === 'loyalty_program_application' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            // Navigate to Loyalty Partners page
                            navigate(`/professor/loyalty-vendors`);
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
              Professor
            </p>
          </div>
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
                {registrations.map(registration => {
                  const cardCanCancel = canCancelRegistration(registration);
                  return (
                  <div
                    key={registration.id}
                    onClick={async () => {
                      setSelectedRegistration(registration);
                      // Fetch full event details
                      if (registration.eventId) {
                        try {
                          const eventResult = await eventsApiService.getAllEventsAuthenticated({});
                          if (eventResult.success && Array.isArray(eventResult.data)) {
                            const eventDetails = eventResult.data.find(
                              (e) => String(e._id || e.id) === String(registration.eventId)
                            );
                            setSelectedEventDetails(eventDetails);
                          }
                        } catch (err) {
                          console.error('Error fetching event details:', err);
                          setSelectedEventDetails(null);
                        }
                      }
                    }}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cardCanCancel) {
                              setSelectedRegistration(registration);
                              return;
                            }
                            setCancelRegistrationData({
                              eventId: registration.eventId || registration.id,
                              eventTitle: registration.eventTitle,
                              paid: registration.paid
                            });
                            setShowCancelModal(true);
                          }}
                          style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: getStatusColor(registration.status),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: cardCanCancel ? 'pointer' : 'default',
                            boxShadow: cardCanCancel ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'transform 0.1s ease'
                          }}
                          title={cardCanCancel ? 'Click to cancel registration & refund wallet' : ''}
                        >
                          {getDisplayStatus(registration.status)}
                        </button>
                      </div>

                      {cardCanCancel && (
                        <div style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
                          Tap “Registered” to cancel & refund
                        </div>
                      )}

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
                        
                        {/* Rating and Comment Actions removed per design */}
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

                      {/* Bottom Section: Rating Display */}
                      <div style={{
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '0.5rem'
                      }}>
                        {/* Average Rating Display - Bottom Left (Clickable to view ratings/comments for ALL events) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRatingsComments(registration);
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
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </>
          )}
          </div>
        </div>
      </main>

      {/* Ratings & Comments Modal */}
      {showRatingsCommentsModal && selectedEventForView && (
        <div
          onClick={() => {
            setShowRatingsCommentsModal(false);
            setSelectedEventForView(null);
            setRatingsAndComments(null);
            resetModalState();
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
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  Ratings & Comments
                </h2>
                {selectedEventForView?.eventTitle && (
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    {selectedEventForView.eventTitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowRatingsCommentsModal(false);
                  setSelectedEventForView(null);
                  setRatingsAndComments(null);
                  resetModalState();
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
              {modalError && (
                <div style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  fontSize: '0.875rem'
                }}>
                  {modalSuccess}
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

                  {/* Comments Section */}
                  {selectedEventForView && (() => {
                    const eventDate = selectedEventForView.eventDate || selectedEventForView.registration?.eventDate;
                    const eventEndDate = selectedEventForView.eventEndDate || selectedEventForView.registration?.eventEndDate;
                    const finalEventDate = eventDate || selectedEventForView.registration?.eventDate;
                    const finalEventEndDate = eventEndDate || selectedEventForView.registration?.eventEndDate;
                    const isPast = hasEventPassed(finalEventDate, finalEventEndDate);
                    const isPastType = isMarkedAsPastEvent(selectedEventForView.registration);
                    if (!finalEventDate && !finalEventEndDate && !isPastType) {
                      return false;
                    }
                    return isPast || isPastType;
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
                        Share Your Feedback
                      </h3>

                      <div ref={ratingSectionRef} style={{ marginBottom: '1.5rem' }}>
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
                          gap: '0.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '2rem',
                                color: (hoveredRating >= star || rating >= star) ? '#fbbf24' : '#d1d5db',
                                transition: 'all 0.2s',
                                lineHeight: 1
                              }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div ref={commentSectionRef}>
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
                          onChange={(e) => setCommentText(e.target.value)}
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
                          marginBottom: '0.75rem'
                        }}>
                          {commentText.length}/1000 characters
                        </div>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            if (!selectedEventForView?.eventId) {
                              setModalError('No event selected.');
                              return;
                            }
                            
                            const hasRating = rating > 0 && rating <= 5;
                            const hasComment = commentText.trim().length > 0;
                            
                            if (!hasRating && !hasComment) {
                              setModalError('Please provide a rating, comment, or both.');
                              return;
                            }
                            
                            setModalError('');
                            setModalSuccess('');
                            
                            const eventId = String(selectedEventForView.eventId);
                            let ratingSuccess = true;
                            let commentSuccess = true;
                            let errorMessages = [];
                            
                            try {
                              // Submit rating if provided
                              if (hasRating) {
                                try {
                                  console.log('🚀 Submitting rating:', { eventId, rating, selectedEventForView });
                                  const ratingResult = await eventsApiService.submitRating(eventId, rating);
                                  console.log('📊 Rating submission result:', ratingResult);
                                  if (ratingResult.success) {
                                    setRating(0);
                                    setHoveredRating(0);
                                  } else {
                                    ratingSuccess = false;
                                    const errorMsg = ratingResult.message || ratingResult.error?.message || ratingResult.error?.msg || 'Failed to submit rating';
                                    errorMessages.push(errorMsg);
                                  }
                                } catch (err) {
                                  ratingSuccess = false;
                                  console.error('❌ Error submitting rating:', err);
                                  const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting rating';
                                  errorMessages.push(errorMsg);
                                }
                              }
                              
                              // Submit comment if provided
                              if (hasComment) {
                                try {
                                  console.log('🚀 Submitting comment:', { eventId, commentLength: commentText.trim().length, selectedEventForView });
                                  const commentResult = await eventsApiService.submitComment(eventId, commentText.trim());
                                  console.log('📊 Comment submission result:', commentResult);
                                  if (commentResult.success) {
                                    setCommentText('');
                                  } else {
                                    commentSuccess = false;
                                    const errorMsg = commentResult.message || commentResult.error?.message || commentResult.error?.msg || 'Failed to submit comment';
                                    errorMessages.push(errorMsg);
                                  }
                                } catch (err) {
                                  commentSuccess = false;
                                  console.error('❌ Error submitting comment:', err);
                                  const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting comment';
                                  errorMessages.push(errorMsg);
                                }
                              }
                              
                              // Show success or error messages
                              if (ratingSuccess && commentSuccess) {
                                const successMessages = [];
                                if (hasRating) successMessages.push('Rating');
                                if (hasComment) successMessages.push('Comment');
                                setModalSuccess(`${successMessages.join(' and ')} submitted successfully.`);
                                setModalError('');
                              } else {
                                setModalError(errorMessages.join(' '));
                                setModalSuccess('');
                              }
                              
                              // Reload ratings and comments regardless of success/failure
                              await loadRatingsAndComments(eventId);
                              
                              // Update event ratings if rating was submitted
                              if (hasRating && ratingSuccess) {
                                await refreshEventRatingStats(eventId);
                              }
                            } catch (err) {
                              console.error('❌ Error in submit process:', err);
                              setModalError(err.response?.data?.message || err.message || 'Error submitting feedback');
                              setModalSuccess('');
                            }
                          }}
                          disabled={!(rating > 0 || commentText.trim())}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: !(rating > 0 || commentText.trim()) ? '#d1d5db' : '#1e40af',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: !(rating > 0 || commentText.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            zIndex: 10,
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            if (rating > 0 || commentText.trim()) {
                              e.target.style.backgroundColor = '#1e3a8a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            if (rating > 0 || commentText.trim()) {
                              e.target.style.backgroundColor = '#1e40af';
                            }
                          }}
                        >
                          Submit
                        </button>
                      </div>
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
                                color: '#9ca3af'
                              }}>
                                {formatDate(comment.createdAt)}
                              </div>
                            </div>
                            <p style={{
                              color: '#374151',
                              fontSize: '0.875rem',
                              margin: 0,
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap'
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
                        margin: 0
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
                  No ratings or comments available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Detail Modal */}
      {selectedRegistration && (
        <div
          onClick={() => {
            setSelectedRegistration(null);
            setSelectedEventDetails(null);
          }}
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
            {/* Event Image at Top */}
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
              onClick={() => {
                setSelectedRegistration(null);
                setSelectedEventDetails(null);
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
                <div
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '0.5rem',
                    backgroundColor: getStatusColor(selectedRegistration.status),
                    color: '#FFFFFF',
                    fontSize: '0.6875rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: canCancelSelectedRegistration ? 'pointer' : 'default',
                    boxShadow: canCancelSelectedRegistration ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => {
                    if (!canCancelSelectedRegistration) return;
                    setCancelRegistrationData({
                      eventId: selectedRegistration.eventId || selectedRegistration.id,
                      eventTitle: selectedRegistration.eventTitle,
                      paid: selectedRegistration.paid
                    });
                    setShowCancelModal(true);
                  }}
                  title={canCancelSelectedRegistration ? 'Click to cancel registration & refund wallet' : ''}
                >
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
                {(selectedEventDetails?.registrationDeadline || selectedRegistration.registrationDeadline) && (
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
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Registration Deadline</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEventDetails?.registrationDeadline || selectedRegistration.registrationDeadline)}</div>
                    </div>
                  </div>
                )}
                {(selectedEventDetails?.price || selectedRegistration.price) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      attach_money
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                        {(selectedRegistration.eventType === 'trip' || selectedRegistration.eventType === 'workshop') ? 'Registration Fees' : 'Price'}
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {(selectedRegistration.eventType === 'trip' || selectedRegistration.eventType === 'workshop') ? (
                          <span style={{ color: '#059669' }}>{(selectedEventDetails?.price || selectedRegistration.price)} EGP</span>
                        ) : (
                          <span style={{ color: '#059669' }}>${(selectedEventDetails?.price || selectedRegistration.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                {(selectedRegistration.eventType === 'workshop' || selectedRegistration.eventType === 'conference') && (selectedEventDetails?.professors || selectedEventDetails?.creatorName) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      school
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Professor</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>
                        {selectedEventDetails?.professors 
                          ? (Array.isArray(selectedEventDetails.professors) ? selectedEventDetails.professors.join(', ') : selectedEventDetails.professors)
                          : (selectedEventDetails?.creatorName || 'Professor')
                        }
                      </div>
                    </div>
                  </div>
                )}
                {(selectedRegistration.eventType === 'bazaar' || selectedRegistration.eventType === 'booth') && selectedEventDetails?.vendors && selectedEventDetails.vendors.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      storefront
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Vendors</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{selectedEventDetails.vendors.length} vendor{selectedEventDetails.vendors.length !== 1 ? 's' : ''} participating</div>
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

              {((selectedRegistration.eventType === 'bazaar' || selectedRegistration.eventType === 'booth') && selectedEventDetails?.vendors && selectedEventDetails.vendors.length > 0) ? (
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
                      storefront
                    </span>
                    Participating Vendors ({selectedEventDetails.vendors.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {selectedEventDetails.vendors.map((vendor, idx) => (
                      <div key={vendor._id || idx} style={{
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#1D3557',
                          fontSize: '0.875rem',
                          marginBottom: '0.25rem'
                        }}>
                          {vendor.name || vendor.companyName || 'Vendor'}
                        </div>
                        {vendor.contactName && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Contact: {vendor.contactName}
                          </div>
                        )}
                        {vendor.email && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {vendor.email}
                          </div>
                        )}
                        {selectedRegistration.eventType === 'booth' && vendor.boothSize && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                              square_foot
                            </span>
                            Booth Size: {vendor.boothSize}
                            {vendor.durationWeeks && ` • Duration: ${vendor.durationWeeks} week${vendor.durationWeeks !== 1 ? 's' : ''}`}
                            {vendor.boothLocation && ` • Location: ${vendor.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(selectedRegistration.eventDescription || selectedEventDetails?.description) && (
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
                    {selectedRegistration.eventDescription || selectedEventDetails?.description}
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
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                      {selectedRegistration.studentName || selectedRegistration.professorName || 
                       (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name || displayName || 'N/A')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Professor ID</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                      {selectedRegistration.studentId || user?.gucId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ color: '#374151', fontWeight: '500', fontSize: '0.875rem' }}>
                      {selectedRegistration.studentEmail || selectedRegistration.professorEmail || user?.email || 'N/A'}
                    </div>
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

              {/* Cancel Button - Only show for paid registrations that can be cancelled (2+ weeks before event) */}
              {canCancelSelectedRegistration && (
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => {
                      setCancelRegistrationData({
                        eventId: selectedRegistration.eventId || selectedRegistration.id,
                        eventTitle: selectedRegistration.eventTitle,
                        paid: selectedRegistration.paid
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

      {/* Cancel Registration Modal */}
      {showCancelModal && cancelRegistrationData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            maxWidth: '32rem',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
            padding: '2rem'
          }}>
            <h3 style={{ margin: 0, marginBottom: '0.75rem', color: '#1D3557', fontSize: '1.25rem' }}>
              Cancel Registration?
            </h3>
            <p style={{ margin: 0, marginBottom: '1rem', color: '#4b5563', lineHeight: 1.6 }}>
              You are about to cancel your registration for <strong>{cancelRegistrationData.eventTitle}</strong>.
              If this event was paid, the amount will be refunded immediately to your wallet.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fff',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Keep Registration
              </button>
              <button
                onClick={async () => {
                  if (!cancelRegistrationData?.eventId) {
                    alert('Event ID not found');
                    return;
                  }
                  setCancelling(true);
                  try {
                    const result = await eventsApiService.cancelRegistration(cancelRegistrationData.eventId);
                    if (result.success) {
                      setCancelSuccessData({
                        eventTitle: cancelRegistrationData.eventTitle,
                        refunded: result.data?.refunded || false,
                        refundAmount: result.data?.refundAmount || 0
                      });
                      setShowCancelModal(false);
                      setCancelRegistrationData(null);
                      setShowCancelSuccess(true);
                      setSelectedRegistration(null);
                      await loadMyRegistrations();
                      window.dispatchEvent(new Event('walletRefresh'));
                      if (refreshUser) {
                        await refreshUser();
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
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  opacity: cancelling ? 0.7 : 1
                }}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            maxWidth: '26rem',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d',
              fontSize: '1.5rem'
            }}>
              ✓
            </div>
            <h3 style={{ margin: 0, color: '#1D3557', fontSize: '1.25rem' }}>
              Registration Cancelled
            </h3>
            <p style={{ margin: '0.75rem 0', color: '#4b5563', lineHeight: 1.6 }}>
              {cancelSuccessData.eventTitle} has been cancelled successfully.
              {cancelSuccessData.refunded && (
                <> {cancelSuccessData.refundAmount} EGP was refunded to your wallet.</>
              )}
            </p>
            <button
              onClick={() => setShowCancelSuccess(false)}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#1e40af',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorMyRegistrations;

