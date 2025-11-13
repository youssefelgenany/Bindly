import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';

const ProfessorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [stats, setStats] = useState({
        totalEventsCreated: 0,
        upcomingEvents: 0,
        eventsParticipatingIn: 0,
        pendingApprovals: 0
    });
    const [notifications, setNotifications] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, [user]);

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
                    totalEventsCreated: 0,
                    upcomingEvents: 0,
                    eventsParticipatingIn: 0,
                    pendingApprovals: 0
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
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setError('Failed to load dashboard data');
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
        return location.pathname === path;
    };

    const displayName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user?.name || 'Professor';

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#f8f6f6'
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
                transition: 'width 0.3s ease, padding 0.3s ease'
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
                                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>school</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{
                                    color: '#FFFFFF',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Professor Portal
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
                                to="/dashboard"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                    textDecoration: 'none',
                                    color: '#FFFFFF'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/dashboard')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/dashboard')) {
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
                                to="/professor/all-events"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/professor/all-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/professor/all-events')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/professor/all-events')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    explore
                                </span>
                                <p style={{
                                    color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/professor/all-events') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Discover Events
                                </p>
                            </Link>

                            <Link
                                to="/professor/events"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/professor/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/professor/events')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/professor/events')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    event_note
                                </span>
                                <p style={{
                                    color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/professor/events') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    My Events
                                </p>
                            </Link>

                            <Link
                                to="/professor/my-workshops"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/professor/my-workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/professor/my-workshops')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/professor/my-workshops')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    work
                                </span>
                                <p style={{
                                    color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/professor/my-workshops') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    My Workshops
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
                                {sidebarOpen && (
                                    <p style={{
                                        color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                        fontSize: '0.875rem',
                                        fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                                        lineHeight: 'normal',
                                        margin: 0
                                    }}>
                                        View Gym Sessions
                                    </p>
                                )}
                            </Link>

                            <Link
                                to="/professor/create-workshop"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/professor/create-workshop') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/professor/create-workshop')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/professor/create-workshop')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    add_circle
                                </span>
                                {sidebarOpen && (
                                    <p style={{
                                        color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                        fontSize: '0.875rem',
                                        fontWeight: isActiveRoute('/professor/create-workshop') ? '700' : '500',
                                        lineHeight: 'normal',
                                        margin: 0
                                    }}>
                                        Create Workshop
                                    </p>
                                )}
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

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '1rem 2.5rem',
                    backgroundColor: '#FFFFFF'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
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
                                color: '#1D3557'
                            }}
                            aria-label="Toggle sidebar"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                                menu
                            </span>
                        </button>
                        <h2 style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            lineHeight: '1.25',
                            margin: 0
                        }}>
                            Dashboard
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                                Professor
                            </p>
                        </div>
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
                                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
                            </div>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '2rem',
                    overflowY: 'auto',
                    backgroundColor: '#f8f6f6'
                }}>
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

                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1D3557' }}>Event Overview</h2>
                        {loading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem' }}>Loading...</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '2rem' }}>event_available</span>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Total Events Created</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.totalEventsCreated}</p>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '2rem' }}>event_upcoming</span>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Upcoming Events</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.upcomingEvents}</p>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#6366f1', fontSize: '2rem' }}>people</span>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Events Participating In</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.eventsParticipatingIn}</p>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#fed7aa', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#ea580c', fontSize: '2rem' }}>pending_actions</span>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Pending Approvals</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.pendingApprovals}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div style={{ gridColumn: 'span 2', backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1D3557' }}>Notifications</h3>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '0.25rem 0.75rem', borderRadius: '0.75rem' }}>
                                    {notifications.filter(n => !n.isRead).length} unread
                                </div>
                            </div>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No notifications right now.
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {notifications.map((notif) => (
                                        <li key={notif.id || notif._id} style={{ 
                                            display: 'flex', 
                                            alignItems: 'flex-start', 
                                            gap: '1rem',
                                            padding: '1rem',
                                            backgroundColor: notif.isRead ? '#FFFFFF' : '#f8f9ff',
                                            borderRadius: '0.5rem',
                                            border: `1px solid ${notif.isRead ? '#e5e7eb' : '#3b82f6'}`,
                                            opacity: notif.isRead ? 0.85 : 1
                                        }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: notif.priority === 'warning' ? '#fed7aa' : notif.priority === 'success' ? '#d1fae5' : '#dbeafe', borderRadius: '50%' }}>
                                                <span className="material-symbols-outlined" style={{ 
                                                    color: notif.priority === 'warning' ? '#ea580c' : notif.priority === 'success' ? '#059669' : '#2563eb', 
                                                    fontSize: '1.25rem' 
                                                }}>
                                                    {notif.priority === 'warning' ? 'error' : notif.priority === 'success' ? 'check_circle' : 'info'}
                                                </span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                                    <p style={{ color: '#1D3557', margin: 0, fontWeight: notif.isRead ? '500' : '600' }}>
                                                        {notif.title || notif.message}
                                                    </p>
                                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '1rem', whiteSpace: 'nowrap' }}>
                                                        {formatTimeAgo(notif.timestamp || notif.createdAt)}
                                                    </span>
                                                </div>
                                                {notif.message && notif.title && (
                                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                                        {notif.message}
                                                    </p>
                                                )}
                                            </div>
                                            {!notif.isRead && (
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', marginTop: '0.5rem' }}></div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1D3557' }}>Recent Activity</h3>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                            ) : recentActivity.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No recent activity.
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {recentActivity.map((activity) => (
                                        <li key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: activity.iconBg, borderRadius: '50%' }}>
                                                <span className="material-symbols-outlined" style={{ color: activity.iconColor, fontSize: '1.25rem' }}>
                                                    {activity.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <p style={{ color: '#1D3557', margin: 0, marginBottom: '0.25rem' }}>
                                                    {activity.message}
                                                </p>
                                                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{activity.time}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfessorDashboard;

