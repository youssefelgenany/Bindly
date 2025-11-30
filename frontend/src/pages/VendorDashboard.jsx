import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import PlatformBoothsModal from '../components/PlatformBoothsModal';
import VendorDocumentsModal from '../components/VendorDocumentsModal';

const VendorDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showPlatformBoothsModal, setShowPlatformBoothsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
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

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1',
      trip: '#2196F3',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      platformBooth: '#3F51B5',
      standaloneBooth: '#3F51B5',
      other: '#757575'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  const getEventTypeImage = (type) => {
    const imageMap = {
      conference: '/assets/images/conference-background.jpg',
      workshop: '/assets/images/workshop-background.jpg',
      bazaar: '/assets/images/bazaar-background.jpg',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.jpg',
      platformbooth: '/assets/images/booth-background.jpg',
      standalonebooth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type?.toLowerCase()] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
  };

  const getEventTypeLabel = (type) => {
    const typeMap = {
      bazaar: 'Bazaar',
      trip: 'Trip',
      workshop: 'Workshop',
      conference: 'Conference',
      booth: 'Booth',
      platformBooth: 'Platform Booth',
      standaloneBooth: 'Standalone Booth'
    };
    return typeMap[type?.toLowerCase()] || (type || 'Event');
  };

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (Number.isNaN(diffDays)) return null;
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
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
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2.5rem',
        backgroundColor: '#1D3557'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
          <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{
              color: '#FFFFFF',
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
        
        {/* Centered Navigation Menu */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '1.25rem'
        }}>
          <Link
            to="/vendor"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor') ? '2px solid #FFFFFF' : '2px solid transparent',
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
            to="/vendor/bazaars"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              explore
            </span>
            Discover Bazaars
          </Link>
          <Link
            to="/vendor/accepted-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              event
            </span>
            My Participations
          </Link>
          <Link
            to="/vendor/my-requests"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              description
            </span>
            My Applications
          </Link>
          <Link
            to="/vendor/loyalty-program"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/loyalty-program') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/loyalty-program') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/loyalty-program') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              badge
            </span>
            Join Loyalty Program
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(() => {
              const hasTaxCard = !!(user?.vendorTaxCardPath || user?.hasTaxCard);
              const hasLogo = !!(user?.vendorLogoPath || user?.hasLogo);
              const isVerified = hasTaxCard && hasLogo;
              
              return (
                <div
                  onClick={!isVerified ? () => setShowDocumentsModal(true) : undefined}
                  style={{
                    position: 'relative',
                    cursor: isVerified ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start',
                    marginTop: '0.125rem'
                  }}
                  onMouseEnter={!isVerified ? (e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  } : undefined}
                  onMouseLeave={!isVerified ? (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  } : undefined}
                  title={!isVerified ? "Verify Account" : undefined}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: isVerified ? '#10b981' : 'rgba(255, 255, 255, 0.7)',
                    fontVariationSettings: isVerified ? "'FILL' 1" : "'FILL' 0"
                  }}>
                    verified
                  </span>
                  {!isVerified && (
                    <div style={{
                      width: '0.25rem',
                      height: '0.25rem',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    }}></div>
                  )}
                </div>
              );
            })()}
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
                Vendor
              </p>
            </div>
            <div 
              data-profile-dropdown
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
            >
              {(() => {
                const avatarPath = user?.profilePicturePath || user?.vendorLogoPath;
                const avatarSrc = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `http://localhost:5000${avatarPath}`) : null;
                return avatarSrc ? (
                  <img src={avatarSrc} alt="User profile" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
                  </div>
                );
              })()}
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
        </div>
      </header>

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
                {/* Dashboard Banner with Background Image - Animated */}
                <div style={{
                  position: 'relative',
                  height: '140px',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  animation: 'fadeInUp 0.6s ease-out'
                }}>
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
                    @keyframes slideInRight {
                      from {
                        opacity: 0;
                        transform: translateX(30px);
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
                      marginBottom: '0.5rem',
                      animation: 'slideInRight 0.8s ease-out'
                    }}>
                      Dashboard
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      margin: 0,
                      animation: 'slideInRight 0.8s ease-out 0.2s both'
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
                  {/* Animated Vendor Loyalty Partner Ad - Tripadvisor Style Layout */}
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
                      @keyframes slideInRight {
                        from {
                          opacity: 0;
                          transform: translateX(30px);
                        }
                        to {
                          opacity: 1;
                          transform: translateX(0);
                        }
                      }
                    `}</style>
                    
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
                        {/* Store Icon - Top Left (Gold) */}
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
                            store
                          </span>
                        </div>
                        {/* Trending Icon - Top Right (Blue) */}
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
                          boxShadow: '0 4px 12px rgba(29, 53, 87, 0.3)',
                          animation: 'float 3s ease-in-out infinite 0.3s',
                          zIndex: 5,
                          border: '3px solid #1D3557'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.75rem',
                            color: '#1D3557'
                          }}>
                            trending_up
                          </span>
                        </div>
                        {/* Group Icon - Bottom Left (Green) */}
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
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          animation: 'float 3s ease-in-out infinite 0.6s',
                          zIndex: 5,
                          border: '3px solid #10b981'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.75rem',
                            color: '#10b981'
                          }}>
                            groups
                          </span>
                        </div>
                        {/* Star Icon - Bottom Right (Gold) */}
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
                            star
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
                            src="/assets/images/VendorAD.png" 
                            alt="GUC Loyalty Partner Program"
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block',
                              objectFit: 'contain',
                              borderRadius: '0.75rem',
                              transition: 'transform 0.5s ease'
                            }}
                            onError={(e) => {
                              console.error('Failed to load vendor ad image');
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
                            border: '2px solid #1D3557'
                          }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '2rem',
                              color: '#1D3557'
                            }}>
                              handshake
                            </span>
                          </div>
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#2c2c2c',
                            margin: 0
                          }}>
                            GUC Loyalty Partners
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
                          Become a Loyalty Partner<br/>Reach Thousands of Students
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
                          Join GUC's exclusive loyalty program and connect with thousands of students. Offer discounts, build brand loyalty, and grow your business with the GUC community.
                        </p>

                        {/* CTA Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/vendor/loyalty-program');
                          }}
                          style={{
                            padding: '1rem 2.5rem',
                            background: 'linear-gradient(135deg, #1D3557 0%, #2c5f8d 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '9999px',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(29, 53, 87, 0.4)',
                            animation: 'fadeInUp 1s ease-out 0.9s both'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #2c5f8d 0%, #1D3557 100%)';
                            e.target.style.transform = 'translateY(-2px) scale(1.05)';
                            e.target.style.boxShadow = '0 6px 16px rgba(29, 53, 87, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #1D3557 0%, #2c5f8d 100%)';
                            e.target.style.transform = 'translateY(0) scale(1)';
                            e.target.style.boxShadow = '0 4px 12px rgba(29, 53, 87, 0.4)';
                          }}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </div>

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
                      display: 'flex',
                      gap: '1.5rem',
                      alignItems: 'flex-start'
                    }}>
                      {/* Quick Stats Rectangle */}
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        width: 'fit-content'
                      }}>
                        {/* Total Applications Card */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem'
                        }}>
                          <div style={{
                            backgroundColor: '#dbeafe',
                            padding: '0.375rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#1D3557', fontSize: '1rem' }}>
                              assignment
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.totalApplications}
                            </p>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.75rem',
                              margin: 0
                            }}>
                              Total Applications
                            </p>
                          </div>
                        </div>

                        {/* Pending Applications Card */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem'
                        }}>
                          <div style={{
                            backgroundColor: '#fef3c7',
                            padding: '0.375rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#92400e', fontSize: '1rem' }}>
                              schedule
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.pendingApplications}
                            </p>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.75rem',
                              margin: 0
                            }}>
                              Pending
                            </p>
                          </div>
                        </div>

                        {/* Accepted Applications Card */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem'
                        }}>
                          <div style={{
                            backgroundColor: '#dcfce7',
                            padding: '0.375rem',
                            borderRadius: '50%'
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#065f46', fontSize: '1rem' }}>
                              check_circle
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{
                              color: '#1D3557',
                              fontSize: '1rem',
                              fontWeight: '700',
                              margin: 0
                            }}>
                              {stats.acceptedApplications}
                            </p>
                            <p style={{
                              color: 'rgba(29, 53, 87, 0.6)',
                              fontSize: '0.75rem',
                              margin: 0
                            }}>
                              Accepted
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Buttons Outside Rectangle */}
                      {(() => {
                        const hasTaxCard = !!(user?.vendorTaxCardPath || user?.hasTaxCard);
                        const hasLogo = !!(user?.vendorLogoPath || user?.hasLogo);
                        const isVerified = hasTaxCard && hasLogo;
                        
                        return !isVerified ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            minWidth: '250px'
                          }}>
                            {/* Verify Account Button - Only show when not verified */}
                            <button
                              onClick={() => setShowDocumentsModal(true)}
                              style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                padding: '1.25rem 1.5rem',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = '#1D3557';
                                e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#1D3557' }}>
                                verified
                              </span>
                              <span style={{
                                color: '#1D3557',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}>
                                Verify Account
                              </span>
                            </button>
                          </div>
                        ) : null;
                      })()}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {upcomingEvents.length > 0 && (
                          <Link
                            to="/vendor/accepted-events"
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #d1d5db',
                              backgroundColor: '#FFFFFF',
                              color: '#1D3557',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              textDecoration: 'none',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f9fafb';
                              e.target.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#FFFFFF';
                              e.target.style.borderColor = '#d1d5db';
                            }}
                          >
                            View More
                          </Link>
                        )}
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
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1rem'
                    }}>
                      {upcomingEvents.length === 0 ? (
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          padding: '2rem',
                          borderRadius: '0.5rem',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          textAlign: 'center',
                          gridColumn: '1 / -1'
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
                        upcomingEvents.map((event, index) => {
                          const eventType = event.type || event.eventType || 'bazaar';
                          const startDate = event.startDate || event.date;
                          const eventName = event.name || event.title || 'Untitled Event';

                          return (
                            <Link
                              key={event._id || index}
                              to="/vendor/accepted-events"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '0.75rem',
                                padding: 0,
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                textDecoration: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.borderColor = '#1e40af';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }}
                            >
                              {getEventTypeImage(eventType) && (
                                <div style={{
                                  width: '100%',
                                  height: '200px',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  backgroundColor: '#f3f4f6',
                                  flexShrink: 0
                                }}>
                                  <img
                                    src={getEventTypeImage(eventType)}
                                    alt={getEventTypeLabel(eventType)}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      objectPosition: 'center'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.style.backgroundColor = getEventTypeColor(eventType);
                                      e.target.parentElement.style.display = 'flex';
                                      e.target.parentElement.style.alignItems = 'center';
                                      e.target.parentElement.style.justifyContent = 'center';
                                      if (!e.target.parentElement.querySelector('.fallback-text')) {
                                        const fallback = document.createElement('div');
                                        fallback.className = 'fallback-text';
                                        fallback.textContent = getEventTypeFallbackText(eventType);
                                        fallback.style.color = '#FFFFFF';
                                        fallback.style.fontSize = '1rem';
                                        fallback.style.fontWeight = '700';
                                        e.target.parentElement.appendChild(fallback);
                                      }
                                    }}
                                  />
                                </div>
                              )}

                              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.5rem' }}>
                                <div style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  backgroundColor: getEventTypeColor(eventType),
                                  color: '#FFFFFF',
                                  fontSize: '0.625rem',
                                  fontWeight: '700',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  alignSelf: 'flex-start'
                                }}>
                                  {getEventTypeLabel(eventType)}
                                </div>

                                <h4 style={{
                                  color: '#1D3557',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  margin: 0,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '1.3'
                                }}>
                                  {eventName}
                                </h4>

                                {startDate && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: '#6b7280' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                      calendar_today
                                    </span>
                                    <span style={{ fontSize: '0.6875rem' }}>{formatDate(startDate)}</span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })
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

      {/* Vendor Documents Modal */}
      {showDocumentsModal && (
        <VendorDocumentsModal
          onClose={() => setShowDocumentsModal(false)}
          existingTaxCard={user?.vendorTaxCardPath}
          existingLogo={user?.vendorLogoPath}
          isVerified={!!(user?.vendorTaxCardPath && user?.vendorLogoPath)}
          onSuccess={(vendorData) => {
            // Update user context with new document paths
            if (vendorData) {
              const updatedUser = { ...user };
              if (vendorData.taxCardPath !== null && vendorData.taxCardPath !== undefined) {
                updatedUser.vendorTaxCardPath = vendorData.taxCardPath;
              }
              if (vendorData.logoPath !== null && vendorData.logoPath !== undefined) {
                updatedUser.vendorLogoPath = vendorData.logoPath;
              }
              updatedUser.hasTaxCard = vendorData.hasTaxCard !== undefined ? vendorData.hasTaxCard : !!vendorData.taxCardPath;
              updatedUser.hasLogo = vendorData.hasLogo !== undefined ? vendorData.hasLogo : !!vendorData.logoPath;
              updateUser(updatedUser);
            }
          }}
        />
      )}
    </div>
  );
};

export default VendorDashboard;
