import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';

const VendorDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch upcoming events (accepted applications)
      const acceptedRes = await vendorApi.listMyAccepted();
      const events = Array.isArray(acceptedRes?.events) ? acceptedRes.events : [];
      setUpcomingEvents(events.slice(0, 3)); // Show first 3

      // Fetch recent applications
      const [pendingRes, rejectedRes, acceptedAppsRes] = await Promise.all([
        vendorApi.listMyRequests({ status: 'pending' }),
        vendorApi.listMyRequests({ status: 'rejected' }),
        vendorApi.listMyRequests({ status: 'accepted' })
      ]);

      const pending = Array.isArray(pendingRes?.events) ? pendingRes.events : [];
      const rejected = Array.isArray(rejectedRes?.events) ? rejectedRes.events : [];
      const accepted = Array.isArray(acceptedAppsRes?.events) ? acceptedAppsRes.events : [];

      // Calculate stats
      setStats({
        totalApplications: pending.length + rejected.length + accepted.length,
        pendingApplications: pending.length,
        acceptedApplications: accepted.length
      });

      // Combine and sort by date (most recent first)
      const allApplications = [
        ...pending.map(app => ({ ...app, status: 'pending' })),
        ...rejected.map(app => ({ ...app, status: 'rejected' })),
        ...accepted.map(app => ({ ...app, status: 'approved' }))
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateApplied || 0);
        const dateB = new Date(b.createdAt || b.dateApplied || 0);
        return dateB - dateA;
      }).slice(0, 5); // Show first 5

      setApplications(allApplications);

      // Generate notifications from applications
      const notifs = [];
      accepted.forEach(app => {
        notifs.push({
          type: 'success',
          message: `Your application for ${app.eventName || app.name || 'an event'} has been approved!`,
          time: '2 hours ago',
          icon: 'check_circle'
        });
      });
      if (pending.length > 0) {
        notifs.push({
          type: 'info',
          message: `New Event: "${pending[0].eventName || pending[0].name || 'Event'}" is now accepting applications.`,
          time: '1 day ago',
          icon: 'campaign'
        });
      }
      if (events.length > 0) {
        notifs.push({
          type: 'warning',
          message: `Payment for the ${events[0].name || events[0].title || 'upcoming event'} booth is due in 3 days.`,
          time: '2 days ago',
          icon: 'error'
        });
      }
      setNotifications(notifs.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'N/A';
    try {
      const now = new Date();
      const past = new Date(date);
      const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return '1 day ago';
      return `${diffInDays} days ago`;
    } catch {
      return formatDate(date);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' }
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.text
      }}>
        {config.label}
      </span>
    );
  };

  const getEventIcon = (type) => {
    const icons = {
      'bazaar': 'storefront',
      'booth': 'storefront',
      'trip': 'flight_takeoff',
      'conference': 'groups',
      'workshop': 'groups',
      'gym': 'fitness_center'
    };
    return icons[type?.toLowerCase()] || 'event';
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

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
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  storefront
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendor Portal
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  {user?.companyName || 'Company'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {sidebarOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/vendor"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  dashboard
                </span>
                <p style={{
                  color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/vendor/bazaars"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/bazaars') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/bazaars')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/bazaars')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/bazaars') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Bazaars
                </p>
              </Link>

              <Link
                to="/vendor/platform-booths"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/platform-booths') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/platform-booths')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/platform-booths')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/platform-booths') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
                </p>
              </Link>

              <Link
                to="/vendor/accepted-events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/accepted-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/accepted-events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/accepted-events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  check_circle
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/accepted-events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Participations
                </p>
              </Link>

              <Link
                to="/vendor/my-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/vendor/my-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/vendor/my-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/vendor/my-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  assignment
                </span>
                <p style={{
                  color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/vendor/my-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Applications
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
                Vendor
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
                {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2.5rem',
          overflowY: 'auto',
          backgroundColor: '#f8f6f6'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <p style={{ color: '#6b7280' }}>Loading...</p>
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
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1.5rem'
                    }}>
                      {/* Total Applications Card */}
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
                              assignment
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Total Applications
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.totalApplications}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pending Applications Card */}
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
                            <span className="material-symbols-outlined" style={{ color: '#92400e', fontSize: '1.5rem' }}>
                              schedule
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Pending
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.pendingApplications}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Accepted Applications Card */}
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
                            <span className="material-symbols-outlined" style={{ color: '#065f46', fontSize: '1.5rem' }}>
                              check_circle
                            </span>
                          </div>
                          <div>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              Accepted
                            </p>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.acceptedApplications}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1D3557',
                        margin: 0
                      }}>
                        Recent Applications
                      </h3>
                      <Link
                        to="/vendor/requests"
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#1D3557',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecoration = 'none';
                        }}
                      >
                        View All
                      </Link>
                    </div>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      overflow: 'hidden'
                    }}>
                      {applications.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <p style={{ margin: 0 }}>No applications yet.</p>
                          <Link
                            to="/vendor/bazaars"
                            style={{
                              color: '#1D3557',
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}
                          >
                            Find events to apply
                          </Link>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {applications.map((app, index) => (
                            <div
                              key={app._id || index}
                              style={{
                                padding: '1rem 1.5rem',
                                borderBottom: index < applications.length - 1 ? '1px solid #e5e7eb' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                              }}
                            >
                              <div style={{
                                backgroundColor: '#f3f4f6',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span className="material-symbols-outlined" style={{ color: '#1D3557', fontSize: '1.25rem' }}>
                                  {getEventIcon(app.type || app.eventType)}
                                </span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: '0 0 0.25rem 0'
                                }}>
                                  {app.eventName || app.name || 'Untitled Event'}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0
                                }}>
                                  {formatTimeAgo(app.createdAt || app.dateApplied)}
                                </p>
                              </div>
                              <div>
                                {getStatusBadge(app.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Upcoming Events and Notifications */}
                <div style={{
                  gridColumn: 'span 12',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}>
                  {/* Upcoming Events */}
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1D3557',
                      marginBottom: '1rem'
                    }}>
                      Upcoming Events
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      {upcomingEvents.length === 0 ? (
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          padding: '2rem',
                          borderRadius: '0.5rem',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          textAlign: 'center'
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                            event_busy
                          </span>
                          <p style={{ color: '#6b7280', margin: '0 0 0.5rem 0' }}>No upcoming events</p>
                          <Link
                            to="/vendor/bazaars"
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#1D3557',
                              color: '#FFFFFF',
                              borderRadius: '0.375rem',
                              textDecoration: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Find An Event
                          </Link>
                        </div>
                      ) : (
                        upcomingEvents.map((event, index) => (
                          <div
                            key={event._id || index}
                            style={{
                              backgroundColor: '#FFFFFF',
                              padding: '1.5rem',
                              borderRadius: '0.5rem',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span className="material-symbols-outlined" style={{ color: '#1D3557', fontSize: '1.5rem' }}>
                                {getEventIcon(event.type)}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: '0 0 0.25rem 0'
                                }}>
                                  {event.name || event.title || 'Untitled Event'}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0
                                }}>
                                  {formatDate(event.startDate || event.date)}
                                </p>
                              </div>
                            </div>
                            {event.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  location_on
                                </span>
                                <span>{event.location}</span>
                              </div>
                            )}
                            <Link
                              to="/vendor/accepted"
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#1D3557',
                                color: '#FFFFFF',
                                borderRadius: '0.375rem',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                textAlign: 'center',
                                display: 'block'
                              }}
                            >
                              View Details
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1D3557',
                      marginBottom: '1rem'
                    }}>
                      Notifications
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {notifications.length === 0 ? (
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1.5rem',
                          borderRadius: '0.5rem',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '0.875rem'
                        }}>
                          No notifications at this time.
                        </div>
                      ) : (
                        notifications.map((notif, index) => {
                          const iconColors = {
                            check_circle: { bg: '#d1fae5', text: '#065f46' },
                            campaign: { bg: '#dbeafe', text: '#1D3557' },
                            error: { bg: '#fee2e2', text: '#991b1b' }
                          };
                          const colors = iconColors[notif.icon] || iconColors.campaign;
                          return (
                            <div
                              key={index}
                              style={{
                                backgroundColor: '#FFFFFF',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem'
                              }}
                            >
                              <div style={{
                                backgroundColor: colors.bg,
                                padding: '0.5rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span className="material-symbols-outlined" style={{ color: colors.text, fontSize: '1rem' }}>
                                  {notif.icon}
                                </span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  color: '#111827',
                                  margin: '0 0 0.25rem 0'
                                }}>
                                  {notif.message}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0
                                }}>
                                  {notif.time}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
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

export default VendorDashboard;
