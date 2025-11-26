import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { notificationApiService } from '../api/notificationApi';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState({
        enrolledEvents: 0,
        upcomingEvents: 0,
        eventsRequiringAction: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
    const [upcomingEventsPreview, setUpcomingEventsPreview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, [user]);

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

    const eventTypeImages = {
        conference: '/assets/images/conference-background.jpg',
        workshop: '/assets/images/workshop-background.jpg',
        bazaar: '/assets/images/bazaar-background.jpg',
        trip: '/assets/images/trip-background.png',
        booth: '/assets/images/booth-background.jpg',
        other: '/assets/images/events-banner.jpeg'
    };

    const getEventPreviewImage = (registration) => {
        const banner = registration.event?.bannerFile || registration.event?.banner;
        if (banner) {
            return banner.startsWith('http') ? banner : `http://localhost:5000${banner}`;
        }
        const type = (registration.event?.type || registration.eventType || '').toLowerCase();
        return eventTypeImages[type] || eventTypeImages.other;
    };

    const formatEventDateLabel = (dateString) => {
        if (!dateString) return 'Date to be announced';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return 'Date to be announced';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getPriceLabel = (price) => {
        if (price === 0 || price === '0' || price === 'Free') return 'Free';
        if (!price) return 'Included';
        const numeric = parseFloat(price);
        if (!Number.isNaN(numeric) && numeric > 0) {
            return `from $${numeric}`;
        }
        return price;
    };

    const getRatingSummary = (registration) => {
        const rating = registration.event?.averageRating ??
            registration.event?.rating?.average ??
            registration.event?.average ??
            registration.event?.rating ??
            null;
        const ratingCount = registration.event?.ratingCount ??
            registration.event?.rating?.count ??
            registration.event?.ratingsCount ??
            registration.event?.registeredCount ??
            registration.registeredCount ??
            0;
        return {
            rating: rating && rating > 0 ? Math.min(Math.max(rating, 0), 5) : null,
            ratingCount
        };
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch student registrations
            if (user?.email) {
                console.log('Loading dashboard data for user:', user.email);
                const registrationsRes = await studentRegistrationApi.getMyRegistrations(user.email);
                console.log('Registrations API response:', registrationsRes);
                
                // Handle different response formats
                let registrations = [];
                if (registrationsRes.success) {
                    // The API returns { success: true, data: response.data }
                    // where response.data is { success: true, registrations: [...] }
                    // So we need to check registrationsRes.data.registrations
                    registrations = registrationsRes.data?.registrations || 
                                   registrationsRes.data?.data?.registrations ||
                                   (Array.isArray(registrationsRes.data) ? registrationsRes.data : []) ||
                                   [];
                    console.log('Extracted registrations:', registrations.length, registrations);
                } else {
                    console.error('Failed to fetch registrations:', registrationsRes.message);
                }

                const now = new Date();
                console.log('Total registrations found:', registrations.length);
                
                // Filter upcoming events - check both eventDate and event.startDate
                const upcoming = registrations.filter(reg => {
                    const eventDate = reg.eventDate || reg.event?.startDate || reg.event?.eventDate;
                    if (!eventDate) return false;
                    const date = new Date(eventDate);
                    return !isNaN(date.getTime()) && date > now;
                });
                console.log('Upcoming events:', upcoming.length);

                const previewCards = upcoming
                    .slice()
                    .sort((a, b) => {
                        const dateA = new Date(a.eventDate || a.event?.startDate || 0);
                        const dateB = new Date(b.eventDate || b.event?.startDate || 0);
                        return dateA - dateB;
                    })
                    .slice(0, 4)
                    .map((reg) => {
                        const eventDate = reg.eventDate || reg.event?.startDate || reg.event?.eventDate;
                        const { rating, ratingCount } = getRatingSummary(reg);
                        return {
                            id: reg.id || reg._id,
                            title: reg.eventTitle || reg.event?.title || 'Upcoming Event',
                            subtitle: reg.event?.location || reg.event?.faculty || reg.event?.type || 'On Campus',
                            dateLabel: formatEventDateLabel(eventDate),
                            image: getEventPreviewImage(reg),
                            rating,
                            ratingCount,
                            priceLabel: getPriceLabel(reg.event?.price || reg.event?.cost || reg.price),
                            typeLabel: reg.event?.type || reg.eventType || 'Event'
                        };
                    });
                setUpcomingEventsPreview(previewCards);

                // Calculate stats
                const enrolledCount = registrations.length;
                const upcomingCount = upcoming.length;
                const actionRequiredCount = registrations.filter(reg => {
                    const status = (reg.status || '').toLowerCase();
                    return status === 'pending' || status === 'payment_required' || status === 'payment_pending';
                }).length;
                
                console.log('Calculated stats:', { enrolledCount, upcomingCount, actionRequiredCount });
                
                setStats({
                    enrolledEvents: enrolledCount,
                    upcomingEvents: upcomingCount,
                    eventsRequiringAction: actionRequiredCount
                });

                // Generate recent activity from registrations
                const activities = registrations
                    .filter(reg => reg.registeredAt) // Only include registrations with a date
                    .sort((a, b) => {
                        const dateA = new Date(a.registeredAt || 0);
                        const dateB = new Date(b.registeredAt || 0);
                        return dateB - dateA;
                    })
                    .slice(0, 3)
                    .map(reg => ({
                        id: reg.id || reg._id,
                        type: 'enrollment',
                        message: `You enrolled in "${reg.eventTitle || reg.event?.title || 'an event'}".`,
                        time: formatTimeAgo(reg.registeredAt),
                        icon: 'how_to_reg',
                        iconBg: 'bg-green-100 dark:bg-green-900/50',
                        iconColor: 'text-green-600 dark:text-green-400'
                    }));

                // Add action required activity if any
                const actionRequired = registrations.find(reg => {
                    const status = (reg.status || '').toLowerCase();
                    return status === 'pending' || status === 'payment_required' || status === 'payment_pending';
                });
                if (actionRequired) {
                    activities.unshift({
                        id: 'action-required',
                        type: 'action',
                        message: `Action required: Please submit your payment for the "${actionRequired.eventTitle || actionRequired.event?.title || 'event'}".`,
                        time: '1 day ago',
                        icon: 'error',
                        iconBg: 'bg-orange-100 dark:bg-orange-900/50',
                        iconColor: 'text-orange-600 dark:text-orange-400'
                    });
                }

                console.log('Recent activities:', activities);
                setRecentActivity(activities.slice(0, 3));

                // Generate upcoming deadlines from upcoming events
                const deadlines = upcoming
                    .map(reg => {
                        const eventDate = reg.eventDate || reg.event?.startDate || reg.event?.eventDate;
                        if (!eventDate) return null;
                        const date = new Date(eventDate);
                        if (isNaN(date.getTime())) return null;
                        
                        const timeDiff = date.getTime() - now.getTime();
                        const isUrgent = timeDiff < 7 * 24 * 60 * 60 * 1000;
                        
                        return {
                            id: reg.id || reg._id,
                            month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                            day: date.getDate(),
                            title: reg.eventTitle || reg.event?.title || 'Event',
                            description: 'Event date',
                            color: isUrgent 
                                ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300'
                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                        };
                    })
                    .filter(d => d !== null) // Remove invalid dates
                    .sort((a, b) => {
                        // Sort by actual date
                        const year = new Date().getFullYear();
                        const dateA = new Date(`${a.month} ${a.day}, ${year}`);
                        const dateB = new Date(`${b.month} ${b.day}, ${year}`);
                        return dateA - dateB;
                    })
                    .slice(0, 3);

                console.log('Upcoming deadlines:', deadlines);
                setUpcomingDeadlines(deadlines);
            } else {
                // Reset stats if no user email
                setStats({
                    enrolledEvents: 0,
                    upcomingEvents: 0,
                    eventsRequiringAction: 0
                });
                setRecentActivity([]);
                setUpcomingDeadlines([]);
                setUpcomingEventsPreview([]);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set empty data on error
            setStats({
                enrolledEvents: 0,
                upcomingEvents: 0,
                eventsRequiringAction: 0
            });
            setRecentActivity([]);
            setUpcomingDeadlines([]);
            setUpcomingEventsPreview([]);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Recently';
        const now = new Date();
        const past = new Date(dateString);
        const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return '1 day ago';
        return `${diffInDays} days ago`;
    };

    const handleLogout = (e) => {
        e.preventDefault();
        e.stopPropagation();
        logout();
        navigate('/login');
    };

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

    const displayName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user?.name || 'Student';

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
                        to="/student/events"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/student/events') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/student/events') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/student/events') ? '2px solid #2563eb' : '2px solid transparent',
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
                            color: isActiveRoute('/student/my-registrations') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/student/my-registrations') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/student/my-registrations') ? '2px solid #2563eb' : '2px solid transparent',
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
                            color: isActiveRoute('/student/courts') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/student/courts') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/student/courts') ? '2px solid #2563eb' : '2px solid transparent',
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
                    
                    {/* Heart Icon - Favorites */}
                    <Link
                        to="/student/favorites"
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
                        {/* Dashboard Banner with Background Image - Animated */}
                        <div style={{
                            position: 'relative',
                            height: '140px',
                            borderRadius: '0.75rem',
                            overflow: 'hidden',
                            marginBottom: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            animation: 'fadeInUp 0.6s ease-out'
                        }}>
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
                            @keyframes float {
                                0%, 100% { transform: translateY(0px); }
                                50% { transform: translateY(-10px); }
                            }
                            @keyframes pulse {
                                0%, 100% { transform: scale(1); opacity: 1; }
                                50% { transform: scale(1.05); opacity: 0.9; }
                            }
                            @keyframes shimmer {
                                0% { background-position: -1000px 0; }
                                100% { background-position: 1000px 0; }
                            }
                            @keyframes bounce {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-8px); }
                            }
                            @keyframes glow {
                                0%, 100% { 
                                    text-shadow: 0 2px 4px rgba(255, 215, 0, 0.3), 0 0 10px rgba(255, 215, 0, 0.2);
                                }
                                50% { 
                                    text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.4);
                                }
                            }
                            @keyframes slideInRight {
                                from {
                                    opacity: 0;
                                    transform: translateX(30px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateX(0);
                                }
                            }
                            @keyframes rotate {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                        {/* Background Image */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'url(/assets/images/dashboardimage.jpg)',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            filter: 'blur(2px)',
                            animation: 'pulse 4s ease-in-out infinite'
                        }}></div>
                        {/* Blue Overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(29, 53, 87, 0.75)'
                        }}></div>
                        {/* Floating Decorative Elements */}
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
                                marginBottom: '0.5rem',
                                animation: 'slideInRight 0.8s ease-out'
                            }}>
                                Welcome back, {displayName.split(' ')[0]}! 👋
                            </h3>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.875rem',
                                fontWeight: '400',
                                margin: 0,
                                animation: 'slideInRight 0.8s ease-out 0.2s both'
                            }}>
                                Overview of your events, registrations, and upcoming deadlines.
                            </p>
                        </div>
                    </div>

                        {/* Content */}
                        <div style={{
                            padding: '0 0 2rem 0'
                        }}>

                        {/* Animated WIR/GUC Ad - Exact Match to Photo */}
                        <div 
                            onClick={() => navigate('/student/loyalty-vendors')}
                            style={{
                                marginBottom: '1.5rem',
                                position: 'relative',
                                background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
                                borderRadius: '1.25rem',
                                padding: '4rem 3rem',
                                boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.12)',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                animation: 'fadeInUp 0.8s ease-out',
                                transition: 'all 0.3s ease',
                                animationDelay: '0.2s',
                                animationFillMode: 'both',
                                minHeight: '400px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(0, 0, 0, 0.18)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(0, 0, 0, 0.12)';
                            }}
                        >
                            {/* Animated Wavy German Flag Ribbons with Golden Triangles */}
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '-10%',
                                width: '120%',
                                height: '100px',
                                background: 'linear-gradient(90deg, #000000 0%, #000000 33.33%, #DC143C 33.33%, #DC143C 66.66%, #FFD700 66.66%, #FFD700 100%)',
                                clipPath: 'polygon(0 20%, 100% 0%, 100% 80%, 0 100%)',
                                animation: 'float 5s ease-in-out infinite',
                                opacity: 0.85,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                zIndex: 1
                            }}>
                                {/* Golden triangular shapes on ribbon */}
                                {[...Array(6)].map((_, i) => (
                                    <div key={`top-tri-${i}`} style={{
                                        position: 'absolute',
                                        left: `${15 + i * 15}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#FFD700',
                                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                        animation: `pulse ${2 + i * 0.3}s ease-in-out infinite ${i * 0.2}s`,
                                        opacity: 0.8
                                    }}></div>
                                ))}
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '-10%',
                                width: '120%',
                                height: '100px',
                                background: 'linear-gradient(90deg, #000000 0%, #000000 33.33%, #DC143C 33.33%, #DC143C 66.66%, #FFD700 66.66%, #FFD700 100%)',
                                clipPath: 'polygon(0 20%, 100% 0%, 100% 80%, 0 100%)',
                                animation: 'float 5s ease-in-out infinite 0.5s',
                                opacity: 0.85,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                zIndex: 1
                            }}>
                                {/* Golden triangular shapes on ribbon */}
                                {[...Array(6)].map((_, i) => (
                                    <div key={`bottom-tri-${i}`} style={{
                                        position: 'absolute',
                                        left: `${15 + i * 15}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#FFD700',
                                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                        animation: `pulse ${2 + i * 0.3}s ease-in-out infinite ${i * 0.3}s`,
                                        opacity: 0.8
                                    }}></div>
                                ))}
                            </div>

                            {/* Sparkles and Glow Effects */}
                            {[...Array(12)].map((_, i) => (
                                <div key={`sparkle-${i}`} style={{
                                    position: 'absolute',
                                    top: `${10 + (i % 4) * 25}%`,
                                    left: `${8 + (Math.floor(i / 4) * 30)}%`,
                                    width: i % 3 === 0 ? '8px' : '4px',
                                    height: i % 3 === 0 ? '8px' : '4px',
                                    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FFD700',
                                    borderRadius: '50%',
                                    boxShadow: i % 2 === 0 ? '0 0 8px rgba(255, 255, 255, 0.8)' : '0 0 10px rgba(255, 215, 0, 0.8)',
                                    animation: `pulse ${1.2 + (i * 0.15)}s ease-in-out infinite ${i * 0.1}s`,
                                    opacity: 0.8,
                                    zIndex: 2
                                }}></div>
                            ))}

                            <div style={{
                                position: 'relative',
                                zIndex: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                paddingTop: '2rem'
                            }}>
                                {/* Academic Icons - Positioned around WIR */}
                                {/* Graduation Cap - Top Left */}
                                <div style={{
                                    position: 'absolute',
                                    top: '20px',
                                    left: '15%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'transparent',
                                    stroke: '#FFD700',
                                    strokeWidth: '2',
                                    filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.4))',
                                    animation: 'float 4s ease-in-out infinite',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#FFD700',
                                        WebkitTextStroke: '2px #FFD700',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                                    }}>
                                        school
                                    </span>
                                </div>
                                {/* Graduation Cap - Top Right */}
                                <div style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '15%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.4))',
                                    animation: 'float 4s ease-in-out infinite 0.3s',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#FFD700',
                                        WebkitTextStroke: '2px #FFD700',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                                    }}>
                                        school
                                    </span>
                                </div>
                                {/* Building - Below W on Left */}
                                <div style={{
                                    position: 'absolute',
                                    top: '45%',
                                    left: '10%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))',
                                    animation: 'float 4s ease-in-out infinite 0.5s',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#2c2c2c',
                                        WebkitTextStroke: '2px #2c2c2c',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        account_balance
                                    </span>
                                </div>
                                {/* Globe - Above R on Right */}
                                <div style={{
                                    position: 'absolute',
                                    top: '25%',
                                    right: '12%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.4))',
                                    animation: 'float 4s ease-in-out infinite 0.7s',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#FFD700',
                                        WebkitTextStroke: '2px #FFD700',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                                    }}>
                                        public
                                    </span>
                                </div>
                                {/* Book - Above Globe */}
                                <div style={{
                                    position: 'absolute',
                                    top: '10%',
                                    right: '12%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.4))',
                                    animation: 'float 4s ease-in-out infinite 0.9s',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#FFD700',
                                        WebkitTextStroke: '2px #FFD700',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                                    }}>
                                        menu_book
                                    </span>
                                </div>
                                {/* Lightbulb - Below R on Right */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '10%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: 'drop-shadow(0 2px 6px rgba(220, 20, 60, 0.4))',
                                    animation: 'pulse 2.5s ease-in-out infinite',
                                    zIndex: 5
                                }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '2.5rem',
                                        color: '#DC143C',
                                        WebkitTextStroke: '2px #DC143C',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 4px rgba(220, 20, 60, 0.6))'
                                    }}>
                                        lightbulb
                                    </span>
                                </div>

                                {/* WIR Logo - Stylized with 3D Wavy Effect */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    marginBottom: '2rem',
                                    marginTop: '1rem',
                                    animation: 'fadeInUp 1s ease-out 0.3s both'
                                }}>
                                    {/* W Letter - Glossy Dark Grey/Black, Fluid Wavy */}
                                    <div style={{
                                        fontSize: '6.5rem',
                                        fontWeight: '800',
                                        fontFamily: 'Arial, sans-serif',
                                        background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 50%, #1a1a1a 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                                        animation: 'float 3.5s ease-in-out infinite',
                                        letterSpacing: '-0.08em',
                                        transform: 'perspective(500px) rotateY(-5deg)',
                                        position: 'relative'
                                    }}>
                                        W
                                    </div>
                                    {/* I Letter - Bold Vertical Brushstroke Red */}
                                    <div style={{
                                        fontSize: '6.5rem',
                                        fontWeight: '900',
                                        fontFamily: 'Arial, sans-serif',
                                        color: '#DC143C',
                                        textShadow: '0 4px 12px rgba(220, 20, 60, 0.4), 0 0 20px rgba(220, 20, 60, 0.2)',
                                        filter: 'drop-shadow(0 3px 6px rgba(220,20,60,0.5))',
                                        animation: 'pulse 2.2s ease-in-out infinite',
                                        letterSpacing: '-0.08em',
                                        position: 'relative',
                                        transform: 'scaleY(1.1)'
                                    }}>
                                        I
                                    </div>
                                    {/* R Letter - Glossy Golden/Bronze, Fluid Wavy */}
                                    <div style={{
                                        fontSize: '6.5rem',
                                        fontWeight: '800',
                                        fontFamily: 'Arial, sans-serif',
                                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        textShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                                        filter: 'drop-shadow(0 3px 6px rgba(255,215,0,0.5))',
                                        animation: 'float 3.5s ease-in-out infinite 0.4s',
                                        letterSpacing: '-0.08em',
                                        transform: 'perspective(500px) rotateY(5deg)',
                                        position: 'relative'
                                    }}>
                                        R
                                    </div>
                                </div>

                                {/* University Text */}
                                <div style={{
                                    marginBottom: '1.5rem',
                                    animation: 'fadeInUp 1s ease-out 0.6s both'
                                }}>
                                    <h3 style={{
                                        color: '#2c2c2c',
                                        fontSize: '1.75rem',
                                        fontWeight: '600',
                                        margin: 0,
                                        marginBottom: '0.5rem',
                                        letterSpacing: '0.03em',
                                        fontFamily: 'Arial, sans-serif'
                                    }}>
                                        German International University
                                    </h3>
                                    <p style={{
                                        color: '#FFD700',
                                        fontSize: '1.4rem',
                                        fontWeight: '600',
                                        margin: 0,
                                        textShadow: '0 2px 8px rgba(255, 215, 0, 0.3), 0 0 15px rgba(255, 215, 0, 0.2)',
                                        animation: 'glow 2.5s ease-in-out infinite',
                                        fontFamily: 'Arial, sans-serif',
                                        letterSpacing: '0.02em'
                                    }}>
                                        German University in Cairo
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Events Preview */}
                        {upcomingEventsPreview.length > 0 && (
                            <section style={{ marginBottom: '1.5rem' }}>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <h3 style={{
                                        color: '#1D3557',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        margin: 0
                                    }}>
                                        Upcoming Events
                                    </h3>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                                    gap: '0.85rem'
                                }}>
                                    {upcomingEventsPreview.map((event, index) => {
                                        const shouldBlurCard = upcomingEventsPreview.length > 1 && index === upcomingEventsPreview.length - 1;
                                        return (
                                            <div
                                                key={event.id || index}
                                                onClick={() => {
                                                    if (shouldBlurCard) {
                                                        navigate('/student/events');
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: '1rem',
                                                    overflow: 'hidden',
                                                    border: '1px solid #e5e7eb',
                                                    boxShadow: '0 12px 20px -6px rgba(15, 23, 42, 0.15)',
                                                    position: 'relative',
                                                    cursor: shouldBlurCard ? 'pointer' : 'default',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    minHeight: '260px',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                                                    e.currentTarget.style.boxShadow = '0 25px 40px -10px rgba(15,23,42,0.25)';
                                                    e.currentTarget.style.borderColor = '#1e40af';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 12px 20px -6px rgba(15, 23, 42, 0.15)';
                                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                                }}
                                            >
                                                <div style={{
                                                    height: '200px',
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}>
                                                    <img
                                                        src={event.image}
                                                        alt={event.title}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            objectPosition: 'center'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.style.backgroundColor = '#f1f5f9';
                                                        }}
                                                    />
                                                    <button
                                                        style={{
                                                            position: 'absolute',
                                                            top: '0.75rem',
                                                            right: '0.75rem',
                                                            backgroundColor: 'rgba(255,255,255,0.9)',
                                                            borderRadius: '50%',
                                                            border: 'none',
                                                            width: '2.25rem',
                                                            height: '2.25rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#1D3557' }}>
                                                            favorite
                                                        </span>
                                                    </button>
                                                </div>

                                                <div style={{ padding: '0.7rem 0.8rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                                                    <p style={{
                                                        color: '#1D3557',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        margin: 0
                                                    }}>
                                                        {event.title}
                                                    </p>
                                                    {event.rating ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                            <span style={{ fontWeight: '600', color: '#065f46', fontSize: '0.75rem' }}>
                                                                {event.rating.toFixed(1)}
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '0.05rem' }}>
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span
                                                                        key={star}
                                                                        className="material-symbols-outlined"
                                                                        style={{
                                                                            fontSize: '0.8rem',
                                                                            color: star <= Math.round(event.rating) ? '#22c55e' : '#d1d5db'
                                                                        }}
                                                                    >
                                                                        grade
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>
                                                                ({event.ratingCount || '—'})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <p style={{ color: '#9ca3af', fontSize: '0.65rem', margin: 0 }}>
                                                            Not rated yet
                                                        </p>
                                                    )}
                                                </div>

                                                {shouldBlurCard && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            backgroundColor: 'rgba(248,250,252,0.7)',
                                                            backdropFilter: 'blur(2px)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            textAlign: 'center',
                                                            padding: '0.5rem',
                                                            color: '#1D3557',
                                                            fontWeight: '600',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        Discover more events
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Quick Stats */}
                        <div style={{ marginBottom: '1.5rem', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                        <h3 style={{
                            color: '#1D3557',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            marginBottom: '1rem',
                            marginTop: 0
                        }}>
                            Quick Stats
                        </h3>
                        {loading ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}>
                                    Loading...
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'all 0.3s ease',
                                    animation: 'fadeInUp 0.6s ease-out',
                                    animationDelay: '0.1s',
                                    animationFillMode: 'both',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                }}
                                >
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 2s ease-in-out infinite',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.animation = 'bounce 0.6s ease-in-out';
                                    }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#2563eb' }}>
                                            event_available
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{
                                            color: '#6b7280',
                                            fontSize: '0.875rem',
                                            margin: 0,
                                            marginBottom: '0.25rem'
                                        }}>
                                            Enrolled Events
                                        </p>
                                        <p style={{
                                            color: '#111827',
                                            fontSize: '1.875rem',
                                            fontWeight: '700',
                                            margin: 0
                                        }}>
                                            {stats.enrolledEvents}
                                        </p>
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'all 0.3s ease',
                                    animation: 'fadeInUp 0.6s ease-out',
                                    animationDelay: '0.2s',
                                    animationFillMode: 'both',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                }}
                                >
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: '#d1fae5',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 2s ease-in-out infinite 0.3s',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.animation = 'bounce 0.6s ease-in-out';
                                    }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#059669' }}>
                                            event_upcoming
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{
                                            color: '#6b7280',
                                            fontSize: '0.875rem',
                                            margin: 0,
                                            marginBottom: '0.25rem'
                                        }}>
                                            Upcoming Events
                                        </p>
                                        <p style={{
                                            color: '#111827',
                                            fontSize: '1.875rem',
                                            fontWeight: '700',
                                            margin: 0
                                        }}>
                                            {stats.upcomingEvents}
                                        </p>
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'all 0.3s ease',
                                    animation: 'fadeInUp 0.6s ease-out',
                                    animationDelay: '0.3s',
                                    animationFillMode: 'both',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                }}
                                >
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: '#fed7aa',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 2s ease-in-out infinite 0.6s',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.animation = 'bounce 0.6s ease-in-out';
                                    }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#ea580c' }}>
                                            pending_actions
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{
                                            color: '#6b7280',
                                            fontSize: '0.875rem',
                                            margin: 0,
                                            marginBottom: '0.25rem'
                                        }}>
                                            Events Requiring Action
                                        </p>
                                        <p style={{
                                            color: '#111827',
                                            fontSize: '1.875rem',
                                            fontWeight: '700',
                                            margin: 0
                                        }}>
                                            {stats.eventsRequiringAction}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                        {/* Quick Actions */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{
                                color: '#1D3557',
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                marginTop: 0
                            }}>
                                Quick Actions
                            </h3>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => navigate('/student/favorites')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: '#1D3557',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                        animation: 'fadeInUp 0.6s ease-out 0.5s both'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#152a47';
                                        e.target.style.transform = 'translateY(-3px) scale(1.05)';
                                        e.target.style.boxShadow = '0 8px 12px -4px rgba(0, 0, 0, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = '#1D3557';
                                        e.target.style.transform = 'translateY(0) scale(1)';
                                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                        favorite
                                    </span>
                                    My Favorites
                                </button>
                                <button
                                    onClick={() => navigate('/student/loyalty-vendors')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: '#1D3557',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                        animation: 'fadeInUp 0.6s ease-out 0.6s both'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#152a47';
                                        e.target.style.transform = 'translateY(-3px) scale(1.05)';
                                        e.target.style.boxShadow = '0 8px 12px -4px rgba(0, 0, 0, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = '#1D3557';
                                        e.target.style.transform = 'translateY(0) scale(1)';
                                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                        local_offer
                                    </span>
                                    View Loyalty Partners
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity and Upcoming Deadlines */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                        {/* Recent Activity */}
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            padding: '1.5rem',
                            borderRadius: '0.75rem',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}>
                            <h3 style={{
                                color: '#1D3557',
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                marginTop: 0
                            }}>
                                Recent Activity
                            </h3>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    Loading...
                                </div>
                            ) : recentActivity.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No recent activity. Start exploring events!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {recentActivity.map((activity) => {
                                        const iconBgColors = {
                                            'bg-green-100 dark:bg-green-900/50': '#d1fae5',
                                            'bg-orange-100 dark:bg-orange-900/50': '#fed7aa',
                                            'bg-blue-100 dark:bg-blue-900/50': '#dbeafe'
                                        };
                                        const iconTextColors = {
                                            'text-green-600 dark:text-green-400': '#059669',
                                            'text-orange-600 dark:text-orange-400': '#ea580c',
                                            'text-blue-600 dark:text-blue-400': '#2563eb'
                                        };
                                        const bgColor = iconBgColors[activity.iconBg] || '#dbeafe';
                                        const textColor = iconTextColors[activity.iconColor] || '#2563eb';
                                        
                                        return (
                                            <div key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{
                                                    padding: '0.5rem',
                                                    backgroundColor: bgColor,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: textColor }}>
                                                        {activity.icon}
                                                    </span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        color: '#111827',
                                                        fontSize: '0.875rem',
                                                        margin: 0,
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {activity.message}
                                                    </p>
                                                    <p style={{
                                                        color: '#6b7280',
                                                        fontSize: '0.75rem',
                                                        margin: 0
                                                    }}>
                                                        {activity.time}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Upcoming Deadlines */}
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            padding: '1.5rem',
                            borderRadius: '0.75rem',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}>
                            <h3 style={{
                                color: '#1D3557',
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                marginTop: 0
                            }}>
                                Upcoming Deadlines
                            </h3>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    Loading...
                                </div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No upcoming deadlines.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {upcomingDeadlines.map((deadline) => {
                                        const isUrgent = deadline.color.includes('red');
                                        const bgColor = isUrgent ? '#fee2e2' : '#dbeafe';
                                        const textColor = isUrgent ? '#991b1b' : '#1e40af';
                                        
                                        return (
                                            <div key={deadline.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{
                                                    flexShrink: 0,
                                                    width: '3rem',
                                                    height: '3rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: bgColor,
                                                    color: textColor,
                                                    borderRadius: '0.375rem',
                                                    padding: '0.5rem'
                                                }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                                        {deadline.month}
                                                    </span>
                                                    <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                                        {deadline.day}
                                                    </span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        color: '#111827',
                                                        fontSize: '0.875rem',
                                                        fontWeight: '500',
                                                        margin: 0,
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {deadline.title}
                                                    </p>
                                                    <p style={{
                                                        color: '#6b7280',
                                                        fontSize: '0.75rem',
                                                        margin: 0
                                                    }}>
                                                        {deadline.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;

