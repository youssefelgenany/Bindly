import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gymApiService } from '../api/gymApi';
import { gymSessionApi } from '../api/gymSessionApi';
import { notificationApiService } from '../api/notificationApi';
import EventsOfficeNotificationBell from './EventsOfficeNotificationBell';
import GymSessionForm from '../components/GymSessionForm';
import GymSessionRegistrationForm from '../components/GymSessionRegistrationForm';

const TYPES = ['yoga', 'pilates', 'aerobics', 'zumba', 'cross circuit', 'kick-boxing', 'strength', 'cardio', 'other'];

const GymSchedule = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || (user?.userType === 'TA' ? 'TA' : user?.userType === 'Staff' ? 'Staff' : user?.userType === 'Professor' ? 'Professor' : user?.userType === 'Student' ? 'Student' : 'Events Office');

  // Determine portal branding and navigation based on user type
  const getPortalBranding = () => {
    if (user?.userType === 'TA') return 'TA Portal';
    if (user?.userType === 'Staff') return 'Staff Portal';
    if (user?.userType === 'Professor') return 'Professor Portal';
    if (user?.userType === 'Student') return 'Student Portal';
    return 'Events Office';
  };

  const getUserRole = () => {
    if (user?.userType === 'TA') return 'TA';
    if (user?.userType === 'Staff') return 'Staff';
    if (user?.userType === 'Professor') return 'Professor';
    if (user?.userType === 'Student') return 'Student';
    return 'Events Office';
  };

  const getEventsRoute = () => {
    if (user?.userType === 'TA' || user?.userType === 'Staff') return '/staff/events';
    if (user?.userType === 'Professor') return '/professor/events';
    if (user?.userType === 'Student') return '/student/events';
    return '/event-office';
  };

  const getMyEventsRoute = () => {
    if (user?.userType === 'TA' || user?.userType === 'Staff') return '/staff/my-registrations';
    if (user?.userType === 'Professor') return '/professor/my-registrations';
    if (user?.userType === 'Student') return '/student/my-registrations';
    return '/event-office';
  };

  const getLoyaltyRoute = () => {
    if (user?.userType === 'TA' || user?.userType === 'Staff') return '/staff/loyalty-vendors';
    if (user?.userType === 'Professor') return '/professor/loyalty-vendors';
    if (user?.userType === 'Student') return '/student/loyalty-vendors';
    return '/event-office/loyalty-program-vendors';
  };

  const getDashboardRoute = () => {
    return '/dashboard';
  };
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // User type checks
  const isEventsOffice = !user?.userType || (user.userType !== 'TA' && user.userType !== 'Staff' && user.userType !== 'Professor' && user.userType !== 'Student');
  const isProfessor = user?.userType === 'Professor';
  const showHorizontalMenu = user?.userType === 'Student' || user?.userType === 'Staff' || user?.userType === 'TA';
  const canSeeNotifications = user?.userType === 'Professor' || user?.userType === 'Staff' || user?.userType === 'TA' || user?.userType === 'Student';
  const useFixedHeader = true;

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

  // Load notifications (for staff and professors)
  const loadNotifications = useCallback(async () => {
    if (!user?.userType || (user.userType !== 'Professor' && user.userType !== 'Staff' && user.userType !== 'TA')) return;
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
  }, [user]);

  // Load notifications on mount and poll for updates (for staff/professors)
  useEffect(() => {
    if (user?.userType === 'Professor' || user?.userType === 'Staff' || user?.userType === 'TA') {
      loadNotifications();
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [loadNotifications, user]);

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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // month state is 0-11 (JS Date). Backend expects 1-12 — send month + 1.
      const res = await gymApiService.getMonthlySessions(year, month + 1);
      if (res.success) {
        // Ensure sessions is an array and filter out invalid sessions
        const sessionsData = res.data.sessions || [];
        const validSessions = sessionsData.filter(s => s && s.date);
        setSessions(validSessions);
      } else {
        setError(res.message || 'Failed to load gym sessions');
      }
    } catch (error) {
      console.error('Error loading gym sessions:', error);
      setError('Failed to load gym sessions');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // Calendar calculations
  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startDay = useMemo(() => firstOfMonth.getDay(), [firstOfMonth]);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group sessions by date (YYYY-MM-DD format)
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      // Skip sessions with invalid data
      if (!s || !s.date) continue;
      
      if (typeFilter !== 'all' && (s.type || '').toLowerCase() !== typeFilter.toLowerCase()) continue;
      
      try {
        const d = new Date(s.date);
        // Skip if date is invalid
        if (isNaN(d.getTime())) continue;
        
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD format
        if (!map[key]) map[key] = [];
        map[key].push(s);
      } catch (error) {
        console.warn('Invalid session data:', s, error);
        continue;
      }
    }
    return map;
  }, [sessions, typeFilter]);

  const formatDateKey = (y, m, day) => {
    const date = new Date(y, m, day);
    return date.toISOString().slice(0, 10);
  };

  // Get color for session type
  const getSessionTypeColor = (type) => {
    const typeLower = (type || '').toLowerCase();
    const colors = {
      'yoga': '#A7F3D0', // light green
      'pilates': '#E9D5FF', // light purple
      'zumba': '#FED7AA', // light orange
      'aerobics': '#FBCFE8', // light pink
      'cross circuit': '#BFDBFE', // light blue
      'kick-boxing': '#FECACA', // light red/pink
      'strength': '#DDD6FE', // light indigo
      'cardio': '#FDE68A', // light yellow
      'other': '#E5E7EB' // light gray
    };
    return colors[typeLower] || colors['other'];
  };

  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });

  const shiftMonth = (delta) => {
    const n = new Date(year, month + delta, 1);
    setYear(n.getFullYear());
    setMonth(n.getMonth());
  };


  // Handle gym session creation
  const handleGymSessionCreate = async (formData) => {
    try {
      setCreating(true);
      const response = await gymSessionApi.create(formData);
      if (response.success) {
        await load(); // Reload sessions
        setIsCreateModalOpen(false);
      } else {
        alert(response.message || 'Failed to create gym session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create gym session:', error);
      alert('Failed to create gym session. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (session) => {
    // Format date for input (YYYY-MM-DD)
    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toISOString().split('T')[0];
    
    // Format time for input (HH:MM)
    let formattedTime = '';
    if (session.time) {
      const timeStr = String(session.time);
      if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      } else {
        formattedTime = timeStr;
      }
    }

    setEditingSession({
      ...session,
      date: formattedDate,
      time: formattedTime,
      duration: session.duration || session.durationMinutes || 60
    });
    setIsEditModalOpen(true);
  };

  // Handle edit submission
  const handleGymSessionUpdate = async (formData) => {
    if (!editingSession) return;
    
    try {
      setUpdating(true);
      const updateData = {
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration) || editingSession.duration
      };
      
      const response = await gymSessionApi.update(editingSession._id || editingSession.id, updateData);
      if (response.success) {
        await load(); // Reload sessions
        setIsEditModalOpen(false);
        setEditingSession(null);
      } else {
        alert(response.message || 'Failed to update gym session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update gym session:', error);
      alert('Failed to update gym session. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle cancel button click
  const handleCancelClick = (session) => {
    setCancellingSession(session);
    setIsCancelModalOpen(true);
  };

  // Handle cancel confirmation
  const handleGymSessionCancel = async () => {
    if (!cancellingSession) return;
    
    try {
      setCancelling(true);
      const response = await gymSessionApi.update(cancellingSession._id || cancellingSession.id, {
        status: 'cancelled'
      });
      if (response.success) {
        await load(); // Reload sessions
        setIsCancelModalOpen(false);
        setCancellingSession(null);
      } else {
        alert(response.message || 'Failed to cancel gym session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to cancel gym session:', error);
      alert('Failed to cancel gym session. Please try again.');
    } finally {
      setCancelling(false);
    }
  };


  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
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
        transition: 'width 0.3s ease, padding 0.3s ease',
        minWidth: sidebarOpen ? '16rem' : '0'
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
                {isEventsOffice ? (
                  <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>school</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  {isEventsOffice ? 'Events Office' : getPortalBranding()}
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
                to="/event-office"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office')) {
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
                to="/event-office/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/event-office/workshops"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  school
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Professor Workshops
                </p>
              </Link>

              <Link
                to="/event-office/vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
                </p>
              </Link>

              <Link
                to="/event-office/loyalty-program-vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/loyalty-program-vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-program-vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-program-vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  card_giftcard
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-program-vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
                </p>
              </Link>

              <Link
                to="/event-office/platform-booth-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/platform-booth-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
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
                  textDecoration: 'none'
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
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  calendar_month
                </span>
                <p style={{
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  View Gym Sessions
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? '0' : (sidebarOpen ? '16rem' : '0'),
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2.5rem',
        backgroundColor: '#1D3557',
        zIndex: useFixedHeader ? 100 : 'auto',
        transition: useFixedHeader ? 'left 0.3s ease' : 'none'
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
            {user?.userType !== 'Student' && user?.userType !== 'TA' && user?.userType !== 'Staff' && user?.userType !== 'Professor' && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            )}
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
          
          {/* Centered Navigation Menu - For Students, TA, Staff, and Professor */}
          {(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') && (
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
                  color: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor')
                    ? (isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)')
                    : (isActiveRoute('/dashboard') ? '#2563eb' : '#6b7280'),
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
                  paddingBottom: '0.5rem',
                  borderBottom: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor')
                    ? (isActiveRoute('/dashboard') ? '2px solid #FFFFFF' : '2px solid transparent')
                    : (isActiveRoute('/dashboard') ? '2px solid #2563eb' : '2px solid transparent'),
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
              {user?.userType === 'Student' && (
                <>
                  <Link
                    to="/student/events"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/student/events') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/student/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                    to="/student/my-registrations"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/student/my-registrations') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/student/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                    to="/student/courts"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/student/courts') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/student/courts') ? '2px solid #FFFFFF' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      sports_tennis
                    </span>
                    Campus Courts
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
                </>
              )}
              {user?.userType === 'TA' && (
                <>
                  <Link
                    to="/ta/events"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/ta/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/ta/events') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/ta/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                    to="/ta/my-registrations"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/ta/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/ta/my-registrations') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/ta/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                      color: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                </>
              )}
              {user?.userType === 'Staff' && (
                <>
                  <Link
                    to="/staff/events"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/staff/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/staff/events') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/staff/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                      color: isActiveRoute('/staff/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/staff/my-registrations') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/staff/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                      color: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                </>
              )}
              {user?.userType === 'Professor' && (
                <>
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
                    to="/gym"
                    style={{
                      textDecoration: 'none',
                      color: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      fontWeight: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '600' : '500',
                      paddingBottom: '0.5rem',
                      borderBottom: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                </>
              )}
            </nav>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
            {/* Heart Icon - Favorites (For Students, TA, Staff, and Professor) */}
            {(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') && (
              <Link
                to={
                  user?.userType === 'Student' ? '/student/favorites' :
                  user?.userType === 'TA' ? '/ta/favorites' :
                  user?.userType === 'Staff' ? '/staff/favorites' :
                  '/professor/favorites'
                }
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
                  e.currentTarget.style.backgroundColor = (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: '1.5rem',
                  color: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? '#FFFFFF' : '#1D3557'
                }}>
                  favorite
                </span>
              </Link>
            )}
            
            {/* Notifications Bell */}
            {/* Notifications Bell - Only for non-Events Office users */}
            {!isEventsOffice && (
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
                    e.target.style.backgroundColor = (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.5rem',
                    color: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? '#FFFFFF' : '#1D3557'
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
                                navigate(getEventsRoute());
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                                navigate(getMyEventsRoute());
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            // Navigate to Loyalty Partners page
                            navigate(getLoyaltyRoute());
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
            )}
            
            {/* Events Office Notification Bell */}
            {isEventsOffice && (
              <EventsOfficeNotificationBell />
            )}
            
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
                {isEventsOffice ? 'Events Office' : getUserRole()}
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
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1D3557',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {displayName.charAt(0).toUpperCase()}
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
        marginLeft: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? '0' : (sidebarOpen ? '16rem' : '0'),
        marginTop: '73px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'margin-left 0.3s ease'
      }}>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isProfessor ? '2rem 0' : '1rem',
          paddingLeft: isProfessor ? '4rem' : '6rem',
          paddingRight: isProfessor ? '4rem' : '6rem',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(30px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div 
            className={(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'banner-animate' : ''}
            style={{
              position: 'relative',
              height: '140px',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transition: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'transform 0.3s ease, box-shadow 0.3s ease' : 'none',
              animation: isEventsOffice ? 'fadeInUp 0.6s ease-out' : 'none'
            }}
            onMouseEnter={(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? (e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            } : undefined}
            onMouseLeave={(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            } : undefined}
          >
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/gym.jpg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)',
              animation: (user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'pulse 4s ease-in-out infinite' : (isEventsOffice ? 'pulse 4s ease-in-out infinite' : 'none')
            }}></div>
            {/* Blue Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)'
            }}></div>
            {/* Animated Pattern Overlay - For Students, TA, Staff, and Professor */}
            {(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                animation: 'pulse 4s ease-in-out infinite',
                zIndex: 1,
                pointerEvents: 'none'
              }}></div>
            )}
            {/* Floating Decorative Elements - For Events Office */}
            {isEventsOffice && (
              <>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '50px',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  animation: 'float 3s ease-in-out infinite',
                  zIndex: 5
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '100px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  animation: 'float 2.5s ease-in-out infinite 0.5s',
                  zIndex: 5
                }}></div>
              </>
            )}
            {/* Content */}
            <div 
              className={(user?.userType === 'Student' || user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Professor') ? 'banner-content-animate' : ''}
              style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '2rem 2.5rem',
                color: '#FFFFFF'
              }}
            >
              <div>
                <h3 style={{
                  color: '#FFFFFF',
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: '0.5rem',
                  animation: isEventsOffice ? 'slideInRight 0.8s ease-out' : 'none'
                }}>
                  Gym Schedule
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  margin: 0,
                  animation: isEventsOffice ? 'slideInRight 0.8s ease-out 0.2s both' : 'none'
                }}>
                  View sessions for the selected month
                </p>
              </div>
              {isEventsOffice && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#FFFFFF',
                    color: '#1D3557',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    height: 'fit-content'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    add
                  </span>
                  Create
                </button>
              )}
            </div>
          </div>

          {/* Filter and Navigation Toolbar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => shiftMonth(-1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  padding: '0.25rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#374151';
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>‹</span>
              </button>
              <div style={{
                fontWeight: '500',
                color: '#1D3557',
                fontSize: '1rem',
                textAlign: 'center',
                minWidth: '10rem'
              }}>
                {monthName} {year}
              </div>
              <button
                onClick={() => shiftMonth(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  padding: '0.25rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#374151';
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>›</span>
              </button>
            </div>

            {/* Type Filter - Horizontal Buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              flexWrap: 'nowrap',
              flexShrink: 0
            }}>
              {['all', ...TYPES].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: typeFilter === t ? '#1e40af' : '#f9fafb',
                    color: typeFilter === t ? '#FFFFFF' : '#6b7280',
                    border: typeFilter === t ? 'none' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: typeFilter === t ? '600' : '500',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                    boxShadow: typeFilter === t ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (typeFilter !== t) {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (typeFilter !== t) {
                      e.target.style.backgroundColor = '#f9fafb';
                      e.target.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
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
                Loading schedule...
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
                Failed to load gym sessions
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
                onClick={load}
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
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '1rem'
            }}>
              {/* Calendar Grid */}
              {/* Day Headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '0.5rem 0.375rem',
                marginBottom: '0.375rem'
              }}>
                {daysOfWeek.map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#1D3557',
                      fontSize: '0.75rem',
                      padding: '0.375rem'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '0.5rem 0.375rem'
              }}>
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      minHeight: '6.5rem',
                      backgroundColor: '#f8f6f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '0.375rem'
                    }}
                  />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const key = formatDateKey(year, month, day);
                  const daySessions = sessionsByDate[key] || [];
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                  return (
                    <div
                      key={key}
                      style={{
                        minHeight: '6.5rem',
                        backgroundColor: isToday ? '#e0e7ff' : '#FFFFFF',
                        border: isToday ? '2px solid #1e40af' : '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        padding: '0.375rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        position: 'relative'
                      }}
                    >
                      {/* Day Number */}
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: isToday ? '600' : '500',
                        color: isToday ? '#1e40af' : '#1D3557',
                        marginBottom: '0.125rem'
                      }}>
                        {day}
                      </div>

                      {/* Sessions for this day */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        flex: 1,
                        overflowY: 'auto'
                      }}>
                        {daySessions.length === 0 ? (
                          <div style={{
                            fontSize: '0.625rem',
                            color: '#9ca3af',
                            textAlign: 'center',
                            marginTop: '0.125rem'
                          }}>
                            No sessions
                          </div>
                        ) : (
                          daySessions.map((s, sessionIdx) => {
                            try {
                              if (!s) return null;
                              
                              // Determine start time
                              let start = null;
                              if (s.startTime) {
                                start = new Date(s.startTime);
                                if (isNaN(start.getTime())) start = null;
                              }
                              if (!start && s.time) {
                                const sessionDate = new Date(s.date);
                                const [hh = '0', mm = '0'] = String(s.time).split(':');
                                start = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), parseInt(hh, 10) || 0, parseInt(mm, 10) || 0);
                              }

                              const typeLabel = s.title || (s.type ? (s.type.charAt(0).toUpperCase() + s.type.slice(1)) : 'Session');
                              const timeStr = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
                              const sessionType = s.type || 'other';
                              const sessionColor = getSessionTypeColor(sessionType);

                              // Check if user can register (not Events Office)
                              const canRegister = user?.userType && ['Student', 'Staff', 'TA', 'Professor'].includes(user.userType);
                              // Check if session is active and not in the past
                              const sessionDate = new Date(s.date);
                              const [hh = '0', mm = '0'] = String(s.time || '00:00').split(':');
                              const sessionDateTime = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), parseInt(hh, 10) || 0, parseInt(mm, 10) || 0);
                              const isFuture = sessionDateTime > new Date();
                              const isActive = s.status === 'active';
                              const isCancelled = s.status === 'cancelled';
                              return (
                                <div
                                  key={s._id || s.id || sessionIdx}
                                  style={{
                                    backgroundColor: isCancelled ? '#f3f4f6' : sessionColor,
                                    color: isCancelled ? '#9ca3af' : '#1D3557',
                                    borderRadius: '0.25rem',
                                    padding: '0.25rem 0.375rem',
                                    fontSize: '0.625rem',
                                    cursor: (canRegister && isActive && isFuture && !isCancelled && !isEventsOffice) ? 'pointer' : 'default',
                                    transition: 'opacity 0.2s, transform 0.2s',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    position: 'relative',
                                    opacity: isCancelled ? 0.6 : 1
                                  }}
                                  onClick={() => {
                                    if (canRegister && isActive && isFuture) {
                                      setSelectedSession(s);
                                      setIsRegistrationModalOpen(true);
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    if (canRegister && isActive && isFuture && !isCancelled && !isEventsOffice) {
                                      e.target.style.opacity = '0.9';
                                      e.target.style.transform = 'scale(1.02)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (canRegister && isActive && isFuture && !isCancelled && !isEventsOffice) {
                                      e.target.style.opacity = '1';
                                      e.target.style.transform = 'scale(1)';
                                    } else if (!isEventsOffice && isCancelled) {
                                      e.target.style.opacity = '0.6';
                                      e.target.style.transform = 'scale(1)';
                                    }
                                  }}
                                  title={canRegister && isActive && isFuture && !isCancelled ? `Click to register for ${typeLabel} at ${timeStr}` : `${typeLabel} at ${timeStr}${isCancelled ? ' (Cancelled)' : ''}`}
                                >
                                  <div style={{
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginBottom: '0.0625rem'
                                  }}>
                                    {typeLabel}
                                  </div>
                                  <div style={{
                                    fontSize: '0.5625rem',
                                    opacity: 0.8,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {timeStr}
                                  </div>
                                  {isEventsOffice && !isCancelled && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '0.3rem',
                                        marginTop: '0.15rem',
                                        justifyContent: 'flex-end'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(s);
                                        }}
                                        style={{
                                          background: '#f8fafc',
                                          border: '1px solid #cbd5f5',
                                          borderRadius: '0.3125rem',
                                          padding: '0.2rem 0.35rem',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#1e3a8a',
                                          transition: 'background 0.2s, border-color 0.2s'
                                        }}
                                        title="Edit session"
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#eef2ff';
                                          e.currentTarget.style.borderColor = '#a5b4fc';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#f8fafc';
                                          e.currentTarget.style.borderColor = '#cbd5f5';
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                                          edit_square
                                        </span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelClick(s);
                                        }}
                                        style={{
                                          background: '#fff5f5',
                                          border: '1px solid #fecaca',
                                          borderRadius: '0.3125rem',
                                          padding: '0.2rem 0.35rem',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#b91c1c',
                                          transition: 'background 0.2s, border-color 0.2s'
                                        }}
                                        title="Cancel session"
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#fee2e2';
                                          e.currentTarget.style.borderColor = '#fecaca';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#fff5f5';
                                          e.currentTarget.style.borderColor = '#fecaca';
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (error) {
                              console.warn('Error rendering session:', s, error);
                              return null;
                            }
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Registration Modal */}
      {isRegistrationModalOpen && selectedSession && (
        <GymSessionRegistrationForm
          gymSession={selectedSession}
          onClose={() => {
            setIsRegistrationModalOpen(false);
            setSelectedSession(null);
          }}
          onSuccess={(result) => {
            console.log('Registration successful:', result);
            // Reload sessions to update the display
            load();
          }}
        />
      )}

      {/* Create Gym Session Modal */}
      {isCreateModalOpen && isEventsOffice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setIsCreateModalOpen(false);
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1D3557',
                margin: 0
              }}>
                Create Gym Session
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              <GymSessionForm
                onSubmit={handleGymSessionCreate}
                loading={creating}
                submitLabel="Create Gym Session"
                loadingLabel="Creating..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Gym Session Modal */}
      {isEditModalOpen && editingSession && isEventsOffice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setIsEditModalOpen(false);
          setEditingSession(null);
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '500px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1D3557',
                margin: 0
              }}>
                Edit Gym Session
              </h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSession(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleGymSessionUpdate({
                  date: formData.get('date'),
                  time: formData.get('time'),
                  duration: formData.get('duration')
                });
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingSession.date}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      color: '#1D3557'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingSession.time}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      color: '#1D3557'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue={editingSession.duration}
                    min="1"
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      color: '#1D3557'
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingSession(null);
                    }}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      backgroundColor: '#1e40af',
                      color: '#FFFFFF',
                      cursor: updating ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      opacity: updating ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!updating) {
                        e.target.style.backgroundColor = '#1e3a8a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!updating) {
                        e.target.style.backgroundColor = '#1e40af';
                      }
                    }}
                  >
                    {updating ? 'Updating...' : 'Update Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Gym Session Confirmation Modal */}
      {isCancelModalOpen && cancellingSession && isEventsOffice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setIsCancelModalOpen(false);
          setCancellingSession(null);
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '500px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Warning */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span className="material-symbols-outlined" style={{ 
                fontSize: '1.5rem',
                color: '#d97706'
              }}>
                warning
              </span>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#92400e',
                margin: 0
              }}>
                Cancel Gym Session
              </h2>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              padding: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                Are you sure you want to cancel this gym session? All registered participants will be notified via email.
              </p>
              
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  marginBottom: '0.5rem'
                }}>
                  {cancellingSession.title || (cancellingSession.type ? cancellingSession.type.charAt(0).toUpperCase() + cancellingSession.type.slice(1) : 'Gym Session')}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Date: {new Date(cancellingSession.date).toLocaleDateString()}
                </div>
                {cancellingSession.time && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    Time: {String(cancellingSession.time).substring(0, 5)}
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    setCancellingSession(null);
                  }}
                  disabled={cancelling}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    cursor: cancelling ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: cancelling ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!cancelling) {
                      e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!cancelling) {
                      e.target.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  Keep Session
                </button>
                <button
                  type="button"
                  onClick={handleGymSessionCancel}
                  disabled={cancelling}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#FFFFFF',
                    cursor: cancelling ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: cancelling ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!cancelling) {
                      e.target.style.backgroundColor = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!cancelling) {
                      e.target.style.backgroundColor = '#dc2626';
                    }
                  }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

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
        .banner-animate {
          animation: fadeInUp 0.6s ease-out;
        }
        .banner-content-animate {
          animation: slideInLeft 1s ease-out 0.2s both;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GymSchedule;
