import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { notificationApiService } from '../api/notificationApi';

const TADashboard = () => {
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
            if (showLogoutDropdown && event.target instanceof Element && !event.target.closest('[data-profile-dropdown]')) {
                setShowLogoutDropdown(false);
            }
            if (showNotificationsDropdown && event.target instanceof Element && !event.target.closest('[data-notifications-dropdown]')) {
                setShowNotificationsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLogoutDropdown, showNotificationsDropdown]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch TA registrations (using student registration API as TA can register for events)
            if (user?.email) {
                const registrationsRes = await studentRegistrationApi.getMyRegistrations(user.email);
                
                // Handle different response formats
                let registrations = [];
                if (registrationsRes.success) {
                    registrations = registrationsRes.data?.registrations || 
                                   registrationsRes.data?.data?.registrations ||
                                   (Array.isArray(registrationsRes.data) ? registrationsRes.data : []) ||
                                   [];
                } else {
                    console.error('Failed to fetch registrations:', registrationsRes.message);
                }

                const now = new Date();
                
                // Filter upcoming events - check both eventDate and event.startDate
                const upcoming = registrations.filter(reg => {
                    const eventDate = reg.eventDate || reg.event?.startDate || reg.event?.eventDate;
                    if (!eventDate) return false;
                    const date = new Date(eventDate);
                    return !isNaN(date.getTime()) && date > now;
                });

                // Calculate stats
                const enrolledCount = registrations.length;
                const upcomingCount = upcoming.length;
                const actionRequiredCount = registrations.filter(reg => {
                    const status = (reg.status || '').toLowerCase();
                    return status === 'pending' || status === 'payment_required' || status === 'payment_pending';
                }).length;
                
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
        if (!dateString) return 'Just now';
        const now = new Date();
        const date = new Date(dateString);
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMs / 3600000);
        const diffInDays = Math.floor(diffInMs / 86400000);

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleLogout = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        logout();
        navigate('/login');
    };

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
        : user?.name || 'TA';

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
                                                        navigate('/ta/events');
                                                        setShowNotificationsDropdown(false);
                                                    } else if (
                                                        (notification.type === 'event_reminder' ||
                                                         notification.type === 'workshop_reminder' ||
                                                         notification.type === 'trip_reminder' ||
                                                         notification.type === 'gym_session_reminder') &&
                                                        (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                                                    ) {
                                                        navigate('/ta/my-registrations');
                                                        setShowNotificationsDropdown(false);
                                                    } else if (
                                                        notification.type === 'new_loyalty_partner' ||
                                                        notification.type === 'loyalty_partner_added' ||
                                                        (notification.type === 'system' && notification.metadata?.vendorId)
                                                    ) {
                                                        navigate('/ta/loyalty-vendors');
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
                            TA
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
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}>
                                {(user?.firstName?.[0] || user?.name?.[0] || 'T').toUpperCase()}
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
                        to="/ta/events"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/ta/events') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/ta/events') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/ta/events') ? '2px solid #2563eb' : '2px solid transparent'
                        }}
                    >
                        Discover Events
                    </Link>
                    <Link
                        to="/ta/my-registrations"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/ta/my-registrations') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/ta/my-registrations') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/ta/my-registrations') ? '2px solid #2563eb' : '2px solid transparent'
                        }}
                    >
                        My Events
                    </Link>
                    <Link
                        to="/ta/favorites"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/ta/favorites') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/ta/favorites') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/ta/favorites') ? '2px solid #2563eb' : '2px solid transparent'
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
                        {/* Dashboard Banner with Background Image */}
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
                                backgroundImage: 'url(/assets/images/dashboardimage.jpg)',
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
                                    Dashboard
                                </h3>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.875rem',
                                    fontWeight: '400',
                                    margin: 0
                                }}>
                                    Overview of your events, registrations, and upcoming deadlines.
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            padding: '0 0 2rem 0'
                        }}>
                            {/* Quick Stats */}
                            <div style={{ marginBottom: '1.5rem' }}>
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
                                            gap: '1rem'
                                        }}>
                                            <div style={{
                                                padding: '1rem',
                                                backgroundColor: '#dbeafe',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
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
                                            gap: '1rem'
                                        }}>
                                            <div style={{
                                                padding: '1rem',
                                                backgroundColor: '#d1fae5',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
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
                                            gap: '1rem'
                                        }}>
                                            <div style={{
                                                padding: '1rem',
                                                backgroundColor: '#fed7aa',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
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
                                        onClick={() => navigate('/ta/favorites')}
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
                                            transition: 'all 0.2s',
                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#152a47';
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = '#1D3557';
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                            favorite
                                        </span>
                                        My Favorites
                                    </button>
                                    <button
                                        onClick={() => navigate('/ta/loyalty-vendors')}
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
                                            transition: 'all 0.2s',
                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#152a47';
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = '#1D3557';
                                            e.target.style.transform = 'translateY(0)';
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

export default TADashboard;
