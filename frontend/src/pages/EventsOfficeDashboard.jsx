import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const EventsOfficeDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    pendingApproval: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch events to calculate stats
      const eventsRes = await axios.get('http://localhost:5000/api/events', { headers });
      
      if (eventsRes.data?.success) {
        const events = eventsRes.data.data || [];
        const now = new Date();
        
        const totalEvents = events.length;
        const upcomingEvents = events.filter(e => new Date(e.startDate) > now).length;
        const pendingApproval = events.filter(e => e.status === 'pending').length;

        setStats({
          totalEvents,
          upcomingEvents,
          pendingApproval
        });

        // Generate recent activity from events
        const activities = events
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .map((event, index) => ({
            id: event._id,
            type: event.type,
            title: event.title || event.name,
            timestamp: event.createdAt,
            icon: getEventIcon(event.type),
            user: index === 0 ? 'Anna Müller' : null,
            action: index === 0 ? 'approved the budget for' : 'A new event'
          }));
        
        setRecentActivity(activities);

        // Generate upcoming deadlines (mock data for now)
        setUpcomingDeadlines([
          { id: 1, task: 'Finalize vendor list for Winter Bazaar', due: 'Tomorrow', color: '#ef4444' },
          { id: 2, task: 'Submit transport request for Geology Trip', due: 'In 3 days', color: '#f97316' },
          { id: 3, task: 'Confirm speaker for Tech Conference', due: 'In 1 week', color: '#eab308' },
          { id: 4, task: 'Book venue for Alumni Gala', due: 'In 2 weeks', color: '#eab308' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      'bazaar': 'storefront',
      'trip': 'flight_takeoff',
      'conference': 'groups',
      'workshop': 'groups',
      'gym': 'fitness_center'
    };
    return icons[type?.toLowerCase()] || 'event';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
                  Events Office
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
              to="/create-bazaar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-bazaar') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                storefront
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-bazaar') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Bazaars
                </p>
              )}
            </Link>

            <Link
              to="/create-trip"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-trip') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                flight_takeoff
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-trip') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Trips
                </p>
              )}
            </Link>

            <Link
              to="/create-conference"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-conference') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                groups
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-conference') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Conferences
                </p>
              )}
            </Link>

            <Link
              to="/create-gym-session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-gym-session') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                fitness_center
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-gym-session') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Gym Sessions
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
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name || 'User'}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0
              }}>
                Events Office
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

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2.5rem',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem'
            }}>
              {/* Left Column - Quick Stats and Recent Activity */}
              <div style={{
                gridColumn: 'span 12',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }} className="events-office-left-column">
                {/* Quick Stats */}
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    marginBottom: '1rem'
                  }}>
                    Quick Stats
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem'
                  }}>
                    {/* Total Events Card */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#dbeafe',
                          padding: '0.75rem',
                          borderRadius: '50%'
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#1D3557', fontSize: '1.5rem' }}>
                            event
                          </span>
                        </div>
                        <div>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            margin: 0
                          }}>
                            Total Events
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0
                          }}>
                            {stats.totalEvents}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Events Card */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#dcfce7',
                          padding: '0.75rem',
                          borderRadius: '50%'
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#15803d', fontSize: '1.5rem' }}>
                            upcoming
                          </span>
                        </div>
                        <div>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            margin: 0
                          }}>
                            Upcoming Events
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0
                          }}>
                            {stats.upcomingEvents}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pending Approval Card */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#fed7aa',
                          padding: '0.75rem',
                          borderRadius: '50%'
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#c2410c', fontSize: '1.5rem' }}>
                            pending_actions
                          </span>
                        </div>
                        <div>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            margin: 0
                          }}>
                            Pending Approval
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0
                          }}>
                            {stats.pendingApproval}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    marginBottom: '1rem'
                  }}>
                    Recent Activity
                  </h3>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                      <li key={activity.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}>
                        {activity.user && index === 0 ? (
                          <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            backgroundImage: user?.profilePicturePath ? `url(http://localhost:5000${user.profilePicturePath})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0
                          }}></div>
                        ) : (
                          <div style={{
                            backgroundColor: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '50%',
                            flexShrink: 0
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#6b7280', fontSize: '1.25rem' }}>
                              {activity.icon}
                            </span>
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#1D3557',
                            margin: 0
                          }}>
                            {activity.user ? (
                              <>
                                <span style={{ fontWeight: '600' }}>{activity.user}</span> {activity.action} the <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
                              </>
                            ) : (
                              <>
                                {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span> was created.
                              </>
                            )}
                          </p>
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'rgba(29, 53, 87, 0.6)',
                            marginTop: '0.25rem',
                            margin: 0
                          }}>
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </li>
                    )) : (
                      <li style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        No recent activity
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Right Column - Upcoming Deadlines */}
              <div style={{
                gridColumn: 'span 12',
                backgroundColor: '#FFFFFF',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }} className="events-office-right-column">
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  marginBottom: '1rem'
                }}>
                  Upcoming Deadlines
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {upcomingDeadlines.map((deadline) => (
                    <li key={deadline.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        marginTop: '0.25rem',
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        backgroundColor: deadline.color,
                        flexShrink: 0
                      }}></div>
                      <div>
                        <p style={{
                          fontWeight: '500',
                          fontSize: '0.875rem',
                          color: '#1D3557',
                          margin: 0
                        }}>
                          {deadline.task}
                        </p>
                        <p style={{
                          fontSize: '0.75rem',
                          color: 'rgba(29, 53, 87, 0.6)',
                          margin: 0
                        }}>
                          Due: {deadline.due}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Responsive Styles */}
      <style>{`
        @media (min-width: 1024px) {
          .events-office-left-column {
            grid-column: span 8 !important;
          }
          .events-office-right-column {
            grid-column: span 4 !important;
          }
        }
        @media (max-width: 1024px) {
          aside {
            width: 4rem !important;
          }
          aside h1, aside p, aside nav p {
            display: none !important;
          }
          .events-office-left-column,
          .events-office-right-column {
            grid-column: span 12 !important;
          }
        }
        @media (max-width: 768px) {
          aside {
            display: none !important;
          }
          main {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EventsOfficeDashboard;

