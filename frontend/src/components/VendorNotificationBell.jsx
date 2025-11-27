import React, { useState, useEffect, useCallback } from 'react';
import { notificationApiService } from '../api/notificationApi';
import { vendorRequestApi } from '../api/vendorRequestApi';

const formatNotificationDate = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationDisplay = (notification) => {
  const metadata = notification.metadata || {};
  const base = {
    icon: 'notifications',
    title: notification.title || 'Notification',
    message: notification.message || '',
    typeLabel: (notification.type || '').replace(/_/g, ' ')
  };

  switch (notification.type) {
    case 'vendor_request': {
      const vendorName =
        metadata.vendorName ||
        metadata.vendor ||
        notification.vendorName ||
        'Vendor';
      const eventName = metadata.eventName || notification.eventName || 'Event';
      const eventType =
        metadata.eventType ||
        (metadata.eventTypeRaw || '').replace(/_/g, ' ') ||
        'Bazaar';
      return {
        icon: 'storefront',
        title: vendorName,
        message: `${vendorName} submitted a ${eventType} request for "${eventName}".`,
        typeLabel: 'vendor request'
      };
    }
    case 'workshop_submission': {
      const professorName =
        metadata.professorName ||
        (metadata.professorFirstName && metadata.professorLastName
          ? `${metadata.professorFirstName} ${metadata.professorLastName}`
          : 'Professor');
      const workshopName =
        metadata.workshopName ||
        metadata.eventTitle ||
        notification.title?.replace('New Workshop Request: ', '') ||
        'Workshop';
      return {
        icon: 'school',
        title: `New workshop: ${workshopName}`,
        message: `${professorName} submitted a new workshop request "${workshopName}".`,
        typeLabel: 'workshop submission'
      };
    }
    case 'event_announcement': {
      const eventTitle = metadata.eventTitle || notification.title || 'Event';
      return {
        icon: 'event',
        title: eventTitle,
        message: notification.message || `New event "${eventTitle}" has been announced.`,
        typeLabel: 'event announcement'
      };
    }
    case 'event_reminder': {
      const eventTitle = metadata.eventTitle || notification.title || 'Event';
      return {
        icon: 'notifications_active',
        title: eventTitle,
        message: notification.message || `Reminder for upcoming event "${eventTitle}".`,
        typeLabel: 'event reminder'
      };
    }
    default:
      return base;
  }
};

const VendorNotificationBell = ({
  label = 'Notifications',
  bellColor = '#1D3557',
  pollIntervalMs = 30000,
  style = {}
}) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      const [generalRes, vendorRes, vendorRequestsRes] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 50 }),
        notificationApiService.getNotificationsByType('vendor_request', { limit: 50 }),
        vendorRequestApi.getPendingNotifications(25)
      ]);

      const generalNotifications =
        generalRes.success && generalRes.data?.data?.notifications
          ? generalRes.data.data.notifications
          : [];
      const vendorNotifications =
        vendorRes.success && vendorRes.data?.data?.notifications
          ? vendorRes.data.data.notifications
          : [];

      const vendorRequestItems =
        vendorRequestsRes.success && Array.isArray(vendorRequestsRes.notifications)
          ? vendorRequestsRes.notifications.map((req) => ({
              _id: `vendor_req_${req.id || req._id}`,
              type: 'vendor_request',
              title: req.vendor?.companyName || 'Vendor Request',
              message: `${req.vendor?.companyName || 'Vendor'} submitted a ${
                req.eventType?.includes('booth') ? 'Platform Booth' : 'Bazaar'
              } request for "${req.event?.name || req.eventName || 'Event'}".`,
              createdAt: req.submittedAt || req.createdAt || new Date().toISOString(),
              metadata: {
                vendorName:
                  req.vendor?.companyName ||
                  `${req.vendor?.firstName || ''} ${req.vendor?.lastName || ''}`.trim() ||
                  'Vendor',
                eventName: req.event?.name || req.eventName || 'Event',
                eventType: req.eventType?.includes('booth') ? 'Platform Booth' : 'Bazaar'
              },
              isRead: false
            }))
          : [];

      const mergedMap = new Map();
      generalNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });
      vendorNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });

      vendorRequestItems.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && !mergedMap.has(id)) mergedMap.set(id, notif);
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

      setNotifications(merged);
      setUnreadCount(merged.filter((notif) => !notif.isRead).length);

      if (!generalRes.success && !vendorRes.success) {
        setError(generalRes.message || vendorRes.message || 'Failed to load notifications');
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const notification = notifications.find((n) => n._id === notificationId || n.id === notificationId);
      if (!notification || notification.isRead) return;
      try {
        const response = await notificationApiService.markAsRead(notificationId);
        if (response.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              (notif._id || notif.id) === notificationId ? { ...notif, isRead: true } : notif
            )
          );
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationApiService.markAllAsRead();
      if (response.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const togglePanel = () => {
    if (!open) {
      loadNotifications();
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadNotifications, pollIntervalMs]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (!(event.target instanceof Element)) return;
      const panel = event.target.closest('[data-vendor-notification-panel]');
      const icon = event.target.closest('[data-vendor-notification-icon]');
      if (!panel && !icon) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', ...style }} data-vendor-notification-wrapper>
      <button
        data-vendor-notification-icon
        onClick={togglePanel}
        style={{
          position: 'relative',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          padding: '0.35rem',
          borderRadius: '9999px',
          color: bellColor,
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label={`${label} notifications`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#dc2626',
              color: '#fff',
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0 4px'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          data-vendor-notification-panel
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '420px',
            maxHeight: '500px',
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.35)',
            border: '1px solid #c7d7ff',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '0.95rem 1.2rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#eff4ff'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: bellColor }}>
                {label}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#5c6ccf' }}>
                {notifications.length === 0
                  ? 'No notifications'
                  : unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                style={{
                  border: 'none',
                  background: 'none',
                  color: unreadCount === 0 ? 'rgba(92, 108, 207, 0.4)' : bellColor,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                  padding: 0
                }}
              >
                Mark all as read
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
                aria-label="Close notifications panel"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.35rem' }}>
                  close
                </span>
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Loading notifications...
              </div>
            ) : error ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#dc2626' }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No notifications.
              </div>
            ) : (
              notifications.map((notification) => {
                const id = notification._id || notification.id;
                const { icon, title, message, typeLabel } = getNotificationDisplay(notification);

                const iconName = (() => {
                  switch (notification.type) {
                    case 'vendor_request':
                      return 'storefront';
                    case 'workshop_submission':
                      return 'school';
                    case 'event_announcement':
                      return 'event';
                    case 'event_reminder':
                      return 'notifications_active';
                    default:
                      return 'notifications';
                  }
                })();

                return (
                  <div
                    key={id}
                    onClick={() => markAsRead(id)}
                    style={{
                      padding: '0.85rem 1.1rem',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: notification.isRead ? '#ffffff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = notification.isRead ? '#f8fafc' : '#eef2ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.isRead ? '#ffffff' : '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        borderRadius: '9999px',
                        backgroundColor: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                        {iconName}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.15rem'
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: notification.isRead ? 500 : 600,
                            color: '#0f172a'
                          }}
                        >
                          {title}
                        </p>
                        {!notification.isRead && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: bellColor
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      {message && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                          {message}
                        </p>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.35rem',
                          fontSize: '0.75rem',
                          color: '#94a3b8'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize' }}>{typeLabel}</span>
                        <span>{formatNotificationDate(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorNotificationBell;


