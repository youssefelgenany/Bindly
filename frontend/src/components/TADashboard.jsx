import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';

const TADashboard = () => {
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
            
            // Fetch TA registrations (using student registration API as TA can register for events)
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
                        iconBg: '#d1fae5',
                        iconColor: '#059669'
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
                        iconBg: '#fed7aa',
                        iconColor: '#ea580c'
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
                                ? '#fee2e2'
                                : '#dbeafe',
                            textColor: eventDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 
                                ? '#dc2626'
                                : '#2563eb'
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
        : user?.name || 'TA';

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
                                    TA Portal
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
                                to="/staff/events"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/staff/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/staff/events')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/staff/events')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/staff/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    explore
                                </span>
                                <p style={{
                                    color: isActiveRoute('/staff/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/staff/events') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    Discover Events
                                </p>
                            </Link>

                            <Link
                                to="/staff/my-registrations"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActiveRoute('/staff/my-registrations') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActiveRoute('/staff/my-registrations')) {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActiveRoute('/staff/my-registrations')) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ 
                                    color: isActiveRoute('/staff/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                                    fontSize: '1.25rem' 
                                }}>
                                    event_note
                                </span>
                                <p style={{
                                    color: isActiveRoute('/staff/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActiveRoute('/staff/my-registrations') ? '700' : '500',
                                    lineHeight: 'normal',
                                    margin: 0
                                }}>
                                    My Events
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
                                Teaching Assistant
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
                                {(user?.firstName?.[0] || user?.name?.[0] || 'T').toUpperCase()}
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1D3557' }}>Quick Stats</h2>
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
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Enrolled Events</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.enrolledEvents}</p>
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
                                    <div style={{ padding: '1rem', backgroundColor: '#fed7aa', borderRadius: '50%' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#ea580c', fontSize: '2rem' }}>pending_actions</span>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, marginBottom: '0.25rem' }}>Events Requiring Action</p>
                                        <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1D3557', margin: 0 }}>{stats.eventsRequiringAction}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div style={{ gridColumn: 'span 2', backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1D3557' }}>Recent Activity</h3>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                            ) : recentActivity.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No recent activity. Start exploring events!
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

                        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1D3557' }}>Upcoming Deadlines</h3>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No upcoming deadlines.
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {upcomingDeadlines.map((deadline) => (
                                        <li key={deadline.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <div style={{ flexShrink: 0, width: '3rem', height: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: deadline.color, borderRadius: '0.375rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: deadline.textColor }}>{deadline.month}</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: deadline.textColor }}>{deadline.day}</span>
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '500', color: '#1D3557', margin: 0 }}>{deadline.title}</p>
                                                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{deadline.description}</p>
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

export default TADashboard;

