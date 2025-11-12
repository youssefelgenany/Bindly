import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
                const registrationsRes = await studentRegistrationApi.getMyRegistrations(user.email);
                const registrations = registrationsRes.success 
                    ? (registrationsRes.data?.registrations || [])
                    : [];

                const now = new Date();
                const upcoming = registrations.filter(reg => {
                    const eventDate = new Date(reg.eventDate || reg.event?.startDate);
                    return eventDate > now;
                });

                // Calculate stats
                setStats({
                    enrolledEvents: registrations.length,
                    upcomingEvents: upcoming.length,
                    eventsRequiringAction: registrations.filter(reg => 
                        reg.status === 'pending' || reg.status === 'payment_required'
                    ).length
                });

                // Generate recent activity from registrations
                const activities = registrations
                    .sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
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
                const actionRequired = registrations.find(reg => 
                    reg.status === 'pending' || reg.status === 'payment_required'
                );
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

                // Generate upcoming deadlines
                const deadlines = upcoming
                    .map(reg => {
                        const eventDate = new Date(reg.eventDate || reg.event?.startDate);
                        return {
                            id: reg.id || reg._id,
                            month: eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                            day: eventDate.getDate(),
                            title: reg.eventTitle || reg.event?.title || 'Event',
                            description: 'Registration deadline',
                            color: eventDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 
                                ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300'
                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                        };
                    })
                    .sort((a, b) => {
                        const dateA = new Date(`${a.month} ${a.day}`);
                        const dateB = new Date(`${b.month} ${b.day}`);
                        return dateA - dateB;
                    })
                    .slice(0, 3);

                setUpcomingDeadlines(deadlines);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
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
        : user?.name || 'Student';

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
                                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{
                                    color: '#FFFFFF',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Student Events
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
                                to="/student/events"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/student/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/student/events')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/student/events')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    explore
                                </span>
                                <p style={{
                                    color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/student/events') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Discover Events
                                </p>
                            </Link>

                            <Link
                                to="/student/my-registrations"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/student/my-registrations') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/student/my-registrations')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/student/my-registrations')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    event
                                </span>
                                <p style={{
                                    color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/student/my-registrations') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    My Events
                                </p>
                            </Link>

                            <Link
                                to="/student/courts"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/student/courts') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/student/courts')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/student/courts')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    sports_tennis
                                </span>
                                <p style={{
                                    color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/student/courts') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Campus Courts
                                </p>
                            </Link>

                            <Link
                                to="/gym"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/gym') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/gym')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/gym')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    sports_gymnastics
                                </span>
                                <p style={{
                                    color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/gym') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Gym Sessions
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

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '2rem',
                    overflowY: 'auto',
                    backgroundColor: '#f8f6f6'
                }}>
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Quick Stats</h2>
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg">Loading...</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg flex items-center gap-6 shadow-sm">
                                    <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                        <span className="material-symbols-outlined text-blue-500 text-3xl">event_available</span>
                                    </div>
                                    <div>
                                        <p className="text-text-light-secondary dark:text-text-dark-secondary">Enrolled Events</p>
                                        <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats.enrolledEvents}</p>
                                    </div>
                                </div>
                                <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg flex items-center gap-6 shadow-sm">
                                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full">
                                        <span className="material-symbols-outlined text-green-500 text-3xl">event_upcoming</span>
                                    </div>
                                    <div>
                                        <p className="text-text-light-secondary dark:text-text-dark-secondary">Upcoming Events</p>
                                        <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats.upcomingEvents}</p>
                                    </div>
                                </div>
                                <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg flex items-center gap-6 shadow-sm">
                                    <div className="p-4 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                                        <span className="material-symbols-outlined text-orange-500 text-3xl">pending_actions</span>
                                    </div>
                                    <div>
                                        <p className="text-text-light-secondary dark:text-text-dark-secondary">Events Requiring Action</p>
                                        <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats.eventsRequiringAction}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Recent Activity</h3>
                            {loading ? (
                                <div className="text-center py-4">Loading...</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center py-4 text-text-light-secondary dark:text-text-dark-secondary">
                                    No recent activity. Start exploring events!
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {recentActivity.map((activity) => (
                                        <li key={activity.id} className="flex items-start gap-4">
                                            <div className={`${activity.iconBg} p-2 rounded-full`}>
                                                <span className={`material-symbols-outlined ${activity.iconColor}`}>
                                                    {activity.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-text-light-primary dark:text-text-dark-primary">
                                                    {activity.message}
                                                </p>
                                                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{activity.time}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">Upcoming Deadlines</h3>
                            {loading ? (
                                <div className="text-center py-4">Loading...</div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div className="text-center py-4 text-text-light-secondary dark:text-text-dark-secondary">
                                    No upcoming deadlines.
                                </div>
                            ) : (
                                <ul className="space-y-5">
                                    {upcomingDeadlines.map((deadline) => (
                                        <li key={deadline.id} className="flex items-start gap-4">
                                            <div className={`flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center ${deadline.color} rounded-md`}>
                                                <span className="text-xs font-bold uppercase">{deadline.month}</span>
                                                <span className="text-xl font-bold">{deadline.day}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{deadline.title}</p>
                                                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{deadline.description}</p>
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

export default StudentDashboard;

