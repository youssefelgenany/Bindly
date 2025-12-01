import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';
import { notificationApiService } from '../api/notificationApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { eventsApiService } from '../api/eventsApi';

const ProfessorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
    const [stats, setStats] = useState({
        totalWorkshopsCreated: 0,
        upcomingEvents: 0,
        eventsParticipatingIn: 0,
        workshopsPendingApproval: 0
    });
    const [notifications, setNotifications] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingEventsPreview, setUpcomingEventsPreview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Fetch stats and notifications from backend API
            const [statsResult, notificationsResult] = await Promise.all([
                professorApiService.getDashboardStats(),
                professorApiService.getDashboardNotifications()
            ]);

            if (statsResult.success) {
                setStats(statsResult.data.stats || {
                    totalWorkshopsCreated: 0,
                    upcomingEvents: 0,
                    eventsParticipatingIn: 0,
                    workshopsPendingApproval: 0
                });
            } else {
                console.error('Failed to fetch stats:', statsResult.message);
                setError('Failed to load dashboard statistics');
            }

            if (notificationsResult.success) {
                const notificationsData = notificationsResult.data.notifications || [];
                setNotifications(notificationsData);
                
                // Convert notifications to recent activity format
                const activities = notificationsData
                    .slice(0, 3)
                    .map(notif => ({
                        id: notif.id || notif._id,
                        type: 'notification',
                        message: notif.message || notif.title || 'New notification',
                        time: formatTimeAgo(notif.timestamp || notif.createdAt),
                        icon: notif.priority === 'warning' ? 'error' : notif.priority === 'success' ? 'check_circle' : 'info',
                        iconBg: notif.priority === 'warning' ? '#fed7aa' : notif.priority === 'success' ? '#d1fae5' : '#dbeafe',
                        iconColor: notif.priority === 'warning' ? '#ea580c' : notif.priority === 'success' ? '#059669' : '#2563eb'
                    }));
                setRecentActivity(activities);
            } else {
                console.error('Failed to fetch notifications:', notificationsResult.message);
            }

            // Fetch events from discover events for upcoming events preview
            // Use getStudentEvents to get discover events (excludes registered events)
            try {
                const eventsResult = await eventsApiService.getStudentEvents({});
                
                if (eventsResult.success) {
                    // Handle different response structures
                    let eventsList = [];
                    if (Array.isArray(eventsResult.data)) {
                        eventsList = eventsResult.data;
                    } else if (eventsResult.data?.events && Array.isArray(eventsResult.data.events)) {
                        eventsList = eventsResult.data.events;
                    } else if (eventsResult.data && typeof eventsResult.data === 'object') {
                        // Try to find any array in the response
                        eventsList = Object.values(eventsResult.data).find(val => Array.isArray(val)) || [];
                    }
                    
                    console.log('🔍 Professor Dashboard - Total events fetched:', eventsList.length);
                    
                    const now = new Date();
                    
                    // Separate upcoming and past events
                    const upcoming = eventsList.filter(ev => {
                        if (!ev.startDate) return false;
                        const date = new Date(ev.startDate);
                        return !isNaN(date.getTime()) && date > now;
                    });
                    
                    const past = eventsList.filter(ev => {
                        if (!ev.startDate) return false;
                        const date = new Date(ev.startDate);
                        return !isNaN(date.getTime()) && date <= now;
                    });

                    // Sort upcoming by date (earliest first)
                    const sortedUpcoming = upcoming.slice().sort((a, b) => {
                        const dateA = new Date(a.startDate || 0);
                        const dateB = new Date(b.startDate || 0);
                        return dateA - dateB;
                    });
                    
                    // Sort past by date (most recent first)
                    const sortedPast = past.slice().sort((a, b) => {
                        const dateA = new Date(a.startDate || 0);
                        const dateB = new Date(b.startDate || 0);
                        return dateB - dateA;
                    });
                    
                    // Combine: upcoming first, then past (to always have events to show)
                    const sortedByDate = [...sortedUpcoming, ...sortedPast];
                    
                    console.log('🔍 Professor Dashboard - Upcoming count:', upcoming.length);
                    console.log('🔍 Professor Dashboard - Past count:', past.length);
                    console.log('🔍 Professor Dashboard - Event types:', sortedByDate.map(ev => ev.type));

                    // Select specific event types in order: Trip, Workshop, Bazaar, Conference/Booth
                    // Always ensure different types are shown
                    const selectedEvents = [];
                    const priorityTypes = ['trip', 'workshop', 'bazaar', 'conference', 'booth'];
                    
                    // Helper function to normalize event type (handle platformBooth as booth)
                    const normalizeEventType = (type) => {
                        const normalized = (type || '').toLowerCase();
                        return normalized === 'platformbooth' ? 'booth' : normalized;
                    };
                    
                    // Helper function to get unique types already selected
                    const getSelectedTypes = () => {
                        return new Set(selectedEvents.map(ev => normalizeEventType(ev.type)));
                    };
                    
                    // First pass: get one of each priority type in order
                    for (const type of priorityTypes) {
                        if (selectedEvents.length >= 4) break;
                        const found = sortedByDate.find(ev => {
                            const eventType = normalizeEventType(ev.type);
                            const isAlreadySelected = selectedEvents.find(e => (e._id || e.id) === (ev._id || ev.id));
                            return eventType === type && !isAlreadySelected;
                        });
                        if (found) {
                            selectedEvents.push(found);
                        }
                    }
                    
                    // Second pass: fill with events of different types only (no duplicates)
                    const selectedTypes = getSelectedTypes();
                    for (const ev of sortedByDate) {
                        if (selectedEvents.length >= 4) break;
                        const eventType = normalizeEventType(ev.type);
                        const isAlreadySelected = selectedEvents.find(e => (e._id || e.id) === (ev._id || ev.id));
                        const isDifferentType = !selectedTypes.has(eventType);
                        
                        // Only add if not already selected AND is a different type
                        if (!isAlreadySelected && isDifferentType) {
                            selectedEvents.push(ev);
                            selectedTypes.add(eventType); // Update selected types set
                        }
                    }
                    
                    // Third pass: if we still don't have 4, fill with any remaining events
                    // (This ensures we always show up to 4 events from discover events)
                    for (const ev of sortedByDate) {
                        if (selectedEvents.length >= 4) break;
                        const isAlreadySelected = selectedEvents.find(e => (e._id || e.id) === (ev._id || ev.id));
                        if (!isAlreadySelected) {
                            selectedEvents.push(ev);
                        }
                    }
                    
                    console.log('🔍 Professor Dashboard - Selected events count:', selectedEvents.length);
                    console.log('🔍 Professor Dashboard - Selected event types:', selectedEvents.map(ev => ev.type));
                    
                    // CRITICAL FIX: Always ensure we have events to show from discover events
                    // If selection logic failed or we have fewer than 4, fill from all available events
                    if (selectedEvents.length < 4 && sortedByDate.length > 0) {
                        console.log('🔍 Professor Dashboard - Filling remaining slots. Selected:', selectedEvents.length, 'Available:', sortedByDate.length);
                        const selectedIds = new Set(selectedEvents.map(ev => String(ev._id || ev.id)));
                        for (const ev of sortedByDate) {
                            if (selectedEvents.length >= 4) break;
                            const evId = String(ev._id || ev.id);
                            if (!selectedIds.has(evId)) {
                                selectedEvents.push(ev);
                                selectedIds.add(evId);
                            }
                        }
                        console.log('🔍 Professor Dashboard - After fill, total selected:', selectedEvents.length);
                    }
                    
                    // Final fallback: if still empty, just take first 4 events (should never happen but safety net)
                    if (selectedEvents.length === 0 && sortedByDate.length > 0) {
                        console.log('🔍 Professor Dashboard - CRITICAL: No events selected, using emergency fallback');
                        selectedEvents.push(...sortedByDate.slice(0, 4));
                    }

                    // Load ratings for selected events
                    const ratingsMap = {};
                    await Promise.all(selectedEvents.slice(0, 4).map(async (ev) => {
                        if (ev._id || ev.id) {
                            try {
                                const ratingResult = await eventsApiService.getRatingsAndComments(ev._id || ev.id);
                                if (ratingResult.success && ratingResult.data?.ratings) {
                                    ratingsMap[ev._id || ev.id] = {
                                        average: ratingResult.data.ratings.average || 0,
                                        count: ratingResult.data.ratings.count || 0
                                    };
                                }
                            } catch (err) {
                                // Silently fail - ratings are optional
                            }
                        }
                    }));

                    const previewCards = selectedEvents
                        .slice(0, 4)
                        .map((ev) => {
                            const eventId = ev._id || ev.id;
                            const ratingData = ratingsMap[eventId] || { average: null, count: 0 };
                            const banner = ev.bannerFile || ev.banner;
                            const image = banner 
                                ? (banner.startsWith('http') ? banner : `http://localhost:5000${banner}`)
                                : eventTypeImages[(ev.type || '').toLowerCase()] || eventTypeImages.other;
                            
                            return {
                                id: eventId,
                                title: ev.title || 'Upcoming Event',
                                subtitle: ev.location || ev.faculty || ev.type || 'On Campus',
                                dateLabel: formatEventDateLabel(ev.startDate),
                                image: image,
                                rating: ratingData.average,
                                ratingCount: ratingData.count,
                                priceLabel: getPriceLabel(ev.price),
                                typeLabel: ev.type || 'Event'
                            };
                        });
                    setUpcomingEventsPreview(previewCards);
                } else {
                    setUpcomingEventsPreview([]);
                }
            } catch (eventsError) {
                console.error('Error fetching events for upcoming events preview:', eventsError);
                setUpcomingEventsPreview([]);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setError('Failed to load dashboard data');
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

    const eventTypeImages = {
        conference: '/assets/images/conference-background.jpg',
        workshop: '/assets/images/workshop-background.jpg',
        bazaar: '/assets/images/bazaar-background.jpg',
        trip: '/assets/images/trip-background.png',
        booth: '/assets/images/booth-background.jpg',
        other: '/assets/images/events-banner.jpeg'
    };

    const getEventPreviewImage = (eventOrRegistration) => {
        // Handle both event objects and registration objects
        const banner = eventOrRegistration.bannerFile || eventOrRegistration.banner || 
                      eventOrRegistration.event?.bannerFile || eventOrRegistration.event?.banner;
        if (banner) {
            return banner.startsWith('http') ? banner : `http://localhost:5000${banner}`;
        }
        const type = (eventOrRegistration.type || eventOrRegistration.event?.type || eventOrRegistration.eventType || '').toLowerCase();
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

    const getRatingSummary = (eventOrRegistration) => {
        // Handle both event objects and registration objects
        const rating = eventOrRegistration.averageRating ??
            eventOrRegistration.rating?.average ??
            eventOrRegistration.average ??
            eventOrRegistration.rating ??
            eventOrRegistration.event?.averageRating ??
            eventOrRegistration.event?.rating?.average ??
            eventOrRegistration.event?.average ??
            eventOrRegistration.event?.rating ??
            null;
        const ratingCount = eventOrRegistration.ratingCount ??
            eventOrRegistration.rating?.count ??
            eventOrRegistration.ratingsCount ??
            eventOrRegistration.registeredCount ??
            eventOrRegistration.event?.ratingCount ??
            eventOrRegistration.event?.rating?.count ??
            eventOrRegistration.event?.ratingsCount ??
            eventOrRegistration.event?.registeredCount ??
            0;
        return {
            rating: rating && rating > 0 ? Math.min(Math.max(rating, 0), 5) : null,
            ratingCount
        };
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
        : user?.name || 'Professor';

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
                backgroundColor: '#182e4d'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
                    <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <img
                            src="/assets/images/bindly-logo.png"
                            alt="Bindly Logo"
                            style={{ height: '3rem', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
                        />
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
                            animation: 'fadeInUp 0.6s ease-out',
                            transition: 'all 0.3s ease'
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
                                color: '#FFFFFF',
                                animation: 'slideInLeft 0.8s ease-out 0.2s both'
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
                                    Overview of your workshops, events, and upcoming deadlines.
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            padding: '0 0 2rem 0'
                        }}>
                            {/* Animated WIR/GUC Ad - Tripadvisor Style Layout */}
                            <div 
                                style={{
                                    marginBottom: '1.5rem',
                                    position: 'relative',
                                    width: '100%',
                                    background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
                                    borderRadius: '1.25rem',
                                    padding: '2.5rem',
                                    boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.15)',
                                    animation: 'fadeInUp 0.8s ease-out',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animationDelay: '0.2s',
                                    animationFillMode: 'both',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(0, 0, 0, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(0, 0, 0, 0.15)';
                                }}
                            >
                                {/* Subtle Background Pattern Animation */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                    animation: 'pulse 4s ease-in-out infinite',
                                    zIndex: 1,
                                    pointerEvents: 'none'
                                }}></div>

                                <div style={{
                                    position: 'relative',
                                    zIndex: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3rem',
                                    flexWrap: 'wrap'
                                }}>
                                    {/* Left Side - Image with Reward Icons */}
                                    <div style={{
                                        position: 'relative',
                                        flex: '0 0 auto',
                                        width: '400px',
                                        animation: 'fadeInUp 1s ease-out 0.3s both'
                                    }}>
                                        {/* Reward Icons Around Image */}
                                        {/* Trophy Icon - Top Left (Gold) */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-15px',
                                            left: '-20px',
                                            width: '60px',
                                            height: '60px',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                                            animation: 'float 3s ease-in-out infinite',
                                            zIndex: 5,
                                            border: '3px solid #FFD700'
                                        }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '2rem',
                                                color: '#FFD700'
                                            }}>
                                                emoji_events
                                            </span>
                                        </div>
                                        {/* Wallet Icon - Top Right (Red) */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: '-25px',
                                            width: '55px',
                                            height: '55px',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(220, 20, 60, 0.3)',
                                            animation: 'float 3s ease-in-out infinite 0.3s',
                                            zIndex: 5,
                                            border: '3px solid #DC143C'
                                        }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '1.75rem',
                                                color: '#DC143C'
                                            }}>
                                                account_balance_wallet
                                            </span>
                                        </div>
                                        {/* Percentage Icon - Bottom Left (Black) */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            left: '-20px',
                                            width: '55px',
                                            height: '55px',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                            animation: 'float 3s ease-in-out infinite 0.6s',
                                            zIndex: 5,
                                            border: '3px solid #2c2c2c'
                                        }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '1.75rem',
                                                color: '#2c2c2c'
                                            }}>
                                                percent
                                            </span>
                                        </div>
                                        {/* Money Icon - Bottom Right (Gold) */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-15px',
                                            right: '-25px',
                                            width: '60px',
                                            height: '60px',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                                            animation: 'float 3s ease-in-out infinite 0.9s',
                                            zIndex: 5,
                                            border: '3px solid #FFD700'
                                        }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '2rem',
                                                color: '#FFD700'
                                            }}>
                                                attach_money
                                            </span>
                                        </div>

                                        {/* Ad Image Container */}
                                        <div style={{
                                            position: 'relative',
                                            borderRadius: '1rem',
                                            overflow: 'hidden',
                                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                                            backgroundColor: '#FFFFFF',
                                            padding: '0.5rem',
                                            animation: 'float 4s ease-in-out infinite'
                                        }}>
                                            <img 
                                                src="/assets/images/ad.png" 
                                                alt="GUC WIR Loyalty Program"
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    display: 'block',
                                                    objectFit: 'contain',
                                                    borderRadius: '0.75rem',
                                                    transition: 'transform 0.5s ease'
                                                }}
                                                onError={(e) => {
                                                    console.error('Failed to load ad image');
                                                    e.target.style.display = 'none';
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Side - Text Content */}
                                    <div style={{
                                        flex: '1',
                                        minWidth: '300px',
                                        color: '#2c2c2c',
                                        animation: 'fadeInUp 1s ease-out 0.5s both'
                                    }}>
                                        {/* Logo/Brand */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                border: '2px solid #FFD700'
                                            }}>
                                                <span className="material-symbols-outlined" style={{
                                                    fontSize: '2rem',
                                                    color: '#FFD700'
                                                }}>
                                                    local_offer
                                                </span>
                                            </div>
                                            <h3 style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: '#2c2c2c',
                                                margin: 0
                                            }}>
                                                GUC Rewards
                                            </h3>
                                        </div>

                                        {/* Main Headline */}
                                        <h2 style={{
                                            fontSize: '2.5rem',
                                            fontWeight: '800',
                                            color: '#2c2c2c',
                                            margin: 0,
                                            marginBottom: '1rem',
                                            lineHeight: '1.2',
                                            animation: 'slideInRight 0.8s ease-out 0.7s both'
                                        }}>
                                            Get Up to 50% Off<br/>Loyalty Partners
                                        </h2>

                                        {/* Description */}
                                        <p style={{
                                            fontSize: '1.1rem',
                                            color: '#2c2c2c',
                                            margin: 0,
                                            marginBottom: '2rem',
                                            lineHeight: '1.6',
                                            fontWeight: '500',
                                            opacity: 0.9
                                        }}>
                                            Savings, this way. Join GUC Loyalty Program to unlock exclusive discounts on food, shopping, entertainment, and more.
                                        </p>

                                        {/* CTA Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/professor/loyalty-vendors');
                                            }}
                                            style={{
                                                padding: '1rem 2.5rem',
                                                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                                                color: '#2c2c2c',
                                                border: 'none',
                                                borderRadius: '9999px',
                                                fontSize: '1rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                                                animation: 'fadeInUp 1s ease-out 0.9s both'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = 'linear-gradient(135deg, #FFA500 0%, #FFD700 100%)';
                                                e.target.style.transform = 'translateY(-2px) scale(1.05)';
                                                e.target.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
                                                e.target.style.transform = 'translateY(0) scale(1)';
                                                e.target.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
                                            }}
                                        >
                                            Learn More
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <>
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

                                    {/* Upcoming Events Preview */}
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

                                        {loading ? (
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                minHeight: '260px',
                                                color: '#6b7280',
                                                fontSize: '0.875rem'
                                            }}>
                                                Loading events...
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                                                gap: '0.85rem'
                                            }}>
                                                {upcomingEventsPreview.length > 0 ? (
                                                    // Ensure we always show exactly 4 cards
                                                    Array.from({ length: 4 }).map((_, index) => {
                                                        const event = upcomingEventsPreview[index];
                                                        // Always blur the last card (4th card) to indicate "Discover more"
                                                        const shouldBlurCard = index === 3;
                                                        
                                                        // If we don't have enough events, show placeholder for remaining slots
                                                        if (!event) {
                                                            return (
                                                                <div
                                                                    key={`placeholder-${index}`}
                                                                    onClick={() => navigate('/professor/events')}
                                                                    style={{
                                                                        backgroundColor: '#FFFFFF',
                                                                        borderRadius: '1rem',
                                                                        overflow: 'hidden',
                                                                        border: '1px solid #e5e7eb',
                                                                        boxShadow: '0 12px 20px -6px rgba(15, 23, 42, 0.15)',
                                                                        position: 'relative',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        minHeight: '260px',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: '#6b7280'
                                                                    }}
                                                                >
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                                                                        event
                                                                    </span>
                                                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>Discover more events</p>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <div
                                                                key={event.id || index}
                                                                onClick={() => {
                                                                    // All cards redirect to Discover Events
                                                                    navigate('/professor/events');
                                                                }}
                                                                style={{
                                                                    backgroundColor: '#FFFFFF',
                                                                    borderRadius: '1rem',
                                                                    overflow: 'hidden',
                                                                    border: '1px solid #e5e7eb',
                                                                    boxShadow: '0 12px 20px -6px rgba(15, 23, 42, 0.15)',
                                                                    position: 'relative',
                                                                    cursor: 'pointer',
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
                                                })
                                                ) : (
                                                    // Show placeholder cards if no events
                                                    Array.from({ length: 4 }).map((_, index) => (
                                                        <div
                                                            key={`placeholder-${index}`}
                                                            onClick={() => navigate('/professor/events')}
                                                            style={{
                                                                backgroundColor: '#FFFFFF',
                                                                borderRadius: '1rem',
                                                                overflow: 'hidden',
                                                                border: '1px solid #e5e7eb',
                                                                boxShadow: '0 12px 20px -6px rgba(15, 23, 42, 0.15)',
                                                                position: 'relative',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                minHeight: '260px',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#6b7280'
                                                            }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                                                                event
                                                            </span>
                                                            <p style={{ margin: 0, fontSize: '0.875rem' }}>Discover more events</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </section>

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
                                            {recentActivity.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {recentActivity.map((activity, index) => {
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
                                                        const bgColor = activity.iconBg || '#dbeafe';
                                                        const textColor = activity.iconColor || '#2563eb';
                                                        
                                                        return (
                                                            <div key={`${activity.type}-${activity.id}-${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
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
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                    No recent activity.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfessorDashboard;

