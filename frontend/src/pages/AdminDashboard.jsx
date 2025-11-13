import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalEvents: 0,
    pendingApprovals: 0
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

      // Fetch all data in parallel
      const [statsRes, eventsRes, vendorRequestsRes, activityRes] = await Promise.all([
        axios.get('http://localhost:5000/api/dashboard/admin/stats', { headers }).catch(err => {
          console.error('Error fetching stats:', err);
          return { data: { success: false, stats: {} } };
        }),
        axios.get('http://localhost:5000/api/events', { headers }).catch(err => {
          console.error('Error fetching events:', err);
          return { data: [] };
        }),
        axios.get('http://localhost:5000/api/vendor-requests', { headers }).catch(err => {
          console.error('Error fetching vendor requests:', err);
          return { data: { success: false, requests: [] } };
        }),
        axios.get('http://localhost:5000/api/dashboard/admin/activity', { headers }).catch(err => {
          console.error('Error fetching activity:', err);
          return { data: { success: false, activities: [] } };
        })
      ]);

      // Extract stats
      if (statsRes.data?.success) {
        setStats(statsRes.data.stats || {
          totalUsers: 0,
          totalVendors: 0,
          totalEvents: 0,
          pendingApprovals: 0
        });
      }

      // Handle events response
      let events = [];
      if (Array.isArray(eventsRes.data)) {
        events = eventsRes.data;
      } else if (eventsRes.data?.success) {
        events = eventsRes.data.data || eventsRes.data.events || [];
      } else if (eventsRes.data?.events) {
        events = eventsRes.data.events;
      }

      // Handle vendor requests
      let vendorRequests = [];
      if (vendorRequestsRes.data?.success) {
        vendorRequests = vendorRequestsRes.data.requests || [];
      } else if (Array.isArray(vendorRequestsRes.data)) {
        vendorRequests = vendorRequestsRes.data;
      } else if (vendorRequestsRes.data?.requests) {
        vendorRequests = vendorRequestsRes.data.requests;
      }

      const now = new Date();

      // Generate recent activities
      const activities = [];

      // 1. Activities from admin activity endpoint
      if (activityRes.data?.success && activityRes.data.activities) {
        const adminActivities = activityRes.data.activities.map(activity => ({
          id: activity.id || activity._id,
          type: 'admin_activity',
          title: activity.eventName || activity.event || 'Activity',
          timestamp: activity.timestamp || activity.createdAt,
          icon: activity.type === 'registration' ? 'person_add' : activity.type === 'event' ? 'event' : 'info',
          action: activity.action || 'Activity',
          user: activity.user || 'System'
        }));
        activities.push(...adminActivities);
      }

      // 2. New created events (last 7 days)
      const recentEvents = events
        .filter(e => {
          const created = new Date(e.createdAt || e.created);
          const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        })
        .map(event => ({
          id: event._id,
          type: 'event_created',
          eventType: event.type,
          title: event.title || event.name,
          timestamp: event.createdAt || event.created,
          icon: getEventIcon(event.type),
          action: 'A new event was created',
          user: event.createdBy?.firstName || 'Unknown'
        }));

      // 3. Vendor requests (new, accepted, rejected)
      const recentVendorRequests = vendorRequests
        .filter(req => {
          const created = new Date(req.createdAt || req.created);
          const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        })
        .map(request => {
          const vendorName = request.vendor?.companyName || 
            `${request.vendor?.firstName || ''} ${request.vendor?.lastName || ''}`.trim() || 
            'Unknown Vendor';
          const eventName = request.event?.name || request.eventName || 'Event';
          
          let action = '';
          let icon = 'storefront';
          
          if (request.status === 'accepted') {
            action = `Vendor request accepted for ${eventName}`;
            icon = 'check_circle';
          } else if (request.status === 'rejected') {
            action = `Vendor request rejected for ${eventName}`;
            icon = 'cancel';
          } else {
            action = `New vendor request from ${vendorName} for ${eventName}`;
            icon = 'storefront';
          }
          
          return {
            id: request._id,
            type: 'vendor_request',
            eventType: request.eventType || 'bazaar',
            title: eventName,
            timestamp: request.createdAt || request.created,
            icon: icon,
            action: action,
            user: vendorName
          };
        });

      // Combine and sort all activities
      const allActivities = [...activities, ...recentEvents, ...recentVendorRequests]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
      
      setRecentActivity(allActivities);

      // Generate upcoming deadlines from events with registration deadlines
      const deadlines = events
        .filter(e => {
          if (!e.registrationDeadline) return false;
          const deadline = new Date(e.registrationDeadline);
          return deadline > now;
        })
        .map(event => {
          const deadline = new Date(event.registrationDeadline);
          const daysDiff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
          
          let dueText = '';
          let color = '#eab308';
          
          if (daysDiff === 0) {
            dueText = 'Today';
            color = '#ef4444';
          } else if (daysDiff === 1) {
            dueText = 'Tomorrow';
            color = '#ef4444';
          } else if (daysDiff <= 3) {
            dueText = `In ${daysDiff} days`;
            color = '#f97316';
          } else if (daysDiff <= 7) {
            dueText = `In ${daysDiff} days`;
            color = '#eab308';
          } else {
            dueText = `In ${daysDiff} days`;
            color = '#eab308';
          }
          
          return {
            id: event._id,
            task: `Registration deadline for ${event.title || event.name}`,
            due: dueText,
            color: color,
            deadline: deadline
          };
        })
        .sort((a, b) => a.deadline - b.deadline)
        .slice(0, 5);
      
      setUpcomingDeadlines(deadlines);
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
      'gym': 'fitness_center',
      'booth': 'storefront',
      'standaloneBooth': 'storefront'
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

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin';

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  Admin Portal
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Management
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
                  backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
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
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  dashboard
                </span>
                <p style={{
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/dashboard') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/admin/events-view"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/events-view') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/events-view')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/events-view')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/events-view') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/admin/users"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/users') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/users')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/users')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  people
                </span>
                <p style={{
                  color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/users') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Users
                </p>
              </Link>

              <Link
                to="/admin/platform-booth-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                <p style={{
                  color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/platform-booth-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
                </p>
              </Link>

              <Link
                to="/admin/manage"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/manage') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/manage')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/manage')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/manage') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  settings
                </span>
                <p style={{
                  color: isActiveRoute('/admin/manage') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/manage') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Management
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

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
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
              Bindly
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
                Admin
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'A').toUpperCase()}
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
            <>
              {/* Page Name Box */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '2rem',
                borderLeft: '4px solid #1D3557'
              }}>
                <h3 style={{
                  color: '#1D3557',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Dashboard
                </h3>
              </div>
              
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
                }}>
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
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1.5rem'
                    }}>
                      {/* Total Users Card */}
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
                              people
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Total Users
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.totalUsers}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Total Vendors Card */}
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            backgroundColor: '#d1fae5',
                            padding: '0.75rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '1.5rem' }}>
                              storefront
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Total Vendors
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.totalVendors}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Total Events Card */}
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            backgroundColor: '#fef3c7',
                            padding: '0.75rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '1.5rem' }}>
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

                      {/* Pending Approvals Card */}
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            backgroundColor: '#fee2e2',
                            padding: '0.75rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '1.5rem' }}>
                              pending_actions
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Pending Approvals
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.pendingApprovals}
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
                        <li key={`${activity.type}-${activity.id}-${index}`} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem'
                        }}>
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
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#1D3557',
                              margin: 0
                            }}>
                              {activity.user ? (
                                <>
                                  <span style={{ fontWeight: '600' }}>{activity.user}</span> {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
                                </>
                              ) : (
                                <>
                                  {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
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
                        <li style={{ color: '#6b7280', fontSize: '0.875rem' }}>No recent activity</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Right Column - Upcoming Deadlines */}
                <div style={{
                  gridColumn: 'span 12'
                }}>
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
                      Upcoming Deadlines
                    </h3>
                    {upcomingDeadlines.length > 0 ? (
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        {upcomingDeadlines.map((deadline) => (
                          <li key={deadline.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '0.375rem',
                            borderLeft: `4px solid ${deadline.color}`
                          }}>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#1D3557',
                              margin: 0,
                              flex: 1
                            }}>
                              {deadline.task}
                            </p>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: deadline.color,
                              marginLeft: '1rem'
                            }}>
                              {deadline.due}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No upcoming deadlines</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

