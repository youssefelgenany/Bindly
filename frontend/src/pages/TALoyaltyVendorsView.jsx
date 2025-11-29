import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import { notificationApiService } from '../api/notificationApi';

const TALoyaltyVendorsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [copiedPromoCode, setCopiedPromoCode] = useState('');
  const copyTimeoutRef = useRef(null);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'TA';

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
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
      if (showNotificationsDropdown && !event.target.closest('[data-notifications-dropdown]')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown, showNotificationsDropdown]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);
      
      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(notificationsResult.data.data.notifications || notificationsResult.data.data || []);
      }
      
      if (countResult.success) {
        setUnreadCount(countResult.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Load notifications on mount and poll for updates
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev => prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationApiService.markAllAsRead();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Format notification date
  const formatNotificationDate = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadVendors = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const result = await vendorApi.getLoyaltyProgramVendors();
      
      if (result.success) {
        let vendorsList = result.vendors || [];
        
        // Apply search filter
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          vendorsList = vendorsList.filter(vendor => 
            (vendor.vendorName || '').toLowerCase().includes(query) ||
            (vendor.category || '').toLowerCase().includes(query) ||
            (vendor.description || '').toLowerCase().includes(query) ||
            (vendor.promoCode || '').toLowerCase().includes(query)
          );
        }
        
        setVendors(vendorsList);
      } else {
        setError(result.message || 'Failed to load vendors');
      }
    } catch (err) {
      console.error('Error loading loyalty program vendors:', err);
      setError(err.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDiscount = (rate, type) => {
    if (type === 'percentage') {
      return `${rate}%`;
    } else {
      return `EGP ${rate}`;
    }
  };

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const getVendorLogoSrc = (vendor) => {
    if (!vendor) return null;
    const candidates = [
      typeof vendor.logo === 'string' ? vendor.logo : null,
      vendor.logoUrl,
      vendor.logoPath,
      vendor.companyLogo,
      vendor.vendorLogoPath,
      vendor.logo?.url,
      vendor.logo?.path
    ].filter(Boolean);

    if (candidates.length === 0) return null;
    const raw = candidates.find((src) => typeof src === 'string' && src.trim().length > 0) || null;
    if (!raw) return null;

    const cleaned = raw.trim().replace(/\\/g, '/');
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:')) {
      return cleaned;
    }
    const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    return `${API_BASE_URL}${normalized}`;
  };

  const handleViewVendor = (vendor) => {
    setCopiedPromoCode('');
    setSelectedVendor(vendor);
    setShowVendorModal(true);
  };

  const copyPromoCode = (promoCode) => {
    if (!promoCode) return;
    navigator.clipboard.writeText(promoCode).then(() => {
      setCopiedPromoCode(promoCode);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedPromoCode('');
      }, 2500);
    }).catch(() => {
      setCopiedPromoCode('');
    });
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
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
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .banner-animate {
          animation: fadeInUp 0.8s ease-out;
        }
        .banner-content-animate {
          animation: slideInLeft 1s ease-out 0.2s both;
        }
        .search-container-animate {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .search-input-animate {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
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
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
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
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #FFFFFF' : '2px solid transparent',
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
            to="/ta/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/ta/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/ta/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/ta/events') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              explore
            </span>
            Discover Events
          </Link>
          <Link
            to="/ta/my-registrations"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/ta/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/ta/my-registrations') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/ta/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              event
            </span>
            My Events
          </Link>
          <Link
            to="/gym"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              fitness_center
            </span>
            Gym Sessions
          </Link>
          <Link
            to="/booth-polls"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/booth-polls') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/booth-polls') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/booth-polls') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              poll
            </span>
            Vendor Polls
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          {/* Heart Icon - Favorites */}
          <Link
            to="/ta/favorites"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              textDecoration: 'none',
              color: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: '1.5rem',
              color: '#FFFFFF'
            }}>
              favorite
            </span>
          </Link>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }} data-notifications-dropdown>
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowLogoutDropdown(false);
                if (!showNotificationsDropdown) {
                  loadNotifications();
                }
              }}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '1.5rem',
                color: '#FFFFFF'
              }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  backgroundColor: '#ef4444',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '1.125rem',
                  height: '1.125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  border: '2px solid #FFFFFF'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '22rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                zIndex: 1000,
                maxHeight: '32rem',
                overflowY: 'auto'
              }}>
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    margin: 0
                  }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {loadingNotifications ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    No notifications
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={async () => {
                          if (!notification.isRead) {
                            await handleMarkAsRead(notification._id);
                          }
                          if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                            navigate(`/ta/events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                            navigate(`/ta/my-registrations`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            // Already on Loyalty Partners page, just close dropdown
                            setShowNotificationsDropdown(false);
                          }
                        }}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          backgroundColor: notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
                              : '#eff6ff',
                          borderLeft: notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder') && !notification.isRead
                            ? '3px solid #ef4444'
                            : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#f9fafb' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fee2e2'
                              : '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
                              : '#eff6ff';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '0.875rem',
                              fontWeight: notification.isRead ? '400' : '600',
                              color: '#1D3557',
                              margin: 0,
                              marginBottom: '0.25rem'
                            }}>
                              {notification.title || notification.message}
                            </p>
                            {notification.message && notification.message !== notification.title && (
                              <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                margin: 0
                              }}>
                                {notification.message}
                              </p>
                            )}
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#9ca3af',
                              margin: '0.5rem 0 0 0'
                            }}>
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              borderRadius: '50%',
                              backgroundColor: '#1e40af',
                              flexShrink: 0,
                              marginTop: '0.25rem'
                            }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
              TA
            </p>
          </div>

          {/* Profile Icon */}
          <div
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              setShowLogoutDropdown(!showLogoutDropdown);
              setShowNotificationsDropdown(false);
            }}
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
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'T').toUpperCase()}
              </div>
            )}
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                zIndex: 1000,
                minWidth: '10rem',
                overflow: 'hidden'
              }}>
                <Link
                  to="/wallet"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#1D3557',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setShowLogoutDropdown(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    account_balance_wallet
                  </span>
                  My Wallet
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#1D3557',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
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

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '2rem 4rem',
        overflowY: 'auto',
        backgroundColor: '#f6f7f8'
      }}>
        {/* Content Wrapper with Margins */}
        <div style={{
          marginLeft: '0',
          marginRight: '0'
        }}>
          {/* Loyalty Program Banner with Background Image */}
          <div 
            className="banner-animate"
            style={{
              position: 'relative',
              height: '140px',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
          >
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/LoyaltyProgram.png)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)',
              transition: 'transform 0.5s ease, filter 0.5s ease'
            }}></div>
            {/* Blue Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)',
              transition: 'background-color 0.3s ease'
            }}></div>
            {/* Content */}
            <div 
              className="banner-content-animate"
              style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '2rem 2.5rem',
                color: '#FFFFFF'
              }}
            >
              <h3 style={{
                color: '#FFFFFF',
                fontSize: '1.75rem',
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                GUC Loyalty Program Partners
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                View all partner vendors offering exclusive discounts and promotions
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '0 0 2rem 0'
          }}>
            {/* Search Bar */}
            <div 
              className="search-container-animate"
              style={{
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
          <div style={{
            flex: 1,
            maxWidth: '520px',
            position: 'relative'
          }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: '1.25rem',
              pointerEvents: 'none',
              transition: 'color 0.3s ease'
            }}>
              search
            </span>
            <input
              type="text"
              placeholder="Search vendors, categories, or promo codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-animate"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 3rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                e.target.style.transform = 'scale(1.01)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'scale(1)';
              }}
            />
            </div>
          </div>

                {/* Loading State */}
            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280'
              }}>
                Loading vendors...
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                color: '#991b1b',
                marginBottom: '2rem'
              }}>
                {error}
              </div>
            )}

            {/* Vendors Grid */}
        {!loading && !error && (
          <>
            {vendors.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280'
              }}>
                {searchQuery ? 'No vendors found matching your search.' : 'No vendors available at the moment.'}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.75rem'
              }}>
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    onClick={() => handleViewVendor(vendor)}
                    style={{
                      background: 'linear-gradient(135deg, #fbf7ef 0%, #ffffff 80%)',
                      borderRadius: '1.1rem',
                      padding: '1.75rem',
                      boxShadow: '0 15px 25px -12px rgba(15, 23, 42, 0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      border: '1px solid rgba(214, 188, 138, 0.4)',
                      animation: 'fadeInUp 0.5s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 25px 35px -15px rgba(15, 23, 42, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 15px 25px -12px rgba(15, 23, 42, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    }}
                  >
                    {/* Vendor Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {(() => {
                        const logoSrc = getVendorLogoSrc(vendor);
                        const baseCircleStyle = {
                          width: '4rem',
                          height: '4rem',
                          borderRadius: '9999px',
                          border: '2px solid rgba(212, 188, 138, 0.8)',
                          backgroundColor: '#fefaf1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.15rem',
                          boxShadow: 'inset 0 0 12px rgba(212, 188, 138, 0.35)'
                        };
                        if (logoSrc) {
                          return (
                            <div style={baseCircleStyle}>
                              <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '9999px',
                                overflow: 'hidden'
                              }}>
                                <img
                                  src={logoSrc}
                                  alt={vendor.vendorName}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    display: 'block'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div style={{
                            ...baseCircleStyle,
                            border: '2px solid rgba(15, 23, 42, 0.15)',
                            backgroundColor: '#1D3557',
                            color: '#FFFFFF'
                          }}>
                            <span style={{ fontSize: '1.35rem', fontWeight: '700' }}>
                              {vendor.vendorName?.charAt(0)?.toUpperCase() || 'V'}
                            </span>
                          </div>
                        );
                      })()}
                      <div>
                        <h3 style={{
                          color: '#1D3557',
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          margin: 0,
                          marginBottom: '0.25rem'
                        }}>
                          {vendor.vendorName}
                        </h3>
                        {vendor.category && (
                          <p style={{
                        color: '#475569',
                            fontSize: '0.8rem',
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {vendor.category}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Discount Badge */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: 'linear-gradient(135deg, #e5d5b9, #c9a86a)',
                      color: '#0f172a',
                      padding: '0.6rem 1.4rem',
                      borderRadius: '9999px',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      marginBottom: '0.9rem',
                      boxShadow: '0 6px 12px -5px rgba(201, 168, 106, 0.65)'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                        local_offer
                      </span>
                      {formatDiscount(vendor.discountRate, vendor.discountType)} OFF
                    </div>

                    {/* Promo Code */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.9rem'
                    }}>
                      <span style={{
                        color: '#475569',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        Promo Code
                      </span>
                      <span style={{
                        color: '#0f172a',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        letterSpacing: '0.15em',
                        background: 'linear-gradient(135deg, #fef6e4, #f1d8a7)',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '0.4rem',
                        border: '1px solid rgba(201, 168, 106, 0.6)',
                        boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8)'
                      }}>
                        {vendor.promoCode}
                      </span>
                    </div>

                    {/* Description Preview */}
                    {vendor.description && (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: 0,
                        marginBottom: '0.75rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {vendor.description}
                      </p>
                    )}

                    {/* View Details Link */}
                    <div style={{
                      color: '#1d4ed8',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginTop: '0.75rem'
                    }}>
                      View Details
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                        arrow_forward
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
          </div>
        </div>

        {/* Vendor Details Modal */}
        {showVendorModal && selectedVendor && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => {
              setShowVendorModal(false);
              setSelectedVendor(null);
              setCopiedPromoCode('');
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.75rem',
                padding: '2rem',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}>
                <div style={{ flex: 1 }}>
                  {(() => {
                    const logoSrc = getVendorLogoSrc(selectedVendor);
                    if (logoSrc) {
                      return (
                        <div style={{
                          width: '4.25rem',
                          height: '4.25rem',
                          borderRadius: '9999px',
                          border: '2px solid rgba(99, 102, 241, 0.35)',
                          backgroundColor: '#fefaf1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem',
                          padding: '0.15rem',
                          boxShadow: 'inset 0 0 12px rgba(212, 188, 138, 0.35)'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '9999px',
                            overflow: 'hidden'
                          }}>
                            <img
                              src={logoSrc}
                              alt={selectedVendor.vendorName}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                display: 'block'
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div style={{
                        width: '4.25rem',
                        height: '4.25rem',
                        borderRadius: '9999px',
                        border: '2px solid rgba(30, 64, 175, 0.25)',
                        backgroundColor: '#1D3557',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        marginBottom: '1rem'
                      }}>
                        {selectedVendor.vendorName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  <h2 style={{
                    color: '#1D3557',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: 0,
                    marginBottom: '0.5rem'
                  }}>
                    {selectedVendor.vendorName}
                  </h2>
                  {selectedVendor.category && (
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {selectedVendor.category}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowVendorModal(false);
                    setSelectedVendor(null);
                    setCopiedPromoCode('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.5rem',
                    color: '#6b7280'
                  }}>
                    close
                  </span>
                </button>
              </div>

              {/* Discount Info */}
              <div style={{
                backgroundColor: '#eff6ff',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{
                    color: '#1e40af',
                    fontSize: '1.25rem',
                    fontWeight: '700'
                  }}>
                    {formatDiscount(selectedVendor.discountRate, selectedVendor.discountType)} OFF
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Promo Code:
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      color: '#1D3557',
                      fontSize: '1rem',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      backgroundColor: '#FFFFFF',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '2px solid #2563eb'
                    }}>
                      {selectedVendor.promoCode}
                    </span>
                    <button
                      onClick={() => copyPromoCode(selectedVendor.promoCode)}
                      style={{
                        background: '#2563eb',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#1d4ed8';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#2563eb';
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                        content_copy
                      </span>
                      Copy
                    </button>
                    {copiedPromoCode === selectedVendor.promoCode && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#15803d',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        padding: '0.4rem 0.7rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(22, 163, 74, 0.2)',
                        animation: 'fadeInUp 0.3s ease'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                          check
                        </span>
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedVendor.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    color: '#1D3557',
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '0.5rem'
                  }}>
                    About
                  </h3>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    {selectedVendor.description}
                  </p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  color: '#1D3557',
                  fontSize: '1rem',
                  fontWeight: '600',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}>
                  Terms & Conditions
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  margin: 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedVendor.termsAndConditions}
                </p>
              </div>

              {/* Validity Period */}
              {(selectedVendor.validFrom || selectedVendor.validUntil) && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    color: '#1D3557',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '0.5rem'
                  }}>
                    Validity Period
                  </h3>
                  <div style={{
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    {selectedVendor.validFrom && (
                      <p style={{ margin: 0, marginBottom: '0.25rem' }}>
                        <strong>From:</strong> {formatDate(selectedVendor.validFrom)}
                      </p>
                    )}
                    {selectedVendor.validUntil && (
                      <p style={{ margin: 0 }}>
                        <strong>Until:</strong> {formatDate(selectedVendor.validUntil)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default TALoyaltyVendorsView;
