import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
                setShowLogoutDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showLogoutDropdown]);

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
                        to="/professor/all-events"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/professor/all-events') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #2563eb' : '2px solid transparent'
                        }}
                    >
                        Discover Events
                    </Link>
                    <Link
                        to="/professor/events"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/professor/events') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/professor/events') ? '2px solid #2563eb' : '2px solid transparent'
                        }}
                    >
                        My Events
                    </Link>
                    <Link
                        to="/professor/my-workshops"
                        style={{
                            textDecoration: 'none',
                            color: isActiveRoute('/professor/my-workshops') ? '#2563eb' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute('/professor/my-workshops') ? '600' : '500',
                            paddingBottom: '0.5rem',
                            borderBottom: isActiveRoute('/professor/my-workshops') ? '2px solid #2563eb' : '2px solid transparent'
                        }}
                    >
                        My Workshops
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
                                    Overview of your workshops, events, and upcoming deadlines.
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            padding: '0 0 2rem 0'
                        }}>
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
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                            gap: '1rem'
                                        }}>
                                            {/* Total Workshops Created Card */}
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
                                                        work
                                                    </span>
                                                </div>
                                                <div>
                                                    <p style={{
                                                        color: '#6b7280',
                                                        fontSize: '0.875rem',
                                                        margin: 0,
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        Total Workshops Created
                                                    </p>
                                                    <p style={{
                                                        color: '#111827',
                                                        fontSize: '1.875rem',
                                                        fontWeight: '700',
                                                        margin: 0
                                                    }}>
                                                        {stats.totalWorkshopsCreated}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Upcoming Events Card */}
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

                                            {/* Events Participating In Card */}
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
                                                    backgroundColor: '#e0e7ff',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#6366f1' }}>
                                                        people
                                                    </span>
                                                </div>
                                                <div>
                                                    <p style={{
                                                        color: '#6b7280',
                                                        fontSize: '0.875rem',
                                                        margin: 0,
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        Events Participating In
                                                    </p>
                                                    <p style={{
                                                        color: '#111827',
                                                        fontSize: '1.875rem',
                                                        fontWeight: '700',
                                                        margin: 0
                                                    }}>
                                                        {stats.eventsParticipatingIn}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Workshops Pending Approval Card */}
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
                                                        Workshops Pending Approval
                                                    </p>
                                                    <p style={{
                                                        color: '#111827',
                                                        fontSize: '1.875rem',
                                                        fontWeight: '700',
                                                        margin: 0
                                                    }}>
                                                        {stats.workshopsPendingApproval}
                                                    </p>
                                                </div>
                                            </div>
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

