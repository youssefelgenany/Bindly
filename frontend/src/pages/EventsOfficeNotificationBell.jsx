import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EventsOfficeNotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const handledNotificationIdsRef = useRef(new Set());
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

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationPanelOpen && 
          !event.target.closest('[data-notification-panel]') && 
          !event.target.closest('[data-notification-icon]')) {
        setNotificationPanelOpen(false);
      }
    };

    if (notificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notificationPanelOpen]);

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 10 seconds for faster updates
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [notificationsRes, unreadCountRes, vendorNotificationsRes, pendingVendorRes] = await Promise.all([
        axios.get('http://localhost:5000/api/notifications?limit=50', { headers }).catch(err => {
          console.error('Error fetching notifications:', err);
          return { data: { success: false, data: { notifications: [] } } };
        }),
        axios.get('http://localhost:5000/api/notifications/unread-count', { headers }).catch(err => {
          console.error('Error fetching unread count:', err);
          return { data: { success: false, unreadCount: 0 } };
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

      // Handle notifications - include ALL notification types (workshop_submission, event_announcement, vendor_request, etc.)
      let notificationsData = [];
      if (notificationsRes.data?.success) {
        // Try multiple response structures
        if (notificationsRes.data.data?.notifications && Array.isArray(notificationsRes.data.data.notifications)) {
          notificationsData = notificationsRes.data.data.notifications;
        } else if (Array.isArray(notificationsRes.data.data)) {
          notificationsData = notificationsRes.data.data;
        } else if (Array.isArray(notificationsRes.data.notifications)) {
          notificationsData = notificationsRes.data.notifications;
        }
      } else if (Array.isArray(notificationsRes.data)) {
        notificationsData = notificationsRes.data;
      } else if (notificationsRes.data?.data && Array.isArray(notificationsRes.data.data)) {
        notificationsData = notificationsRes.data.data;
      }
      
      // Include ALL notification types - don't filter anything out
      // This ensures workshop_submission, event_announcement, vendor_request, and all other types are shown
      console.log('📬 Raw notifications from API:', {
        success: notificationsRes.data?.success,
        responseStructure: {
          hasData: !!notificationsRes.data?.data,
          hasNotifications: !!notificationsRes.data?.data?.notifications,
          isArray: Array.isArray(notificationsRes.data),
          keys: notificationsRes.data ? Object.keys(notificationsRes.data) : []
        },
        count: notificationsData.length,
        types: notificationsData.map(n => n?.type).filter(Boolean),
        sample: notificationsData.slice(0, 5).map(n => ({
          id: n._id || n.id,
          type: n.type,
          title: n.title,
          isRead: n.isRead
        }))
      });
      
      let vendorNotificationsData = [];
      if (vendorNotificationsRes.data?.success) {
        vendorNotificationsData =
          vendorNotificationsRes.data.data?.notifications ||
          vendorNotificationsRes.data.notifications ||
          [];
      }
      // Create a set of read notification request IDs to filter out pending vendor requests that are already read
      const readVendorRequestIds = new Set();
      [...notificationsData, ...vendorNotificationsData].forEach((notif) => {
        if (notif.isRead && notif.type === 'vendor_request' && notif.metadata?.requestId) {
          readVendorRequestIds.add(notif.metadata.requestId);
        }
      });

      // Also check locally marked-as-read vendor requests (from ref for immediate access)
      const allReadVendorRequestIds = new Set([...readVendorRequestIds, ...markedAsReadVendorRequestsRef.current]);

      // Include ALL pending vendor requests, but mark them as read if they've been read
      const pendingVendorNotifications =
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
                const vendorName = req.vendor?.companyName ||
                                  `${req.vendor?.firstName || ''} ${req.vendor?.lastName || ''}`.trim() ||
                                  'Vendor';
                const eventName = req.event?.name || req.eventName || 'Event';
                
                return {
                  _id: `vendor_req_${req.id || req._id}`,
                  type: 'vendor_request',
                  title: vendorName,
                  message: `${vendorName} submitted a ${eventType} request for "${eventName}".`,
                  createdAt: req.submittedAt || req.createdAt || new Date().toISOString(),
                  metadata: {
                    requestId: requestId, // Store the actual request ID for filtering
                    vendorName: vendorName,
                    eventName: eventName,
                    eventType: eventType,
                    eventTypeRaw: eventTypeRaw // Store raw eventType for better detection
                  },
                  isRead: isRead // Mark as read if it's been read, but still show it
                };
              })
          : [];

      const mergedNotificationMap = new Map();
      
      // Add all general notifications (workshop_submission, event_announcement, etc.)
      notificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && notif) {
          mergedNotificationMap.set(id, notif);
        }
      });
      
      // Add vendor-specific notifications
      vendorNotificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && notif) {
          mergedNotificationMap.set(id, notif);
        }
      });
      
      // Add pending vendor requests
      pendingVendorNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && notif && !mergedNotificationMap.has(id)) {
          mergedNotificationMap.set(id, notif);
        }
      });
      
      const mergedNotifications = Array.from(mergedNotificationMap.values()).sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

      console.log('🔔 Final merged notifications:', {
        total: mergedNotifications.length,
        byType: mergedNotifications.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {}),
        sample: mergedNotifications.slice(0, 5).map(n => ({
          id: n._id || n.id,
          type: n.type,
          title: n.title,
          isRead: n.isRead
        }))
      });

      setNotifications(mergedNotifications);

      // Calculate unread count from merged notifications (includes pending vendor notifications)
      // This ensures the count is accurate even when new notifications arrive
      const calculatedUnreadCount = mergedNotifications.filter(n => !n.isRead).length;
      
      // Use the calculated count if it's higher than the API count (in case API doesn't include pending vendor notifications)
      const apiUnreadCount = unreadCountRes.data?.success ? unreadCountRes.data.unreadCount : 0;
      const finalUnreadCount = Math.max(calculatedUnreadCount, apiUnreadCount);
      
      setUnreadCount(finalUnreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const past = new Date(date);
    if (isNaN(past.getTime())) return 'Just now';
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  // Get the redirect URL based on notification type
  const getNotificationUrl = (notification) => {
    const metadata = notification.metadata || {};
    
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
          return '/event-office/platform-booth-requests';
        } else {
          // Bazaar requests go to events view page
          return '/event-office/events';
        }
      }
      case 'workshop_submission': {
        // Redirect to workshops page
        return '/event-office/workshops';
      }
      case 'event_announcement': {
        // Redirect to events page
        return '/event-office/events';
      }
      case 'event_reminder': {
        // Redirect to events page
        return '/event-office/events';
      }
      default:
        return null;
    }
  };

  // Get notification display text (for all notification types)
  const getNotificationDisplay = (notification) => {
    const metadata = notification.metadata || {};
    
    if (notification.type === 'vendor_request') {
      const vendorName = metadata.vendorName || notification.title || 'Vendor';
      const eventName = metadata.eventName || 'Event';
      
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
            eventType = 'Bazaar'; // Default to Bazaar
          }
        }
      }
      
      return {
        title: vendorName,
        message: `${vendorName} submitted a ${eventType} request for "${eventName}".`
      };
    }
    
    if (notification.type === 'event_announcement') {
      return {
        title: notification.title || 'New Event',
        message: notification.message || 'A new event has been added'
      };
    }
    
    if (notification.type === 'workshop_submission') {
      const professorName = metadata.professorName || 
        (metadata.professorFirstName && metadata.professorLastName 
          ? `${metadata.professorFirstName} ${metadata.professorLastName}`
          : 'Professor');
      const workshopName = metadata.workshopName || notification.title?.replace('New Workshop Request: ', '') || 'Workshop';
      return {
        title: `Workshop Request: ${workshopName}`,
        message: `Professor ${professorName} submitted a request for a new workshop "${workshopName}"`
      };
    }
    
    // Default for all other notification types
    return {
      title: notification.title || 'Notification',
      message: notification.message || ''
    };
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
      await axios.put(
        'http://localhost:5000/api/notifications/mark-all-read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Don't refresh immediately - we've already updated the UI optimistically
      // The next automatic poll (every 10 seconds) will sync with the server
      // This prevents the notifications from flickering back to unread
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // On error, refresh to get correct state from server
      await fetchNotifications();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Icon */}
      <div 
        data-notification-icon
        onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
        style={{ 
          position: 'relative', 
          cursor: 'pointer',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span className="material-symbols-outlined" style={{ 
          fontSize: '1.5rem', 
          color: '#FFFFFF'
        }}>
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
      </div>
      
      {/* Notification Panel */}
      {notificationPanelOpen && (
        <div 
          data-notification-panel
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
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#e0f2fe',
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
                onClick={() => setNotificationPanelOpen(false)}
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
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  close
                </span>
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications && notifications.length > 0 ? (
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {notifications.map((notif, idx) => (
                  <li
                    key={notif._id || notif.id || `notif-${idx}`}
                    onClick={async () => {
                      const notifId = notif._id || notif.id || `notif-${idx}`;

                      // IMPORTANT: Only mark as read when user explicitly clicks, NOT automatically
                      // This fixes the issue where notifications were being auto-marked as read
                      if (!notif.isRead && notifId) {
                        try {
                          const token = localStorage.getItem('token');

                          // If this is a pending vendor notification, track it as read (using ref for immediate access)
                          if (notif.type === 'vendor_request' && notif._id?.startsWith('vendor_req_') && notif.metadata?.requestId) {
                            markedAsReadVendorRequestsRef.current.add(notif.metadata.requestId);
                            // Persist to localStorage so it survives page refresh
                            saveMarkedVendorRequests(markedAsReadVendorRequestsRef.current);
                          }

                          // Only call API if it's a real notification (not a pending vendor notification)
                          if (!notif._id?.startsWith('vendor_req_')) {
                            await axios.put(
                              `http://localhost:5000/api/notifications/${notifId}/read`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                          }

                          // Update local state to mark as read
                          setNotifications(prev => prev.map(n => 
                            (n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n
                          ));
                          setUnreadCount(prev => Math.max(0, prev - 1));
                        } catch (err) {
                          console.error('Error marking notification as read:', err);
                        }
                      }

                      // Get the redirect URL and navigate
                      const url = getNotificationUrl(notif);
                      if (url) {
                        try {
                          setNotificationPanelOpen(false);
                          navigate(url);
                        } catch (navErr) {
                          console.error('Navigation error after clicking notification:', navErr);
                        }
                      }
                    }}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      backgroundColor: !notif.isRead ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = !notif.isRead 
                        ? 'rgba(59, 130, 246, 0.1)' 
                        : 'rgba(0, 0, 0, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = !notif.isRead 
                        ? 'rgba(59, 130, 246, 0.05)' 
                        : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{
                        backgroundColor: !notif.isRead ? '#dbeafe' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        flexShrink: 0
                      }}>
                        <span className="material-symbols-outlined" style={{ 
                          color: !notif.isRead ? '#3b82f6' : '#6b7280', 
                          fontSize: '1.25rem' 
                        }}>
                          {notif.type === 'workshop_submission' ? 'school' : 
                           notif.type === 'vendor_request' ? 'storefront' :
                           notif.type === 'event_announcement' ? 'event' :
                           notif.type === 'event_reminder' ? 'notifications_active' :
                           notif.type === 'system' ? 'info' :
                           'notifications'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        {(() => {
                          const display = getNotificationDisplay(notif);
                          if (notif.type === 'workshop_submission') {
                            return (
                              <>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: !notif.isRead ? '600' : '400',
                                  color: '#1D3557',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  Professor {notif.metadata?.professorName || 
                                    (notif.metadata?.professorFirstName && notif.metadata?.professorLastName 
                                      ? `${notif.metadata.professorFirstName} ${notif.metadata.professorLastName}`
                                      : notif.message?.match(/Professor\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/)?.[1] || 'Unknown')} submitted a request for a new workshop "{notif.metadata?.workshopName || notif.title?.replace('New Workshop Request: ', '') || 'Workshop'}"
                                </p>
                                <p style={{
                                  fontSize: '0.625rem',
                                  color: 'rgba(29, 53, 87, 0.5)',
                                  margin: 0
                                }}>
                                  {formatTimeAgo(notif.createdAt)}
                                </p>
                              </>
                            );
                          } else if (notif.type === 'event_announcement') {
                            return (
                              <>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: !notif.isRead ? '600' : '400',
                                  color: '#1D3557',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {notif.title || 'New Event'}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {notif.message || 'A new event has been added'}
                                </p>
                                <p style={{
                                  fontSize: '0.625rem',
                                  color: 'rgba(29, 53, 87, 0.5)',
                                  margin: 0
                                }}>
                                  {formatTimeAgo(notif.createdAt)}
                                </p>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: !notif.isRead ? '600' : '400',
                                  color: '#1D3557',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {display.title}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {display.message}
                                </p>
                                <p style={{
                                  fontSize: '0.625rem',
                                  color: 'rgba(29, 53, 87, 0.5)',
                                  margin: 0
                                }}>
                                  {formatTimeAgo(notif.createdAt)}
                                </p>
                              </>
                            );
                          }
                        })()}
                      </div>
                      {!notif.isRead && (
                        <div style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          flexShrink: 0,
                          marginTop: '0.5rem'
                        }}></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsOfficeNotificationBell;

