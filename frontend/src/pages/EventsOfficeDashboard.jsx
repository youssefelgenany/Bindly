import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import EventsOfficeNotificationBell from './EventsOfficeNotificationBell';

const EventsOfficeDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    pendingApproval: 0,
    totalVendors: 0
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
      if (!token) {
        console.error('❌ No token found in localStorage');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      // Use minimal=true for events to skip vendor details and speed up dashboard loading
      const [eventsRes, vendorRequestsRes, notificationsRes, unreadCountRes, vendorNotificationsRes, pendingVendorRes, vendorsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/events?minimal=true', { headers }).catch(err => {
          console.error('Error fetching events:', err);
          return { data: [] };
        }),
        axios.get('http://localhost:5000/api/vendor-requests', { headers }).catch(err => {
          console.error('Error fetching vendor requests:', err);
          return { data: { success: false, requests: [] } };
        }),
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
        }),
        axios.get('http://localhost:5000/api/vendor/', { headers }).catch(err => {
          console.error('Error fetching vendors:', err);
          return { data: { success: false, count: 0, vendors: [] } };
        })
      ]);
      
      // Handle different response formats
      // The /api/events endpoint returns an array directly
      let events = [];
      if (Array.isArray(eventsRes.data)) {
        events = eventsRes.data;
      } else if (eventsRes.data?.success) {
        events = eventsRes.data.data || eventsRes.data.events || [];
      } else if (eventsRes.data?.events) {
        events = eventsRes.data.events;
      }
      
      let vendorRequests = [];
      if (vendorRequestsRes.data?.success) {
        vendorRequests = vendorRequestsRes.data.requests || [];
      } else if (Array.isArray(vendorRequestsRes.data)) {
        vendorRequests = vendorRequestsRes.data;
      } else if (vendorRequestsRes.data?.requests) {
        vendorRequests = vendorRequestsRes.data.requests;
      }
      
      // Handle notifications
      let notificationsData = [];
      if (notificationsRes.data?.success && notificationsRes.data.data?.notifications) {
        notificationsData = notificationsRes.data.data.notifications;
      }
      let vendorNotificationsData = [];
      if (vendorNotificationsRes.data?.success) {
        vendorNotificationsData =
          vendorNotificationsRes.data.data?.notifications ||
          vendorNotificationsRes.data.notifications ||
          [];
      }
      const pendingVendorNotifications =
        pendingVendorRes.data?.success && Array.isArray(pendingVendorRes.data.notifications)
          ? pendingVendorRes.data.notifications.map((req) => ({
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

      const mergedNotificationMap = new Map();
      notificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedNotificationMap.set(id, notif);
      });
      vendorNotificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedNotificationMap.set(id, notif);
      });
      pendingVendorNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && !mergedNotificationMap.has(id)) mergedNotificationMap.set(id, notif);
      });
      // Note: notificationsData is kept for Recent Activity section, but we don't store it in state
      
      console.log('📊 Dashboard Data:', {
        eventsCount: events.length,
        vendorRequestsCount: vendorRequests.length,
        notificationsCount: notificationsData.length
      });
      
      const now = new Date();
      
      // Calculate stats
      const totalEvents = events.length;
      const upcomingEvents = events.filter(e => {
        const startDate = new Date(e.startDate || e.start);
        return startDate > now;
      }).length;
      const pendingApproval = events.filter(e => e.status === 'pending').length;
      
      // Get vendors count
      let totalVendors = 0;
      if (vendorsRes.data?.success) {
        totalVendors = vendorsRes.data.count || (vendorsRes.data.vendors?.length || 0);
      } else if (Array.isArray(vendorsRes.data?.vendors)) {
        totalVendors = vendorsRes.data.vendors.length;
      }

      setStats({
        totalEvents,
        upcomingEvents,
        pendingApproval,
        totalVendors
      });

      // Generate recent activities from multiple sources
      const activities = [];
      
      // 1. New created events (last 7 days)
      const recentEvents = events
        .filter(e => {
          const created = new Date(e.createdAt || e.created);
          const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        })
        .map(event => {
          const eventTypeFormatted = formatEventType(event.type);
          return {
          id: event._id,
          type: 'event_created',
          eventType: event.type,
          title: event.title || event.name,
          timestamp: event.createdAt || event.created,
          icon: getEventIcon(event.type),
            action: `A new ${eventTypeFormatted}`,
            user: null
          };
        });

      // 2. Events that started today or recently
      const startedEvents = events
        .filter(e => {
          const startDate = new Date(e.startDate || e.start);
          const daysDiff = (now - startDate) / (1000 * 60 * 60 * 24);
          return daysDiff >= 0 && daysDiff <= 1; // Started today or yesterday
        })
        .map(event => ({
          id: event._id,
          type: 'event_started',
          eventType: event.type,
          title: event.title || event.name,
          timestamp: event.startDate || event.start,
          icon: getEventIcon(event.type),
          action: 'An event has started',
          user: null
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
          
          // Determine event type - check for platform booth, booth, standaloneBooth, or bazaar
          const eventTypeRaw = request.eventType || '';
          const isPlatformBooth = eventTypeRaw === 'platformBooth' || 
                                 eventTypeRaw === 'booth' || 
                                 eventTypeRaw === 'standaloneBooth' ||
                                 eventTypeRaw.toLowerCase().includes('booth');
          const eventTypeDisplay = isPlatformBooth ? 'Platform Booth' : 'Bazaar';
          
          let action = '';
          let icon = 'storefront';
          
          if (request.status === 'accepted') {
            action = `submitted a ${eventTypeDisplay} request for`;
            icon = 'check_circle';
          } else if (request.status === 'rejected') {
            action = `submitted a ${eventTypeDisplay} request for`;
            icon = 'cancel';
          } else {
            action = `submitted a ${eventTypeDisplay} request for`;
            icon = 'storefront';
          }
          
          return {
            id: request._id,
            type: 'vendor_request',
            eventType: eventTypeRaw,
            eventTypeDisplay: eventTypeDisplay,
            title: eventName,
            timestamp: request.createdAt || request.created,
            icon: icon,
            action: action,
            user: vendorName,
            status: request.status
          };
        });

      // 4. Workshop submission notifications
      const workshopNotifications = notificationsData
        .filter(notif => notif && notif.type === 'workshop_submission')
        .map(notif => {
          // Extract professor name from metadata or message
          let professorName = 'Professor';
          if (notif.metadata?.professorName) {
            professorName = notif.metadata.professorName;
          } else if (notif.metadata?.professorFirstName && notif.metadata?.professorLastName) {
            professorName = `${notif.metadata.professorFirstName} ${notif.metadata.professorLastName}`;
          } else if (notif.message) {
            // Try to extract from message: "Professor First Last created..."
            const match = notif.message.match(/Professor\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
            if (match) {
              professorName = match[1];
            }
          }
          
          return {
            id: notif._id || notif.id,
            type: 'workshop_submission',
            eventType: 'workshop',
            title: notif.metadata?.workshopName || notif.title?.replace('New Workshop Request: ', '') || 'Workshop',
            timestamp: notif.createdAt,
            icon: 'school',
            action: 'submitted a request for a new workshop',
            professorName: professorName,
            isRead: notif.isRead || false,
            notificationId: notif._id || notif.id
          };
        });
      
      console.log('📋 Workshop notifications processed:', workshopNotifications.map(n => ({
        id: n.id,
        professorName: n.professorName,
        title: n.title
      })));

      // Combine and sort all activities by timestamp
      const allActivities = [...workshopNotifications, ...recentEvents, ...startedEvents, ...recentVendorRequests]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10); // Show last 10 activities
      
      setRecentActivity(allActivities);

      // Generate upcoming deadlines from events with registration deadlines
      const deadlines = events
        .filter(e => {
          if (!e.registrationDeadline) return false;
          const deadline = new Date(e.registrationDeadline);
          return deadline > now; // Only future deadlines
        })
        .map(event => {
          const deadline = new Date(event.registrationDeadline);
          const timeDiff = deadline - now;
          const msPerMinute = 1000 * 60;
          const msPerHour = msPerMinute * 60;
          const msPerDay = msPerHour * 24;
          
          // Check if same day
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          const deadlineDate = new Date(deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          const isToday = deadlineDate.getTime() === today.getTime();
          const isTomorrow = deadlineDate.getTime() === today.getTime() + msPerDay;
          
          let dueText = '';
          let color = '#eab308'; // Default yellow
          
          if (isToday) {
            const hours = Math.floor(timeDiff / msPerHour);
            const minutes = Math.floor((timeDiff % msPerHour) / msPerMinute);
            
            if (hours > 0) {
              dueText = `In ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            } else if (minutes > 0) {
              dueText = `In ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
            } else {
              dueText = 'Very soon';
            }
            color = '#ef4444'; // Red
          } else if (isTomorrow) {
            dueText = 'Tomorrow';
            color = '#ef4444'; // Red
          } else {
            const daysDiff = Math.floor(timeDiff / msPerDay);
            if (daysDiff <= 3) {
            dueText = `In ${daysDiff} days`;
            color = '#f97316'; // Orange
          } else if (daysDiff <= 7) {
            dueText = `In ${daysDiff} days`;
            color = '#eab308'; // Yellow
          } else {
            dueText = `In ${daysDiff} days`;
            color = '#eab308'; // Yellow
            }
          }
          
          return {
            id: event._id,
            task: `Registration deadline for ${event.title || event.name}`,
            due: dueText,
            color: color,
            deadline: deadline
          };
        })
        .sort((a, b) => a.deadline - b.deadline) // Sort by deadline (nearest first)
        .slice(0, 5); // Show top 5 upcoming deadlines
      
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
      'gym': 'fitness_center'
    };
    return icons[type?.toLowerCase()] || 'event';
  };

  const formatEventType = (type) => {
    if (!type) return 'Event';
    const typeLower = type.toLowerCase();
    const typeMap = {
      'bazaar': 'Bazaar',
      'trip': 'Trip',
      'conference': 'Conference',
      'workshop': 'Workshop',
      'gym': 'Gym',
      'booth': 'Booth',
      'standalonebooth': 'Standalone Booth',
      'platformbooth': 'Platform Booth'
    };
    
    if (typeMap[typeLower]) {
      return typeMap[typeLower];
    }
    
    // Handle camelCase: "platformBooth" -> "Platform Booth"
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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
              to="/event-office/events"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/events')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/events')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                explore
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              )}
            </Link>

            <Link
              to="/event-office/vendors"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/vendors')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/vendors')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                storefront
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
                </p>
              )}
            </Link>

            <Link
              to="/event-office/loyalty-partners"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/loyalty-partners') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/loyalty-partners')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/loyalty-partners')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                card_giftcard
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-partners') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
                </p>
              )}
            </Link>

            <Link
              to="/event-office/workshops"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/workshops')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/workshops')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                school
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Professor Workshops
                </p>
              )}
            </Link>

            <Link
              to="/event-office/platform-booth-requests"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/event-office/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/event-office/platform-booth-requests')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/event-office/platform-booth-requests')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                location_on
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/platform-booth-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
                </p>
              )}
            </Link>

            <Link
              to="/gym-schedule"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/gym-schedule') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/gym-schedule')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/gym-schedule')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                calendar_month
              </span>
              {sidebarOpen && (
                <p style={{
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  View Gym Sessions
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2.5rem',
          backgroundColor: '#182e4d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF' }}>
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
                color: '#FFFFFF'
              }}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <Link to="/event-office" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <img
                src="/assets/images/bindly-logo.png"
                alt="Bindly"
              style={{ 
                  height: '3rem',
                  width: 'auto',
                cursor: 'pointer',
                  objectFit: 'contain'
                }}
              />
            </Link>
                </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Notification Bell */}
            <EventsOfficeNotificationBell />
            
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#FFFFFF',
                margin: 0
              }}>
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name || 'User'}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
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
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2.5rem 6rem',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner"></div>
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
                {/* Background Image */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url(/assets/images/dashboardimage.jpg)',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'cover',
                  filter: 'blur(2px)',
                  animation: 'pulse 4s ease-in-out infinite'
                }}></div>
                {/* Blue Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(29, 53, 87, 0.75)'
                }}></div>
                {/* Floating Decorative Elements */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '50px',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  animation: 'float 3s ease-in-out infinite',
                  zIndex: 5
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '100px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  animation: 'float 2.5s ease-in-out infinite 0.5s',
                  zIndex: 5
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
                    Overview of your events, registrations, and upcoming deadlines.
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
                    gridTemplateColumns: '1fr 1fr 1.25fr 1.25fr',
                    gap: '0.75rem',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {/* Total Events Card */}
                    <div 
                      onClick={() => navigate('/event-office/events')}
                      style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 53, 87, 0.02)';
                        e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#fef3c7',
                          padding: '0.75rem',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '1.5rem' }}>
                            event
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '0.25rem',
                            lineHeight: '1.25',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            Events
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0,
                            lineHeight: '1.2'
                          }}>
                            {stats.totalEvents}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Total Vendors Card */}
                    <div 
                      onClick={() => navigate('/event-office/vendors')}
                      style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 53, 87, 0.02)';
                        e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#d1fae5',
                          padding: '0.75rem',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '1.5rem' }}>
                            storefront
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '0.25rem',
                            lineHeight: '1.25',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            Vendors
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0,
                            lineHeight: '1.2'
                          }}>
                            {stats.totalVendors}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Events Card */}
                    <div 
                      onClick={() => navigate('/event-office/events')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 53, 87, 0.02)';
                        e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#dcfce7',
                          padding: '0.75rem',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#15803d', fontSize: '1.5rem' }}>
                            upcoming
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '0.25rem',
                            lineHeight: '1.25',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            Upcoming Events
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0,
                            lineHeight: '1.2'
                          }}>
                            {stats.upcomingEvents}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pending Approval Card */}
                    <div 
                      onClick={() => navigate('/event-office/events')}
                      style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 53, 87, 0.02)';
                        e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: '#fee2e2',
                          padding: '0.75rem',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '1.5rem' }}>
                            pending_actions
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'rgba(29, 53, 87, 0.6)',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '0.25rem',
                            lineHeight: '1.25',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            Pending Approval
                          </p>
                          <p style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            margin: 0,
                            lineHeight: '1.2'
                          }}>
                            {stats.pendingApproval}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    marginBottom: '1rem'
                  }}>
                    Recent Activity
                  </h3>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {recentActivity.length > 0 ? recentActivity.map((activity, index) => {
                      // Get redirect URL based on activity type
                      const getActivityUrl = (act) => {
                        switch (act.type) {
                          case 'vendor_request': {
                            const eventTypeRaw = act.eventType || '';
                            const isPlatformBooth = eventTypeRaw === 'platformBooth' || 
                                                   eventTypeRaw === 'booth' || 
                                                   eventTypeRaw === 'standaloneBooth' ||
                                                   eventTypeRaw.toLowerCase().includes('booth');
                            return isPlatformBooth ? '/event-office/platform-booth-requests' : '/event-office/events';
                          }
                          case 'event_created':
                          case 'event_started':
                            return '/event-office/events';
                          case 'workshop_submission':
                            return '/event-office/workshops';
                          default:
                            return null;
                        }
                      };
                      
                      const url = getActivityUrl(activity);
                      
                      return (
                        <li 
                          key={`${activity.type}-${activity.id}-${index}`} 
                          onClick={() => url && navigate(url)}
                          style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                            padding: activity.type === 'workshop_submission' && !activity.isRead ? '0.75rem' : url ? '0.5rem' : '0',
                            backgroundColor: activity.type === 'workshop_submission' && !activity.isRead 
                              ? 'rgba(59, 130, 246, 0.1)' 
                              : url 
                                ? 'transparent' 
                                : 'transparent',
                            borderRadius: (activity.type === 'workshop_submission' && !activity.isRead) || url ? '0.5rem' : '0',
                            borderLeft: activity.type === 'workshop_submission' && !activity.isRead ? '3px solid #3b82f6' : 'none',
                            cursor: url ? 'pointer' : 'default',
                            transition: url ? 'background-color 0.2s' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (url) {
                              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (url) {
                              e.currentTarget.style.backgroundColor = activity.type === 'workshop_submission' && !activity.isRead 
                                ? 'rgba(59, 130, 246, 0.1)' 
                                : 'transparent';
                            }
                          }}
                        >
                        {activity.type === 'workshop_submission' ? (
                          <div style={{
                            backgroundColor: '#dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '50%',
                            flexShrink: 0
                          }}>
                            <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '1.25rem' }}>
                              {activity.icon}
                            </span>
                          </div>
                        ) : activity.user && index === 0 ? (
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
                            margin: 0,
                            fontWeight: activity.type === 'workshop_submission' && !activity.isRead ? '600' : '400'
                          }}>
                            {activity.type === 'workshop_submission' ? (
                              <>
                                Professor <span style={{ fontWeight: '600', color: '#3b82f6' }}>{activity.professorName}</span> {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
                              </>
                            ) : activity.user ? (
                              <>
                                  <span style={{ fontWeight: '600' }}>{activity.user}</span> {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
                                </>
                              ) : activity.type === 'event_started' ? (
                                <>
                                  {activity.action} <span style={{ fontWeight: '600' }}>"{activity.title}"</span>.
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
                      );
                    }) : (
                      <li style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        No recent activity
                      </li>
                    )}
                  </ul>
                  </div>
                </div>
              </div>

              {/* Right Column - Upcoming Deadlines */}
              <div style={{
                gridColumn: 'span 12',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }} className="events-office-right-column">
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    marginBottom: '1rem'
                  }}>
                    Upcoming Deadlines
                  </h3>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    minHeight: '577px'
                  }}>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                  {upcomingDeadlines.map((deadline) => (
                            <li 
                              key={deadline.id} 
                              onClick={() => navigate(`/event-office/events?expand=${deadline.id}`)}
                              style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(29, 53, 87, 0.02)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
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
              </div>
            </div>
            </>
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

