import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { notificationApiService } from '../api/notificationApi';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import WorkshopEditRequestModal from '../components/WorkshopEditRequestModal';

const StudentEventsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [professorFilter, setProfessorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc'); // date-asc, date-desc, title-asc, title-desc
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showProfessorDropdown, setShowProfessorDropdown] = useState(false);
  const [availableProfessors, setAvailableProfessors] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [showWorkshopEditModal, setShowWorkshopEditModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [myRegistrations, setMyRegistrations] = useState([]); // Store student's registrations to check if they attended
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showRatingsCommentsModal, setShowRatingsCommentsModal] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [ratingsAndComments, setRatingsAndComments] = useState(null);
  const [loadingRatingsComments, setLoadingRatingsComments] = useState(false);
  const [eventRatings, setEventRatings] = useState({});
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [modalError, setModalError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [favoriteEventIds, setFavoriteEventIds] = useState(new Set());


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
    : user?.name || 'Student';

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
      if (showFilterDropdown && !event.target.closest('[data-filter-dropdown]')) {
        setShowFilterDropdown(false);
      }
      if (showSortDropdown && !event.target.closest('[data-sort-dropdown]')) {
        setShowSortDropdown(false);
      }
      if (showProfessorDropdown && !event.target.closest('[data-professor-dropdown]')) {
        setShowProfessorDropdown(false);
      }
      if (showNotificationsDropdown && !event.target.closest('[data-notifications-dropdown]')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown, showFilterDropdown, showSortDropdown, showProfessorDropdown, showNotificationsDropdown]);

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const typeParam = filter && filter !== 'all' && filter.trim() !== '' ? filter.trim().toLowerCase() : undefined;
      console.log('🔍 Frontend - Filter state:', filter, '-> Sending type param:', typeParam);
      
      const result = await eventsApiService.getStudentEvents({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: typeParam
      });
      
      if (result.success) {
        const mapped = (result.data || []).map(ev => ({
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
          // Only keep events with valid types and non-empty title/location
          if (!validTypes.includes(type) || !ev.title || ev.title.trim() === '' || !ev.location || ev.location.trim() === '') {
            return false;
          }
          
          // Apply type filter if not 'all' - strict matching
          if (filter && filter !== 'all' && filter.trim() !== '') {
            const filterType = filter.trim().toLowerCase();
            const eventType = (type || '').toString().trim().toLowerCase();
            if (eventType !== filterType) {
              return false;
            }
          }
          
          // Show all events including past events - no date filtering
          return true;
        });
        
        console.log('🔍 StudentEventsView - Events loaded:', {
          totalEvents: mapped.length,
          workshopEvents: mapped.filter(e => e.type === 'workshop').length,
          workshopTitles: mapped.filter(e => e.type === 'workshop').map(e => e.title),
          allWorkshops: mapped.filter(e => e.type === 'workshop').map(e => ({
            title: e.title,
            status: e.status,
            startDate: e.startDate,
            endDate: e.endDate
          }))
        });
        
        // Extract unique professors from workshop/conference events
        const professorsSet = new Set();
        mapped.forEach(ev => {
          if (ev.type === 'workshop' || ev.type === 'conference') {
            if (ev.professors) {
              if (Array.isArray(ev.professors)) {
                ev.professors.forEach(p => {
                  if (p && typeof p === 'string') {
                    professorsSet.add(p.trim());
                  }
                });
              } else if (typeof ev.professors === 'string') {
                professorsSet.add(ev.professors.trim());
              }
            }
            if (ev.creatorName) {
              professorsSet.add(ev.creatorName.trim());
            }
          }
        });
        const professorsList = Array.from(professorsSet).sort();
        setAvailableProfessors(professorsList);
        
        // Apply professor filter if workshop/conference is selected
        let filteredEvents = mapped;
        if ((filter === 'workshop' || filter === 'conference') && professorFilter !== 'all') {
          filteredEvents = mapped.filter(ev => {
            if (ev.type !== 'workshop' && ev.type !== 'conference') return false;
            const eventProfessors = [];
            if (ev.professors) {
              if (Array.isArray(ev.professors)) {
                eventProfessors.push(...ev.professors.map(p => p?.trim()));
              } else if (typeof ev.professors === 'string') {
                eventProfessors.push(ev.professors.trim());
              }
            }
            if (ev.creatorName) {
              eventProfessors.push(ev.creatorName.trim());
            }
            return eventProfessors.some(p => p === professorFilter);
          });
        }
        
        // Sort events before setting
        const sortedEvents = sortEvents(filteredEvents);
        setEvents(sortedEvents);
        
        // Load ratings for all events
        const ratingsMap = {};
        await Promise.all(sortedEvents.map(async (ev) => {
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
              // Silently fail - ratings are optional
            }
          }
        }));
        setEventRatings(ratingsMap);
      } else {
        setEvents([]);
        const msg = result.message || (typeof result.error === 'string' ? result.error : 'Failed to fetch events');
        setError(msg);
      }
    } catch (error) {
      setError(error?.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter, professorFilter]);

  useEffect(() => {
    loadEvents();
  }, [filter, professorFilter, sortBy, loadEvents]);
  
  // Reset professor filter when filter changes away from workshop/conference
  useEffect(() => {
    if (filter !== 'workshop' && filter !== 'conference') {
      setProfessorFilter('all');
    }
  }, [filter]);

  // Load user's registrations to check which events they're registered for
  useEffect(() => {
    const loadUserRegistrations = async () => {
      if (!user?.email) return;
      
      try {
        const result = await studentRegistrationApi.getMyRegistrations(user.email);
        if (result.success && result.data.registrations) {
          // Extract event IDs from PAID registrations only
          const registeredIds = new Set();
          result.data.registrations.forEach(reg => {
            // Only include paid registrations
            if (reg.paid !== true) return;
            
            // Check for eventId in the formatted response
            if (reg.eventId) {
              registeredIds.add(String(reg.eventId));
            }
            // Fallback: check if event object exists with _id
            else if (reg.event && typeof reg.event === 'object' && reg.event._id) {
              registeredIds.add(String(reg.event._id));
            } 
            // Fallback: check if event is a string ID
            else if (reg.event && typeof reg.event === 'string') {
              registeredIds.add(reg.event);
            }
          });
          setRegisteredEventIds(registeredIds);
        }
      } catch (error) {
        console.error('Error loading user registrations:', error);
      }
    };

    loadUserRegistrations();
  }, [user]);

  // Load user's favorite events (for Student users)
  useEffect(() => {
    const loadFavoriteEvents = async () => {
      if (!user || user.userType !== 'Student') return;
      
      try {
        const result = await eventsApiService.getFavoriteEvents();
        if (result.success && result.data.events) {
          const favoriteIds = new Set();
          result.data.events.forEach(event => {
            if (event._id) {
              favoriteIds.add(String(event._id));
            } else if (event.id) {
              favoriteIds.add(String(event.id));
            }
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
    
    if (!user || user.userType !== 'Student') return;
    
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
    // Poll for new notifications every 30 seconds
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

  const handleSearch = () => {
    loadEvents();
  };

  const handleRegisterClick = (event) => {
    setRegistrationEvent(event);
    setShowRegistrationForm(true);
  };

  const handleRegistrationSuccess = (registrationData) => {
    setShowRegistrationForm(false);
    // Only add to registered set if payment was completed (paid: true)
    // For free events, registrationData will have paid: true
    // For paid events, this will only be called after successful payment
    if (registrationEvent?.id && registrationData?.paid !== false) {
      setRegisteredEventIds(prev => new Set([...prev, String(registrationEvent.id)]));
    }
    setRegistrationEvent(null);
    loadEvents();
    // Reload registrations to update the registered events list
    const loadUserRegistrations = async () => {
      if (!user?.email) return;
      try {
        const result = await studentRegistrationApi.getMyRegistrations(user.email);
        if (result.success && result.data.registrations) {
          const registeredIds = new Set();
          result.data.registrations.forEach(reg => {
            if (reg.paid !== true) return;
            if (reg.eventId) {
              registeredIds.add(String(reg.eventId));
            } else if (reg.event && typeof reg.event === 'object' && reg.event._id) {
              registeredIds.add(String(reg.event._id));
            } else if (reg.event && typeof reg.event === 'string') {
              registeredIds.add(reg.event);
            }
          });
          setRegisteredEventIds(registeredIds);
        }
      } catch (error) {
        console.error('Error reloading user registrations:', error);
      }
    };
    loadUserRegistrations();
  };

  const handleCloseRegistrationForm = () => {
    setShowRegistrationForm(false);
    setRegistrationEvent(null);
  };

  const handleCloseWorkshopEditModal = () => {
    setShowWorkshopEditModal(false);
    setSelectedWorkshop(null);
  };

  const handleWorkshopEditRequest = (event) => {
    setSelectedWorkshop(event);
    setShowWorkshopEditModal(true);
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

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1', // Light pink
      trip: '#2196F3',
      seminar: '#9C27B0',
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
    return imageMap[type] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
  };

  // Load ratings and comments for viewing (VIEW ONLY - no forms)
  const loadRatingsAndComments = async (eventId) => {
    if (!eventId) return;
    setLoadingRatingsComments(true);
    try {
      const eventIdStr = String(eventId);
      const result = await eventsApiService.getRatingsAndComments(eventIdStr);
      if (result.success) {
        setRatingsAndComments(result.data);
      }
    } catch (err) {
      console.error('Error loading ratings and comments:', err);
    } finally {
      setLoadingRatingsComments(false);
    }
  };

  // Check if event has passed (can rate/comment)
  const hasEventPassed = (eventDate, eventEndDate) => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      let checkDate = null;
      if (eventEndDate) {
        checkDate = new Date(eventEndDate);
        if (isNaN(checkDate.getTime())) {
          checkDate = null;
        } else {
          checkDate.setHours(0, 0, 0, 0);
        }
      }
      
      if (!checkDate && eventDate) {
        checkDate = new Date(eventDate);
        if (isNaN(checkDate.getTime())) {
          return false;
        } else {
          checkDate.setHours(0, 0, 0, 0);
        }
      }
      
      if (!checkDate) {
        return false;
      }
      
      return checkDate <= now;
    } catch (error) {
      console.error('Error checking if event has passed:', error);
      return false;
    }
  };

  // Check if student attended this event (is registered)
  const didStudentAttend = (eventId) => {
    return registeredEventIds.has(String(eventId));
  };

  // Handle rating submission
  const handleSubmitRating = async (eventId) => {
    if (!rating || rating === 0) {
      setModalError('Please select a rating');
      return;
    }
    try {
      const result = await eventsApiService.submitRating(String(eventId), rating);
      if (result.success) {
        setRating(0);
        setHoveredRating(0);
        setModalError('');
        await loadRatingsAndComments(eventId);
        // Update event ratings
        const ratingResult = await eventsApiService.getRatingsAndComments(String(eventId));
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
        setModalError(result.message || result.error?.message || result.error?.msg || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setModalError(err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting rating');
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (eventId) => {
    if (!commentText.trim()) {
      setModalError('Please enter a comment');
      return;
    }
    try {
      const result = await eventsApiService.submitComment(String(eventId), commentText.trim());
      if (result.success) {
        setCommentText('');
        setModalError('');
        await loadRatingsAndComments(eventId);
      } else {
        setModalError(result.message || result.error?.message || result.error?.msg || 'Failed to submit comment');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setModalError(err.response?.data?.message || err.response?.data?.msg || err.message || 'Error submitting comment');
    }
  };

  // Handle view ratings and comments
  const handleViewRatingsComments = async (eventId, eventTitle) => {
    // Find the event to get dates
    const event = events.find(e => e.id === eventId || String(e.id) === String(eventId));
    // Also check registrations for dates
    const registration = myRegistrations.find(r => {
      const regEventId = r.eventId || (r.event?._id) || (r.event);
      return String(regEventId) === String(eventId);
    });
    
    const eventData = {
      eventId: eventId,
      eventDate: event?.startDate || registration?.eventDate || registration?.startDate,
      eventEndDate: event?.endDate || registration?.eventEndDate || registration?.endDate,
      eventTitle: eventTitle || event?.title || registration?.eventTitle
    };
    
    setSelectedEventForView(eventData);
    setRating(0);
    setHoveredRating(0);
    setCommentText('');
    setModalError('');
    setShowRatingsCommentsModal(true);
    await loadRatingsAndComments(eventId);
  };

  // Sort events
  const sortEvents = (eventsList) => {
    const sorted = [...eventsList];
    switch (sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startDate || a.endDate || 0);
          const dateB = new Date(b.startDate || b.endDate || 0);
          return dateA - dateB;
        });
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startDate || a.endDate || 0);
          const dateB = new Date(b.startDate || b.endDate || 0);
          return dateB - dateA;
        });
      case 'title-asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'title-desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      default:
        return sorted;
    }
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
                          // Navigate to event if it's an event notification or reminder
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
              Discover Events
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                Browse and register for upcoming events.
              </p>
            </div>
              </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {/* Search Input and Button - Left Side */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '0 1 auto' }}>
                <div style={{ position: 'relative', width: '520px' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '1.25rem',
                    pointerEvents: 'none',
                    zIndex: 1
                }}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by event name, professor name, location, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={{
                  padding: '0.875rem 1.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    flexShrink: 0
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
                Search
              </button>
            </div>
            
              {/* Filter and Sort Dropdowns - Right Side */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                {/* Filter Dropdown */}
                <div style={{ position: 'relative' }} data-filter-dropdown>
                <button
                  onClick={() => {
                      setShowFilterDropdown(!showFilterDropdown);
                      setShowSortDropdown(false);
                  }}
                  style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
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
                  }}
                  onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#1e40af';
                  }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      filter_list
                    </span>
                    Filter
                </button>
                  {showFilterDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '0.5rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      border: '1px solid #e5e7eb',
                      zIndex: 1000,
                      minWidth: '180px',
                      overflow: 'hidden'
                    }}>
              {['all', 'bazaar', 'trip', 'workshop', 'conference', 'booth'].map((type) => (
                <button
                  key={type}
                          onClick={() => {
                            setFilter(type);
                            setShowFilterDropdown(false);
                          }}
                  style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            backgroundColor: filter === type ? '#eff6ff' : 'transparent',
                            color: filter === type ? '#1e40af' : '#374151',
                            border: 'none',
                    cursor: 'pointer',
                            fontSize: '0.875rem',
                    fontWeight: filter === type ? '600' : '500',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                            borderBottom: '1px solid #f3f4f6'
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== type) {
                              e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== type) {
                              e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                </button>
              ))}
                    </div>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div style={{ position: 'relative' }} data-sort-dropdown>
                  <button
                    onClick={() => {
                      setShowSortDropdown(!showSortDropdown);
                      setShowFilterDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.25rem',
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
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#1e40af';
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      sort
                    </span>
                    Sort
                  </button>
                  {showSortDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      border: '1px solid #e5e7eb',
                      zIndex: 1000,
                      minWidth: '200px',
                      overflow: 'hidden'
                    }}>
                      {[
                        { value: 'date-asc', label: 'Date (Earliest First)' },
                        { value: 'date-desc', label: 'Date (Latest First)' },
                        { value: 'title-asc', label: 'Title (A-Z)' },
                        { value: 'title-desc', label: 'Title (Z-A)' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            backgroundColor: sortBy === option.value ? '#eff6ff' : 'transparent',
                            color: sortBy === option.value ? '#1e40af' : '#374151',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: sortBy === option.value ? '600' : '500',
                            transition: 'all 0.2s',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                          onMouseEnter={(e) => {
                            if (sortBy !== option.value) {
                              e.target.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sortBy !== option.value) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Professor Filter Dropdown - Only show for workshop/conference */}
                {(filter === 'workshop' || filter === 'conference') && (
                  <div style={{ position: 'relative' }} data-professor-dropdown>
                    <button
                      onClick={() => {
                        setShowProfessorDropdown(!showProfessorDropdown);
                        setShowFilterDropdown(false);
                        setShowSortDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.875rem 1.25rem',
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
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#1e40af';
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                        person
                      </span>
                      Professor
                    </button>
                    {showProfessorDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        zIndex: 1000,
                        minWidth: '200px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => {
                            setProfessorFilter('all');
                            setShowProfessorDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            backgroundColor: professorFilter === 'all' ? '#eff6ff' : 'transparent',
                            color: professorFilter === 'all' ? '#1e40af' : '#374151',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: professorFilter === 'all' ? '600' : '500',
                            transition: 'all 0.2s',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                          onMouseEnter={(e) => {
                            if (professorFilter !== 'all') {
                              e.target.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (professorFilter !== 'all') {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          All Professors
                        </button>
                        {availableProfessors.map((professor) => (
                          <button
                            key={professor}
                            onClick={() => {
                              setProfessorFilter(professor);
                              setShowProfessorDropdown(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              textAlign: 'left',
                              backgroundColor: professorFilter === professor ? '#eff6ff' : 'transparent',
                              color: professorFilter === professor ? '#1e40af' : '#374151',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: professorFilter === professor ? '600' : '500',
                              transition: 'all 0.2s',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => {
                              if (professorFilter !== professor) {
                                e.target.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (professorFilter !== professor) {
                                e.target.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {professor}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <p style={{ margin: 0, color: '#6b7280' }}>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
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
              }}>📅</div>
              <p style={{
                color: '#374151',
                fontSize: '1.125rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                marginTop: 0
              }}>
                No upcoming events found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                marginTop: 0
              }}>
                Only events that haven't started yet are shown.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  loadEvents();
                }}
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
                Show All Upcoming Events
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
                Found {events.length} upcoming event{events.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {filter !== 'all' && ` in ${filter} category`}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {events.map(event => {
                  const isRegistered = registeredEventIds.has(String(event.id));
                  return (
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
                      {/* Event Type Image - Top Half */}
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
                              // Fallback if image doesn't exist
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
                          {/* Heart Icon for Student users */}
                          {user?.userType === 'Student' && (
                            <button
                              onClick={(e) => handleToggleFavorite(event.id, e)}
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
                                  color: favoriteEventIds.has(String(event.id)) ? '#ef4444' : '#6b7280',
                                  transition: 'color 0.2s'
                                }}
                              >
                                {favoriteEventIds.has(String(event.id)) ? 'favorite' : 'favorite_border'}
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
                        backgroundColor: getEventTypeColor(event.type),
                        color: '#FFFFFF',
                        fontSize: '0.6875rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {event.type}
                      </div>
                      {getDaysUntilEvent(event.startDate) && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#1e40af',
                          fontWeight: '600',
                          backgroundColor: '#eff6ff',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '0.375rem'
                        }}>
                          {getDaysUntilEvent(event.startDate)}
                        </div>
                      )}
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
                        <span>{formatDate(event.startDate)}</span>
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
                        <span>{event.location}</span>
                      </div>
                      {event.price && (
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
                            attach_money
                          </span>
                          <span style={{ fontWeight: '500', color: '#059669' }}>${event.price}</span>
                        </div>
                      )}
                      {event.capacity && (
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
                          <span>{event.registeredCount || 0}/{event.capacity} registered</span>
                        </div>
                      )}
                      {(event.type === 'bazaar' || event.type === 'booth') && (
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
                            storefront
                          </span>
                          <span>{(event.vendors && event.vendors.length) || 0} vendor{((event.vendors && event.vendors.length) || 0) !== 1 ? 's' : ''} participating</span>
                        </div>
                      )}
                      {(event.type === 'workshop' || event.type === 'conference') && (
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
                            school
                          </span>
                          <span>
                            {event.professors 
                              ? (Array.isArray(event.professors) ? event.professors.join(', ') : event.professors)
                              : (event.creatorName || 'Professor')
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {event.description && (
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
                        {event.description}
                      </p>
                    )}

                    {/* Bottom Section: Rating Display */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      {/* Average Rating Display - Bottom Left (Clickable to view ratings/comments for ALL events) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewRatingsComments(event.id, event.title);
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

                    {(event.type === 'workshop' || event.type === 'trip') && (
                          isRegistered ? (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#10b981',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'not-allowed',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            marginTop: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check_circle</span>
                          Registered
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterClick(event);
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
                            transition: 'all 0.2s',
                            marginTop: 'auto',
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
                          Register for {event.type === 'workshop' ? 'Workshop' : 'Trip'}
                        </button>
                      )
                    )}
                  </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </main>

      {/* Event Modal */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
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
              overflow: 'hidden'
            }}
          >
            {/* Event Image at Top with Close Button Overlay */}
            <div style={{ position: 'relative' }}>
              {getEventTypeImage(selectedEvent.type) && (
            <div style={{
                  width: '100%',
                  height: '200px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#f3f4f6',
                  flexShrink: 0
                }}>
                  <img
                    src={getEventTypeImage(selectedEvent.type)}
                    alt={selectedEvent.type ? selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1) : 'Event'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.backgroundColor = getEventTypeColor(selectedEvent.type);
                      e.target.parentElement.style.display = 'flex';
                      e.target.parentElement.style.alignItems = 'center';
                      e.target.parentElement.style.justifyContent = 'center';
                      if (!e.target.parentElement.querySelector('.fallback-text')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-text';
                        fallback.textContent = getEventTypeFallbackText(selectedEvent.type);
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
                onClick={() => setSelectedEvent(null)}
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
                {selectedEvent.title}
              </h2>
            </div>
            
            <div style={{ 
              padding: '1rem 1.5rem 1.5rem 1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
              <div style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                backgroundColor: getEventTypeColor(selectedEvent.type),
                color: '#FFFFFF',
                fontSize: '0.6875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-block',
                marginBottom: '1.5rem'
              }}>
                {selectedEvent.type}
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
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Start Date</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.startDate)}</div>
                  </div>
                </div>
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
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.endDate)}</div>
                  </div>
                </div>
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
                    <div style={{ color: '#374151', fontWeight: '500' }}>{selectedEvent.location}</div>
                  </div>
                </div>
                {selectedEvent.registrationDeadline && (
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
                      <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.registrationDeadline)}</div>
                    </div>
                  </div>
                )}
                {selectedEvent.price && (
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
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Price</div>
                      <div style={{ color: '#059669', fontWeight: '600' }}>${selectedEvent.price}</div>
                    </div>
                  </div>
                )}
                {selectedEvent.capacity && (
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
                      <div style={{ color: '#374151', fontWeight: '500' }}>{selectedEvent.registeredCount || 0}/{selectedEvent.capacity} registered</div>
                    </div>
                  </div>
                )}
                {(selectedEvent.type === 'bazaar' || selectedEvent.type === 'booth') && (
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
                      <div style={{ color: '#374151', fontWeight: '500' }}>{(selectedEvent.vendors && selectedEvent.vendors.length) || 0} vendor{((selectedEvent.vendors && selectedEvent.vendors.length) || 0) !== 1 ? 's' : ''} participating</div>
                    </div>
                  </div>
                )}
                {(selectedEvent.type === 'workshop' || selectedEvent.type === 'conference') && (
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
                        {selectedEvent.professors 
                          ? (Array.isArray(selectedEvent.professors) ? selectedEvent.professors.join(', ') : selectedEvent.professors)
                          : (selectedEvent.creatorName || 'Professor')
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {((selectedEvent.type === 'bazaar' || selectedEvent.type === 'booth') && selectedEvent.vendors && selectedEvent.vendors.length > 0) ? (
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
                    Participating Vendors ({selectedEvent.vendors.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {selectedEvent.vendors.map((vendor, idx) => (
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
                        {selectedEvent.type === 'booth' && vendor.boothSize && (
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

              {selectedEvent.description && (
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
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {(selectedEvent.type === 'workshop' || selectedEvent.type === 'trip') && (
                registeredEventIds.has(String(selectedEvent.id)) ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#10b981',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'not-allowed',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check_circle</span>
                    Registered
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegisterClick(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
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
                    Register for {selectedEvent.type === 'workshop' ? 'Workshop' : 'Trip'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegistrationForm && registrationEvent && (
        <div
          onClick={handleCloseRegistrationForm}
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
              borderRadius: '0.5rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <StudentRegistrationForm
              event={registrationEvent}
              onClose={handleCloseRegistrationForm}
              onSuccess={handleRegistrationSuccess}
            />
          </div>
        </div>
      )}

      {/* Workshop Edit Request Modal */}
      {showWorkshopEditModal && selectedWorkshop && (
        <WorkshopEditRequestModal
          open={showWorkshopEditModal}
          onClose={handleCloseWorkshopEditModal}
          workshop={selectedWorkshop}
          onSubmitted={handleCloseWorkshopEditModal}
        />
      )}

      {/* View All Ratings and Comments Modal - VIEW ONLY (no forms) */}
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

                  {/* Rate/Comment Forms - ONLY for Past Events Student Attended */}
                  {selectedEventForView && (() => {
                    const eventDate = selectedEventForView.eventDate;
                    const eventEndDate = selectedEventForView.eventEndDate;
                    const isPast = hasEventPassed(eventDate, eventEndDate);
                    const attended = didStudentAttend(selectedEventForView.eventId);
                    return isPast && attended;
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
                              await handleSubmitRating(selectedEventForView.eventId);
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
                              await handleSubmitComment(selectedEventForView.eventId);
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
                                {formatDate(comment.createdAt)}
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

export default StudentEventsView;
