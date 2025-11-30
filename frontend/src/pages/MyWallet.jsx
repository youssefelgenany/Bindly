import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';
import { notificationApiService } from '../api/notificationApi';

const MyWallet = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const isProfessor = user?.userType === 'Professor';
  const isStaff = user?.userType === 'Staff';
  const isTA = user?.userType === 'TA';

  useEffect(() => {
    loadWalletData();
    
    // Listen for wallet refresh events (e.g., after cancellation)
    const handleWalletRefresh = () => {
      console.log('💰 Wallet refresh event received');
      loadWalletData();
      // Also refresh user object to get latest wallet balance
      if (refreshUser) {
        refreshUser();
      }
    };
    window.addEventListener('walletRefresh', handleWalletRefresh);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
      if (!e.target.closest('[data-notifications-dropdown]')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('walletRefresh', handleWalletRefresh);
    };
  }, [user]); // Add user dependency for student notifications

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/events/wallet/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('💰 Wallet API Response:', data);
        
        // Prioritize walletBalance from API response (this is the source of truth)
        let balance = data.walletBalance;
        
        // If balance is null/undefined, try to get from latest transaction's balanceAfter
        if (balance === null || balance === undefined) {
          const transactions = data.transactions || [];
          if (transactions.length > 0) {
            const latestTx = transactions[0];
            if (latestTx.balanceAfter !== null && latestTx.balanceAfter !== undefined) {
              balance = latestTx.balanceAfter;
              console.log('💰 Using balanceAfter from latest transaction:', balance);
            } else {
              // Calculate from transactions (amounts are signed: negative for payments, positive for refunds/topups)
              balance = transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
              console.log('💰 Calculated balance from transactions:', balance);
            }
          } else {
            balance = 0;
            console.log('💰 No transactions found, balance set to 0');
          }
        }
        
        // Ensure balance is a number
        balance = typeof balance === 'number' ? balance : parseFloat(balance) || 0;
        console.log('💰 Final wallet balance:', balance);
        console.log('💰 Transactions count:', (data.transactions || []).length);
        
        // Set state - this is the source of truth
        setWalletBalance(balance);
        setTransactions(data.transactions || []);
        
        // Update user object in context with latest balance
        if (updateUser) {
          updateUser({ walletBalance: balance });
        }
        
        // Also refresh user object from backend to ensure sync
        if (refreshUser) {
          try {
            await refreshUser();
          } catch (err) {
            console.error('Error refreshing user:', err);
          }
        }
      } else {
        // Fallback to user object if endpoint fails
        const fallbackBalance = user?.walletBalance || 0;
        setWalletBalance(fallbackBalance);
        console.error('Failed to load wallet data, using cached balance:', fallbackBalance);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
      // Fallback to user object on error
      const fallbackBalance = user?.walletBalance || 0;
      setWalletBalance(fallbackBalance);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'refund':
        return '#059669'; // green
      case 'payment':
        return '#dc2626'; // red
      case 'topup':
        return '#2563eb'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'refund':
        return 'arrow_forward'; // Money coming IN (right arrow)
      case 'payment':
        return 'arrow_back'; // Money going OUT (left arrow)
      case 'topup':
        return 'add';
      default:
        return 'swap_horiz';
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!isProfessor && !isTA) return;
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);

      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(
          notificationsResult.data.data.notifications ||
          notificationsResult.data.data ||
          []
        );
      }

      if (countResult.success) {
        setUnreadCount(countResult.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [isProfessor]);

  useEffect(() => {
    if (!isProfessor && !isTA) return;
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, isProfessor, isTA]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationApiService.markAllAsRead();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || user?.email || 'User';

  const userRole = user?.userType || 'User';

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const isStudent = user?.userType === 'Student';

  // Load notifications for students
  const loadStudentNotifications = useCallback(async () => {
    if (!isStudent) return;
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);

      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(
          notificationsResult.data.data.notifications ||
          notificationsResult.data.data ||
          []
        );
      }

      if (countResult.success) {
        setUnreadCount(countResult.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) return;
    loadStudentNotifications();
    const interval = setInterval(() => {
      loadStudentNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStudentNotifications, isStudent]);

  const handleStudentMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleStudentMarkAllAsRead = async () => {
    try {
      const result = await notificationApiService.markAllAsRead();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f6f7f8' }}>
      {/* Header */}
      {isStudent ? (
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
              to="/student/events"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/events') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
              to="/student/my-registrations"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/my-registrations') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
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
              to="/student/courts"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/courts') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/courts') ? '2px solid #FFFFFF' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                sports_tennis
              </span>
              Campus Courts
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
              to="/student/favorites"
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
                    loadStudentNotifications();
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
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 1001,
                  width: '360px',
                  maxHeight: '500px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e2e8f0',
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
                        onClick={handleStudentMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1e40af',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          padding: '0.25rem 0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecoration = 'none';
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{
                    overflowY: 'auto',
                    maxHeight: '400px'
                  }}>
                    {loadingNotifications ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleStudentMarkAsRead(notification._id);
                            }
                            // Handle notification redirects
                            if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                              navigate('/student/events');
                              setShowNotificationsDropdown(false);
                            } else if (
                              (notification.type === 'event_reminder' ||
                                notification.type === 'workshop_reminder' ||
                                notification.type === 'trip_reminder' ||
                                notification.type === 'gym_session_reminder') &&
                              (notification.metadata?.eventId ||
                                notification.metadata?.workshopId ||
                                notification.metadata?.tripId ||
                                notification.metadata?.gymSessionId)
                            ) {
                              navigate('/student/my-registrations');
                              setShowNotificationsDropdown(false);
                            } else if (
                              notification.type === 'new_loyalty_partner' ||
                              notification.type === 'loyalty_partner_added' ||
                              notification.type === 'loyalty_program_application' ||
                              (notification.type === 'system' && notification.metadata?.vendorId)
                            ) {
                              navigate('/student/loyalty-vendors');
                              setShowNotificationsDropdown(false);
                            }
                          }}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: notification.isRead
                              ? '#FFFFFF'
                              : (notification.priority === 'high' &&
                                (notification.type === 'event_reminder' ||
                                  notification.type === 'workshop_reminder' ||
                                  notification.type === 'trip_reminder' ||
                                  notification.type === 'gym_session_reminder'))
                                ? '#fef2f2'
                                : '#eff6ff',
                            borderLeft: notification.priority === 'high' &&
                              (notification.type === 'event_reminder' ||
                                notification.type === 'workshop_reminder' ||
                                notification.type === 'trip_reminder' ||
                                notification.type === 'gym_session_reminder') &&
                              !notification.isRead
                              ? '3px solid #ef4444'
                              : 'none',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = notification.isRead
                              ? '#f9fafb'
                              : (notification.priority === 'high' &&
                                (notification.type === 'event_reminder' ||
                                  notification.type === 'workshop_reminder' ||
                                  notification.type === 'trip_reminder' ||
                                  notification.type === 'gym_session_reminder'))
                                ? '#fee2e2'
                                : '#dbeafe';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = notification.isRead
                              ? '#FFFFFF'
                              : (notification.priority === 'high' &&
                                (notification.type === 'event_reminder' ||
                                  notification.type === 'workshop_reminder' ||
                                  notification.type === 'trip_reminder' ||
                                  notification.type === 'gym_session_reminder'))
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
                      ))
                    )}
                  </div>
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
                Student
              </p>
            </div>

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
                  {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
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
                  <Link
                    to="/wallet"
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
                      gap: '0.5rem',
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
      ) : isProfessor || isStaff || isTA ? (
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

          <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '1.25rem'
          }}>
            {isProfessor ? (
              <>
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
                  to="/professor/all-events"
                  style={{
                    textDecoration: 'none',
                    color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
                    paddingBottom: '0.5rem',
                    borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                  to="/professor/events"
                  style={{
                    textDecoration: 'none',
                    color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
                    paddingBottom: '0.5rem',
                    borderBottom: isActiveRoute('/professor/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                  to="/professor/my-workshops"
                  style={{
                    textDecoration: 'none',
                    color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/professor/my-workshops') ? '600' : '500',
                    paddingBottom: '0.5rem',
                    borderBottom: isActiveRoute('/professor/my-workshops') ? '2px solid #FFFFFF' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                    school
                  </span>
                  My Workshops
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
              </>
            ) : isStaff ? (
              <>
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
                  to="/staff/events"
                  style={{
                    textDecoration: 'none',
                    color: isActiveRoute('/staff/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/staff/events') ? '600' : '500',
                    paddingBottom: '0.5rem',
                    borderBottom: isActiveRoute('/staff/events') ? '2px solid #FFFFFF' : '2px solid transparent',
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
                  to="/staff/my-registrations"
                  style={{
                    textDecoration: 'none',
                    color: isActiveRoute('/staff/my-registrations') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/staff/my-registrations') ? '600' : '500',
                    paddingBottom: '0.5rem',
                    borderBottom: isActiveRoute('/staff/my-registrations') ? '2px solid #FFFFFF' : '2px solid transparent',
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
              </>
            ) : isTA ? (
              <>
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
              </>
            ) : null}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
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
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification._id);
                            }
                            if (isTA) {
                              // All event-related notifications redirect to discover events for TA
                              if ((notification.type === 'event_announcement' || notification.type === 'new_event' || 
                                   notification.type === 'event_reminder' || 
                                   notification.type === 'workshop_reminder' || 
                                   notification.type === 'trip_reminder' ||
                                   notification.type === 'gym_session_reminder') && 
                                  (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)) {
                                navigate('/ta/events');
                                setShowNotificationsDropdown(false);
                              } else if (
                                notification.type === 'new_loyalty_partner' || 
                                notification.type === 'loyalty_partner_added' ||
                                notification.type === 'loyalty_program_application' ||
                                (notification.type === 'system' && notification.metadata?.vendorId)
                              ) {
                                navigate('/ta/loyalty-vendors');
                                setShowNotificationsDropdown(false);
                              }
                            } else {
                              // For other user types, use existing logic
                              if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                                if (isProfessor) {
                                  navigate('/professor/all-events');
                                } else {
                                  navigate('/staff/events');
                                }
                                setShowNotificationsDropdown(false);
                              } else if (
                                (notification.type === 'event_reminder' ||
                                  notification.type === 'workshop_reminder' ||
                                  notification.type === 'trip_reminder' ||
                                  notification.type === 'gym_session_reminder') &&
                                (notification.metadata?.eventId ||
                                  notification.metadata?.workshopId ||
                                  notification.metadata?.tripId ||
                                  notification.metadata?.gymSessionId)
                              ) {
                                if (isProfessor) {
                                  navigate('/professor/events');
                                } else {
                                  navigate('/staff/my-registrations');
                                }
                                setShowNotificationsDropdown(false);
                              } else if (
                                notification.type === 'new_loyalty_partner' ||
                                notification.type === 'loyalty_partner_added' ||
                                (notification.type === 'system' && notification.metadata?.vendorId)
                              ) {
                                if (isProfessor) {
                                  navigate('/professor/loyalty-vendors');
                                } else {
                                  navigate('/staff/loyalty-vendors');
                                }
                                setShowNotificationsDropdown(false);
                              }
                            }
                          }}
                          style={isTA ? {
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: notification.isRead 
                              ? '#FFFFFF' 
                              : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                                ? '#fff7ed'
                                : '#f8fafc',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            gap: '0.75rem'
                          } : {
                            padding: '1rem',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: notification.isRead
                              ? '#FFFFFF'
                              : (notification.priority === 'high' &&
                                (notification.type === 'event_reminder' ||
                                  notification.type === 'workshop_reminder' ||
                                  notification.type === 'trip_reminder' ||
                                  notification.type === 'gym_session_reminder'))
                                ? '#fef2f2'
                                : '#eff6ff',
                            borderLeft: notification.priority === 'high' &&
                              (notification.type === 'event_reminder' ||
                                notification.type === 'workshop_reminder' ||
                                notification.type === 'trip_reminder' ||
                                notification.type === 'gym_session_reminder') &&
                              !notification.isRead
                              ? '3px solid #ef4444'
                              : 'none',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (isTA) {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#f8fafc' 
                                : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                                  ? '#ffedd5'
                                  : '#edf2ff';
                            } else {
                              e.currentTarget.style.backgroundColor = notification.isRead
                                ? '#f9fafb'
                                : (notification.priority === 'high' &&
                                  (notification.type === 'event_reminder' ||
                                    notification.type === 'workshop_reminder' ||
                                    notification.type === 'trip_reminder' ||
                                    notification.type === 'gym_session_reminder'))
                                  ? '#fee2e2'
                                  : '#dbeafe';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isTA) {
                              e.currentTarget.style.backgroundColor = notification.isRead 
                                ? '#FFFFFF' 
                                : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                                  ? '#fff7ed'
                                  : '#f8fafc';
                            } else {
                              e.currentTarget.style.backgroundColor = notification.isRead
                                ? '#FFFFFF'
                                : (notification.priority === 'high' &&
                                  (notification.type === 'event_reminder' ||
                                    notification.type === 'workshop_reminder' ||
                                    notification.type === 'trip_reminder' ||
                                    notification.type === 'gym_session_reminder'))
                                  ? '#fef2f2'
                                  : '#eff6ff';
                            }
                          }}
                        >
                          {isTA ? (
                            <>
                              <div style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '0.75rem',
                                backgroundColor: notification.priority === 'high' ? '#fef3c7' : '#e0e7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <span className="material-symbols-outlined" style={{
                                  fontSize: '1.25rem',
                                  color: notification.priority === 'high' ? '#b45309' : '#4338ca'
                                }}>
                                  {notification.type === 'event_announcement' || notification.type === 'new_event' ? 'campaign'
                                    : notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder' ? 'event'
                                    : 'notifications'}
                                </span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: notification.isRead ? '400' : '600',
                                  color: '#1D3557',
                                  fontSize: '0.875rem',
                                  marginBottom: '0.25rem'
                                }}>
                                  {notification.title || notification.message}
                                </div>
                                {notification.message && notification.message !== notification.title && (
                                  <div style={{
                                    fontSize: '0.8125rem',
                                    color: '#475569',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {notification.message}
                                  </div>
                                )}
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#9ca3af'
                                }}>
                                  {formatNotificationDate(notification.createdAt)}
                                </div>
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
                            </>
                          ) : (
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
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Heart Icon - Favorites */}
            <Link
              to={isProfessor ? "/professor/favorites" : isStaff ? "/staff/favorites" : "/ta/favorites"}
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
                {isProfessor ? 'Professor' : isStaff ? 'Staff' : 'TA'}
              </p>
            </div>
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
                  {(user?.firstName?.[0] || user?.name?.[0] || (isProfessor ? 'P' : isStaff ? 'S' : 'T')).toUpperCase()}
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
                  {(user?.userType === 'Professor' || user?.userType === 'Staff' || user?.userType === 'TA') && (
                    <Link
                      to="/wallet"
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
                        gap: '0.5rem',
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
                  )}
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
      ) : (
        <header style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
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
                {userRole}
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
                  {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
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
                  {(user?.userType === 'TA' || user?.userType === 'Staff' || user?.userType === 'Student') && (
                    <Link
                      to="/wallet"
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
                        gap: '0.5rem',
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
                  )}
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
      )}

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '2rem',
        paddingLeft: '6rem',
        paddingRight: '6rem'
      }}>
        {/* Page Title Banner */}
        <div style={{
          position: 'relative',
          height: '140px',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1
          }} />
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '2rem',
            fontWeight: '700',
            margin: 0,
            zIndex: 1
          }}>
            My Wallet
          </h1>
        </div>

        {/* Wallet Balance Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              Current Balance
            </h2>
            <span className="material-symbols-outlined" style={{
              fontSize: '2rem',
              color: '#1e40af'
            }}>
              account_balance_wallet
            </span>
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1D3557'
          }}>
            {walletBalance.toFixed(2)} EGP
          </div>
        </div>

        {/* Transactions */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            color: '#1D3557',
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            marginTop: 0
          }}>
            Transaction History
          </h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: getTransactionColor(tx.type) + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: '1.25rem',
                        color: getTransactionColor(tx.type)
                      }}>
                        {getTransactionIcon(tx.type)}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1D3557'
                      }}>
                        {tx.description || `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} Transaction`}
                      </p>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: getTransactionColor(tx.type)
                  }}>
                    {tx.type === 'payment' ? '-' : '+'}{Math.abs(tx.amount).toFixed(2)} EGP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyWallet;

