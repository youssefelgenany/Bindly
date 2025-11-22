import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [user]);

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
                            Student
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
                            {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                        </div>
                    )}
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
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Dashboard Banner with Background Image */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '200px',
                    backgroundImage: 'url(frontend/public/assets/images/dashboard-image.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        padding: '2rem',
                        color: '#FFFFFF'
                    }}>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            margin: 0,
                            marginBottom: '0.5rem',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                            Dashboard
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            fontWeight: '400',
                            margin: 0,
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                            Overview of your events, registrations, and upcoming deadlines.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    padding: '0 2rem 2rem 2rem'
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
            </main>
        </div>
    );
};

export default StudentDashboard;

