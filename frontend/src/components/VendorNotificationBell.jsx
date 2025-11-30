import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
      
      // Determine event type - prioritize metadata.eventType, then check eventTypeRaw
      let eventType = metadata.eventType;
      if (!eventType) {
        // Check eventTypeRaw for platform booth indicators
        const eventTypeRaw = metadata.eventTypeRaw || '';
        if (eventTypeRaw === 'platformBooth' || 
            eventTypeRaw === 'booth' || 
            eventTypeRaw === 'standaloneBooth' ||
            eventTypeRaw.toLowerCase().includes('booth')) {
          eventType = 'Platform Booth';
        } else {
          // Check notification message as fallback
          const message = notification.message || '';
          if (message.includes('Platform Booth') || message.includes('platform booth')) {
            eventType = 'Platform Booth';
          } else {
            eventType = 'Bazaar'; // Default to Bazaar
          }
        }
      }
      
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
  bellColor = '#FFFFFF',
  pollIntervalMs = 30000,
  style = {},
  managePath = '/admin/platform-booth-requests' // Default path for vendor requests
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Use ref instead of state so it's immediately available (not async)
  // Load from localStorage on mount to persist across page refreshes
  const getInitialMarkedVendorRequests = () => {
    try {
      const stored = localStorage.getItem('markedAsReadVendorRequests');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading marked vendor requests from localStorage:', error);
    }
    return new Set();
  };
  const markedAsReadVendorRequestsRef = useRef(getInitialMarkedVendorRequests());

  // Helper function to save marked vendor requests to localStorage
  const saveMarkedVendorRequests = (set) => {
    try {
      localStorage.setItem('markedAsReadVendorRequests', JSON.stringify(Array.from(set)));
    } catch (error) {
      console.error('Error saving marked vendor requests to localStorage:', error);
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        setError('Authentication required');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [notificationsRes, vendorNotificationsRes, pendingVendorRes] = await Promise.all([
        axios.get('http://localhost:5000/api/notifications?limit=50', { headers }).catch(err => {
          console.error('Error fetching notifications:', err);
          return { data: { success: false, data: { notifications: [] } } };
        }),
        axios.get('http://localhost:5000/api/notifications/by-type/vendor_request?limit=50', { headers }).catch(err => {
          console.error('Error fetching vendor notifications:', err);
          return { data: { success: false, data: { notifications: [] } } };
        }),
        axios.get('http://localhost:5000/api/vendor-requests/pending/notifications?limit=25', { headers }).catch(err => {
          console.error('Error fetching pending vendor notifications:', err);
          return { data: { success: false, notifications: [] } };
        })
      ]);

      // Handle notifications response
      let generalNotifications = [];
      if (notificationsRes.data?.success) {
        // API returns { success: true, data: { notifications, total, unreadCount, ... } }
        if (notificationsRes.data.data?.notifications && Array.isArray(notificationsRes.data.data.notifications)) {
          generalNotifications = notificationsRes.data.data.notifications;
        } else if (Array.isArray(notificationsRes.data.data)) {
          generalNotifications = notificationsRes.data.data;
        } else if (Array.isArray(notificationsRes.data.notifications)) {
          generalNotifications = notificationsRes.data.notifications;
        }
      } else if (Array.isArray(notificationsRes.data)) {
        generalNotifications = notificationsRes.data;
      } else if (notificationsRes.data?.data && Array.isArray(notificationsRes.data.data)) {
        generalNotifications = notificationsRes.data.data;
      }

      // Handle vendor notifications response
      let vendorNotifications = [];
      if (vendorNotificationsRes.data?.success) {
        // API returns { success: true, data: { notifications, total, unreadCount, ... } }
        if (vendorNotificationsRes.data.data?.notifications && Array.isArray(vendorNotificationsRes.data.data.notifications)) {
          vendorNotifications = vendorNotificationsRes.data.data.notifications;
        } else if (Array.isArray(vendorNotificationsRes.data.data)) {
          vendorNotifications = vendorNotificationsRes.data.data;
        } else if (Array.isArray(vendorNotificationsRes.data.notifications)) {
          vendorNotifications = vendorNotificationsRes.data.notifications;
        }
      } else if (Array.isArray(vendorNotificationsRes.data)) {
        vendorNotifications = vendorNotificationsRes.data;
      } else if (vendorNotificationsRes.data?.data && Array.isArray(vendorNotificationsRes.data.data)) {
        vendorNotifications = vendorNotificationsRes.data.data;
      }

      console.log('📬 Raw API Responses:', {
        generalRes: notificationsRes.data,
        vendorRes: vendorNotificationsRes.data,
        pendingRes: pendingVendorRes.data,
        generalCount: generalNotifications.length,
        vendorCount: vendorNotifications.length,
        generalNotifications: generalNotifications,
        vendorNotifications: vendorNotifications
      });

      // Debug: Log if we're not getting notifications
      if (generalNotifications.length === 0 && vendorNotifications.length === 0) {
        console.warn('⚠️ No notifications found from API. Response structures:', {
          generalResponseStructure: {
            success: notificationsRes.data?.success,
            hasData: !!notificationsRes.data?.data,
            hasNotifications: !!notificationsRes.data?.data?.notifications,
            isArray: Array.isArray(notificationsRes.data?.data),
            keys: notificationsRes.data ? Object.keys(notificationsRes.data) : []
          },
          vendorResponseStructure: {
            success: vendorNotificationsRes.data?.success,
            hasData: !!vendorNotificationsRes.data?.data,
            hasNotifications: !!vendorNotificationsRes.data?.data?.notifications,
            isArray: Array.isArray(vendorNotificationsRes.data?.data),
            keys: vendorNotificationsRes.data ? Object.keys(vendorNotificationsRes.data) : []
          }
        });
      }

      // Create a set of read notification request IDs to track which vendor requests have been read
      // But we'll still show them - we just need to mark them as read
      const readVendorRequestIds = new Set();
      [...generalNotifications, ...vendorNotifications].forEach((notif) => {
        if (notif.isRead && notif.type === 'vendor_request' && notif.metadata?.requestId) {
          readVendorRequestIds.add(notif.metadata.requestId);
        }
      });

      // Also check locally marked-as-read vendor requests (from ref for immediate access)
      const allReadVendorRequestIds = new Set([...readVendorRequestIds, ...markedAsReadVendorRequestsRef.current]);

      // Include ALL pending vendor requests, but mark them as read if they've been read
      const vendorRequestItems =
        pendingVendorRes.data?.success && Array.isArray(pendingVendorRes.data.notifications)
          ? pendingVendorRes.data.notifications
              .map((req) => {
                const requestId = String(req.id || req._id);
                const isRead = allReadVendorRequestIds.has(requestId);
                
                // Determine event type - check for platform booth, booth, standaloneBooth, or bazaar
                const eventTypeRaw = req.eventType || '';
                const isPlatformBooth = eventTypeRaw === 'platformBooth' || 
                                       eventTypeRaw === 'booth' || 
                                       eventTypeRaw === 'standaloneBooth' ||
                                       eventTypeRaw.toLowerCase().includes('booth');
                const eventType = isPlatformBooth ? 'Platform Booth' : 'Bazaar';
                
                return {
                  _id: `vendor_req_${req.id || req._id}`,
                  type: 'vendor_request',
                  title: req.vendor?.companyName || 'Vendor Request',
                  message: `${req.vendor?.companyName || 'Vendor'} submitted a ${eventType} request for "${req.event?.name || req.eventName || 'Event'}".`,
                  createdAt: req.submittedAt || req.createdAt || new Date().toISOString(),
                  metadata: {
                    requestId: requestId, // Store the actual request ID for filtering
                    vendorName:
                      req.vendor?.companyName ||
                      `${req.vendor?.firstName || ''} ${req.vendor?.lastName || ''}`.trim() ||
                      'Vendor',
                    eventName: req.event?.name || req.eventName || 'Event',
                    eventType: eventType,
                    eventTypeRaw: eventTypeRaw // Store raw eventType for better detection
                  },
                  isRead: isRead // Mark as read if it's been read, but still show it
                };
              })
          : [];

      // Merge all notifications - include ALL general and vendor notifications (both read and unread)
      const mergedMap = new Map();
      generalNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });
      vendorNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });

      // Add pending vendor requests that haven't been marked as read
      vendorRequestItems.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && !mergedMap.has(id)) mergedMap.set(id, notif);
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

      console.log('🔔 Admin Notifications loaded:', {
        general: generalNotifications.length,
        vendor: vendorNotifications.length,
        pending: vendorRequestItems.length,
        total: merged.length,
        mergedNotifications: merged.slice(0, 5), // Log first 5 for debugging
        allGeneralIds: generalNotifications.map(n => n._id || n.id),
        allVendorIds: vendorNotifications.map(n => n._id || n.id),
        allPendingIds: vendorRequestItems.map(n => n._id || n.id),
        mergedIds: merged.map(n => n._id || n.id)
      });

      // Always set notifications, even if empty (so we can see "No notifications" message)
      setNotifications(merged);
      const unread = merged.filter((notif) => !notif.isRead);
      console.log('📊 Unread count:', unread.length, 'out of', merged.length);
      setUnreadCount(unread.length);

      if (!notificationsRes.data?.success && !vendorNotificationsRes.data?.success) {
        setError('Failed to load notifications');
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

  // Get the redirect URL based on notification type
  // This function determines the appropriate page based on the current user's role
  const getNotificationUrl = useCallback((notification) => {
    const metadata = notification.metadata || {};
    
    // Determine if we're on an Admin or Events Office page based on managePath
    const isAdmin = managePath?.includes('/admin') || !managePath?.includes('/event-office');
    const basePath = isAdmin ? '/admin' : '/event-office';
    
    switch (notification.type) {
      case 'vendor_request': {
        // Determine event type - prioritize metadata.eventType, then check eventTypeRaw
        let eventType = metadata.eventType || '';
        
        if (!eventType) {
          // Check eventTypeRaw for platform booth indicators
          const eventTypeRaw = metadata.eventTypeRaw || '';
          if (eventTypeRaw === 'platformBooth' || 
              eventTypeRaw === 'booth' || 
              eventTypeRaw === 'standaloneBooth' ||
              eventTypeRaw.toLowerCase().includes('booth')) {
            eventType = 'Platform Booth';
          } else {
            // Check notification message as fallback
            const message = notification.message || '';
            if (message.includes('Platform Booth') || message.includes('platform booth')) {
              eventType = 'Platform Booth';
            } else {
              eventType = 'Bazaar';
            }
          }
        }
        
        // Platform booth requests go to platform booth requests page
        if (eventType === 'Platform Booth' || 
            eventType.includes('Booth') || 
            eventType.includes('Platform')) {
          return isAdmin ? '/admin/platform-booth-requests' : '/event-office/platform-booth-requests';
        } else {
          // Bazaar requests go to events view page (AdminEventsView)
          return isAdmin ? '/admin/events-view' : '/event-office/events';
        }
      }
      case 'workshop_submission': {
        // Redirect to workshops page
        return isAdmin ? '/admin/events-view?type=workshops' : '/event-office/workshops';
      }
      case 'event_announcement': {
        // Redirect to events page
        return isAdmin ? '/admin/events-view' : '/event-office/events';
      }
      case 'event_reminder': {
        // Redirect to events page
        return isAdmin ? '/admin/events-view' : '/event-office/events';
      }
      default:
        return null;
    }
  }, [managePath]);

  const handleNotificationClick = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const notification = notifications.find((n) => n._id === notificationId || n.id === notificationId);
      if (!notification) return;
      
      // Get the redirect URL
      const url = getNotificationUrl(notification);
      
      // Mark as read first
      await markAsRead(notificationId);
      
      // Close the notification panel
      setOpen(false);
      
      // Navigate to the appropriate page
      if (url) {
        navigate(url);
      }
    },
    [notifications, getNotificationUrl, navigate]
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const notification = notifications.find((n) => n._id === notificationId || n.id === notificationId);
      if (!notification) return;
      
      // Don't do anything if already read (but don't return early - allow re-marking)
      if (notification.isRead) {
        console.log('Notification already marked as read:', notificationId);
        return;
      }
      
      // If this is a pending vendor notification, track it as read (using ref for immediate access)
      if (notification.type === 'vendor_request' && notification._id?.startsWith('vendor_req_') && notification.metadata?.requestId) {
        markedAsReadVendorRequestsRef.current.add(notification.metadata.requestId);
        // Persist to localStorage so it survives page refresh
        saveMarkedVendorRequests(markedAsReadVendorRequestsRef.current);
      }
      
      // Optimistically update the UI immediately (before API call)
      setNotifications((prev) =>
        prev.map((notif) =>
          (notif._id || notif.id) === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      
      try {
        // Only call API if it's a real notification (not a pending vendor notification)
        if (!notification._id?.startsWith('vendor_req_')) {
          const response = await notificationApiService.markAsRead(notificationId);
          if (!response.success) {
            // If API call failed, revert the optimistic update
            console.error('Failed to mark notification as read via API, reverting:', response);
            setNotifications((prev) =>
              prev.map((notif) =>
                (notif._id || notif.id) === notificationId ? { ...notif, isRead: false } : notif
              )
            );
            setUnreadCount((prev) => prev + 1);
          } else {
            console.log('✅ Notification marked as read successfully:', notificationId);
          }
        } else {
          console.log('✅ Pending vendor notification marked as read locally:', notificationId);
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        // Revert optimistic update on error
        setNotifications((prev) =>
          prev.map((notif) =>
            (notif._id || notif.id) === notificationId ? { ...notif, isRead: false } : notif
          )
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      // Collect all pending vendor request IDs that need to be tracked as read
      const pendingVendorRequestIds = notifications
        .filter(n => n.type === 'vendor_request' && n._id?.startsWith('vendor_req_') && !n.isRead)
        .map(n => n.metadata?.requestId)
        .filter(id => id);

      // Add them to the marked-as-read ref immediately (synchronous)
      if (pendingVendorRequestIds.length > 0) {
        pendingVendorRequestIds.forEach(id => markedAsReadVendorRequestsRef.current.add(id));
        // Persist to localStorage so it survives page refresh
        saveMarkedVendorRequests(markedAsReadVendorRequestsRef.current);
      }

      // Immediately update local state to show all as read (optimistic update)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      // Mark all notifications as read via API
      await notificationApiService.markAllAsRead();

      // Don't refresh immediately - we've already updated the UI optimistically
      // The next automatic poll will sync with the server
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [notifications]);

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
          <div style={{
            position: 'absolute',
            top: '0.25rem',
            right: '0.25rem',
            backgroundColor: '#ef4444',
            color: '#FFFFFF',
            borderRadius: '50%',
            width: '1.25rem',
            height: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: '600',
            border: '2px solid #FFFFFF'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
      {open && (
        <div
          data-vendor-notification-panel
          style={{
            position: 'absolute',
            top: '3.5rem',
            right: '0',
            width: '24rem',
            maxHeight: '32rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1D3557',
              margin: 0
            }}>
              {label}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: unreadCount > 0 ? 'pointer' : 'default',
                  padding: 0,
                  color: unreadCount > 0 ? '#2563eb' : '#9ca3af',
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                  fontWeight: '500',
                  opacity: unreadCount > 0 ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (unreadCount > 0) {
                    e.currentTarget.style.color = '#1d4ed8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (unreadCount > 0) {
                    e.currentTarget.style.color = '#2563eb';
                  } else {
                    e.currentTarget.style.color = '#9ca3af';
                  }
                }}
              >
                Mark all as read
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
                aria-label="Close notifications panel"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
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
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {notifications.map((notification, idx) => {
                  const id = notification._id || notification.id || `notif-${idx}`;
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
                    <li
                      key={id}
                      onClick={() => handleNotificationClick(id)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        backgroundColor: !notification.isRead ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = !notification.isRead 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(0, 0, 0, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = !notification.isRead 
                          ? 'rgba(59, 130, 246, 0.05)' 
                          : 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{
                          backgroundColor: !notification.isRead ? '#dbeafe' : '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ 
                            color: !notification.isRead ? '#3b82f6' : '#6b7280', 
                            fontSize: '1.25rem' 
                          }}>
                            {iconName}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '0.875rem',
                            fontWeight: !notification.isRead ? '600' : '400',
                            color: '#1D3557',
                            margin: 0,
                            marginBottom: '0.25rem'
                          }}>
                            {title}
                          </p>
                          {message && (
                            <p style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              margin: 0,
                              marginBottom: '0.25rem'
                            }}>
                              {message}
                            </p>
                          )}
                          <p style={{
                            fontSize: '0.625rem',
                            color: 'rgba(29, 53, 87, 0.5)',
                            margin: 0
                          }}>
                            {formatNotificationDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorNotificationBell;


