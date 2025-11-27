import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const EventsOfficeWorkshops = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [processingIds, setProcessingIds] = useState({});
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'request-edits'
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [actionData, setActionData] = useState({ 
    rejectionReason: '', 
    editRequests: '', 
    allowedUserTypes: [] 
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadWorkshops = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workshops', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allWorkshops = Array.isArray(response.data) ? response.data : [];
      setWorkshops(allWorkshops);
    } catch (err) {
      console.error('Error loading workshops:', err);
      setError(err.response?.data?.error || 'Failed to load workshops');
      setWorkshops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

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

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
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

      const mergedMap = new Map();
      notificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });
      vendorNotificationsData.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id) mergedMap.set(id, notif);
      });
      pendingVendorNotifications.forEach((notif) => {
        const id = notif?._id || notif?.id;
        if (id && !mergedMap.has(id)) mergedMap.set(id, notif);
      });
      const mergedNotifications = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );
      
      setNotifications(mergedNotifications);
      const unreadCountValue = unreadCountRes.data?.success ? unreadCountRes.data.unreadCount : 0;
      setUnreadCount(unreadCountValue);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const filteredWorkshops = workshops.filter(workshop => {
    if (filter === 'all') return true;
    return workshop.status === filter;
  });

  const toggleRow = (workshopId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workshopId)) {
        newSet.delete(workshopId);
      } else {
        newSet.add(workshopId);
      }
      return newSet;
    });
  };

  const handleApprove = async (workshopId, allowedUserTypes = []) => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/approve`,
        { allowedUserTypes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
        setShowActionModal(false);
        setSelectedWorkshop(null);
        setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
      }
    } catch (err) {
      console.error('Error approving workshop:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const handleReject = async (workshopId, rejectionReason = '') => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/reject`,
        { rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
        setShowActionModal(false);
        setSelectedWorkshop(null);
        setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
      }
    } catch (err) {
      console.error('Error rejecting workshop:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const handleRequestEdits = async (workshopId, editRequests) => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/request-edits`,
        { editRequests },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
        setShowActionModal(false);
        setSelectedWorkshop(null);
        setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
      }
    } catch (err) {
      console.error('Error requesting edits:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const openActionModal = (workshop, type) => {
    setSelectedWorkshop(workshop);
    setActionType(type);
    setShowActionModal(true);
    setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
  };

  const submitAction = () => {
    if (!selectedWorkshop) return;
    
    if (actionType === 'approve') {
      handleApprove(selectedWorkshop._id, actionData.allowedUserTypes);
    } else if (actionType === 'reject') {
      handleReject(selectedWorkshop._id, actionData.rejectionReason);
    } else if (actionType === 'request-edits') {
      if (!actionData.editRequests.trim()) {
        alert('Please provide edit requests');
        return;
      }
      handleRequestEdits(selectedWorkshop._id, actionData.editRequests);
    }
  };

  const toggleUserType = (userType) => {
    setActionData(prev => {
      const currentTypes = prev.allowedUserTypes || [];
      if (currentTypes.includes(userType)) {
        return { ...prev, allowedUserTypes: currentTypes.filter(t => t !== userType) };
      } else {
        return { ...prev, allowedUserTypes: [...currentTypes, userType] };
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'needs_edits': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'needs_edits': return 'Needs Edits';
      default: return status;
    }
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Events Office';

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
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
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
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
                </p>
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
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-partners') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
                </p>
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
                <p style={{
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Professor Workshops
                </p>
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
        overflow: 'hidden',
        backgroundColor: '#f8f6f6'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
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
                color: '#1D3557'
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
                            const notifId = notif._id || notif.id;
                            if (!notif.isRead && notifId) {
                              try {
                                const token = localStorage.getItem('token');
                                await axios.put(
                                  `http://localhost:5000/api/notifications/${notifId}/read`,
                                  {},
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setNotifications(prev => prev.map(n => 
                                  (n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n
                                ));
                                setUnreadCount(prev => Math.max(0, prev - 1));
                              } catch (err) {
                                console.error('Error marking notification as read:', err);
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
                                fontSize: '1.25rem',
                                color: !notif.isRead ? '#3b82f6' : '#6b7280'
                              }}>
                                {notif.type === 'workshop_submission' ? 'school' : 
                                 notif.type === 'vendor_request' ? 'storefront' : 
                                 notif.type === 'event_announcement' ? 'event' : 'notifications'}
                              </span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: '0.875rem',
                                fontWeight: !notif.isRead ? '600' : '500',
                                color: '#111827',
                                margin: '0 0 0.25rem 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {notif.title || 'Notification'}
                              </p>
                              <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {notif.message || ''}
                              </p>
                              <p style={{
                                fontSize: '0.625rem',
                                color: '#9ca3af',
                                margin: '0.25rem 0 0 0'
                              }}>
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{
                      padding: '3rem 1rem',
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
                backgroundColor: '#1D3557',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>


        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          paddingLeft: '6rem',
          paddingRight: '6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
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
              backgroundImage: 'url(/assets/images/workshop-background.jpg)',
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
                Professor Workshops
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                Review and manage workshops created by professors
              </p>
            </div>
          </div>
          {/* Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'nowrap',
              alignItems: 'center'
            }}>
              {['all', 'pending', 'approved', 'needs_edits', 'rejected'].map((status) => {
                const getLabel = (s) => {
                  switch(s) {
                    case 'all': return `All (${workshops.length})`;
                    case 'pending': return `Pending (${workshops.filter(w => w.status === 'pending').length})`;
                    case 'approved': return `Approved (${workshops.filter(w => w.status === 'approved').length})`;
                    case 'needs_edits': return `Needs Edits (${workshops.filter(w => w.status === 'needs_edits').length})`;
                    case 'rejected': return `Rejected (${workshops.filter(w => w.status === 'rejected').length})`;
                    default: return s;
                  }
                };
                return (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '0.5rem',
                      backgroundColor: filter === status ? '#1e40af' : '#f9fafb',
                      color: filter === status ? '#FFFFFF' : '#6b7280',
                      border: filter === status ? 'none' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: filter === status ? '600' : '500',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                      boxShadow: filter === status ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (filter !== status) {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filter !== status) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    {getLabel(status)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              color: '#DC2626',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '3rem',
              color: '#6B7280'
            }}>
              Loading workshops...
            </div>
          )}

          {/* Workshops List */}
          {!loading && filteredWorkshops.length === 0 && (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E5E7EB'
            }}>
              No workshops found with status "{filter}".
            </div>
          )}

          {!loading && filteredWorkshops.length > 0 && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', textAlign: 'left' }}>
                <thead style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Workshop Name
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Professor
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Location
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'right'
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'right'
                    }}>
                      Actions
                    </th>
                    <th style={{ padding: '1rem 1.5rem', width: '48px' }}></th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                  {filteredWorkshops.map(workshop => {
                    const isExpanded = expandedRows.has(workshop._id);
                    const isProcessing = processingIds[workshop._id];
                    const canRequestEdits = workshop.status === 'pending' || workshop.status === 'needs_edits';
                    const canReject = workshop.status !== 'rejected' && workshop.status !== 'approved';
                    const canApprove = workshop.status === 'pending' || workshop.status === 'needs_edits';

                    return (
                      <React.Fragment key={workshop._id}>
                        <tr style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#111827',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleRow(workshop._id)}
                          >
                            {workshop.workshopName || workshop.title}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleRow(workshop._id)}
                          >
                            {workshop.facultyResponsible || 'N/A'}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleRow(workshop._id)}
                          >
                            {new Date(workshop.startDate).toLocaleDateString()}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleRow(workshop._id)}
                          >
                            {workshop.location}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: `${getStatusColor(workshop.status)}20`,
                              color: getStatusColor(workshop.status)
                            }}>
                              {getStatusLabel(workshop.status)}
                            </span>
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              {canApprove && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openActionModal(workshop, 'approve');
                                  }}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: '#10B981',
                                    color: '#FFFFFF',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    opacity: isProcessing ? 0.6 : 1,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Approve'}
                                </button>
                              )}
                              {canReject && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openActionModal(workshop, 'reject');
                                  }}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #EF4444',
                                    backgroundColor: 'transparent',
                                    color: '#EF4444',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    opacity: isProcessing ? 0.6 : 1,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Reject'}
                                </button>
                              )}
                              {canRequestEdits && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openActionModal(workshop, 'request-edits');
                                  }}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #3B82F6',
                                    backgroundColor: 'transparent',
                                    color: '#3B82F6',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    opacity: isProcessing ? 0.6 : 1,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Request Edits
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            <button
                              onClick={() => toggleRow(workshop._id)}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.color = '#137fec';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#6b7280';
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                expand_more
                              </span>
                            </button>
                          </td>
                        </tr>
                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <td colSpan="7" style={{ padding: '1.5rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>SHORT DESCRIPTION</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.shortDescription}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>FULL AGENDA</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0, whiteSpace: 'pre-wrap' }}>{workshop.fullAgenda}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>START DATE & TIME</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                                    {new Date(workshop.startDate).toLocaleDateString()} at {workshop.startTime}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>END DATE & TIME</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                                    {new Date(workshop.endDate).toLocaleDateString()} at {workshop.endTime}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REGISTRATION DEADLINE</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                                    {new Date(workshop.registrationDeadline).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>CAPACITY</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.capacity} participants</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>PROFESSORS PARTICIPATING</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                                    {Array.isArray(workshop.professorsParticipating) 
                                      ? workshop.professorsParticipating.join(', ')
                                      : workshop.professorsParticipating}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REQUIRED BUDGET</p>
                                  <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                                    {workshop.requiredBudget} ({workshop.fundingSource})
                                  </p>
                                </div>
                                {workshop.extraRequiredResources && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>EXTRA RESOURCES</p>
                                    <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.extraRequiredResources}</p>
                                  </div>
                                )}
                                {workshop.rejectionReason && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REJECTION REASON</p>
                                    <p style={{ fontSize: '0.875rem', color: '#EF4444', margin: 0 }}>{workshop.rejectionReason}</p>
                                  </div>
                                )}
                                {workshop.editRequests && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>EDIT REQUESTS</p>
                                    <p style={{ fontSize: '0.875rem', color: '#3B82F6', margin: 0 }}>{workshop.editRequests}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Action Modal */}
      {showActionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setShowActionModal(false);
          setSelectedWorkshop(null);
          setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1D3557',
              margin: '0 0 1rem 0'
            }}>
              {actionType === 'approve' ? 'Approve Workshop' : 
               actionType === 'reject' ? 'Reject Workshop' : 
               'Request Edits'}
            </h2>
            
            {actionType === 'approve' && (
              <>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  margin: '0 0 1rem 0'
                }}>
                  Select which user types can access this workshop (leave empty for all users):
                </p>
                <div style={{ marginBottom: '1.5rem' }}>
                  {['Student', 'Professor', 'Staff', 'TA'].map(userType => (
                    <label key={userType} style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={actionData.allowedUserTypes?.includes(userType) || false}
                        onChange={() => toggleUserType(userType)}
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          marginRight: '0.75rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#374151' }}>{userType}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {actionType === 'reject' && (
              <>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  margin: '0 0 1.5rem 0'
                }}>
                  Please provide a reason for rejection:
                </p>
                <textarea
                  value={actionData.rejectionReason}
                  onChange={(e) => {
                    setActionData({ ...actionData, rejectionReason: e.target.value });
                  }}
                  placeholder="Enter rejection reason..."
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: '1.5rem'
                  }}
                />
              </>
            )}

            {actionType === 'request-edits' && (
              <>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  margin: '0 0 1.5rem 0'
                }}>
                  Please specify what edits are needed:
                </p>
                <textarea
                  value={actionData.editRequests}
                  onChange={(e) => {
                    setActionData({ ...actionData, editRequests: e.target.value });
                  }}
                  placeholder="Enter edit requests..."
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: '1.5rem'
                  }}
                />
              </>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedWorkshop(null);
                  setActionData({ rejectionReason: '', editRequests: '', allowedUserTypes: [] });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={processingIds[selectedWorkshop?._id]}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  cursor: processingIds[selectedWorkshop?._id] ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  opacity: processingIds[selectedWorkshop?._id] ? 0.6 : 1
                }}
              >
                {processingIds[selectedWorkshop?._id] 
                  ? 'Processing...' 
                  : actionType === 'approve' 
                    ? 'Approve' 
                    : actionType === 'reject' 
                      ? 'Reject' 
                      : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsOfficeWorkshops;

