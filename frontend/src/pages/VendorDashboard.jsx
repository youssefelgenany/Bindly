import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import PlatformBoothsModal from '../components/PlatformBoothsModal';

const VendorDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showPlatformBoothsModal, setShowPlatformBoothsModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
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

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutDropdown && event.target instanceof Element && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutDropdown]);

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
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/vendor') {
      return currentPath === '/vendor';
    }
    return currentPath.startsWith(path);
  };

  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

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
          <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
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
              Vendor
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
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/vendor"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/vendor/bazaars"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/bazaars') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Bazaars
          </Link>
          <Link
            to="/vendor/accepted-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/accepted-events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Participations
          </Link>
          <Link
            to="/vendor/my-requests"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/my-requests') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Applications
          </Link>
          <Link
            to="/vendor/loyalty-program"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/loyalty-program') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/loyalty-program') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/loyalty-program') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            GUC Loyalty Program
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

        {/* Content Area */}
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
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <p style={{ color: '#6b7280' }}>Loading...</p>
              </div>
            ) : (
              <>
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
                      Overview of your applications, participations, and upcoming events.
                    </p>
                  </div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1D3557',
                        margin: 0
                      }}>
                        Upcoming Events
                      </h3>
                      <button
                        onClick={() => setShowPlatformBoothsModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: '#1D3557',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          height: 'fit-content'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#152843';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#1D3557';
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                          add
                        </span>
                        New Booth
                      </button>
                    </div>
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
        </div>
      </main>

      {/* Platform Booths Modal */}
      <PlatformBoothsModal
        isOpen={showPlatformBoothsModal}
        onClose={() => setShowPlatformBoothsModal(false)}
        onSuccess={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};

export default VendorDashboard;
