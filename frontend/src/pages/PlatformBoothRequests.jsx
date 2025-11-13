import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorRequestApi } from '../api/vendorRequestApi';
import axios from 'axios';

const PlatformBoothRequests = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [processingIds, setProcessingIds] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all', 'pending', 'accepted', 'rejected'

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadPlatformBoothRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/vendor-requests', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const allRequests = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.requests || []);

      console.log('🔍 All vendor requests:', allRequests);
      console.log('🔍 Total requests:', allRequests.length);

      // Filter for platform booth requests only
      // Platform booth requests have eventType: 'platformBooth' and no bazaar/booth references
      const platformBoothRequests = allRequests.filter(req => {
        // Check if it's explicitly marked as platformBooth
        if (req.eventType === 'platformBooth') {
          return true;
        }
        // Also check if it has no bazaar/booth references and has platform booth specific fields
        if (!req.bazaar && !req.booth && !req.standaloneBooth && req.boothLocation) {
          return true;
        }
        return false;
      });

      console.log('🔍 Platform booth requests (filtered):', platformBoothRequests);
      console.log('🔍 Platform booth requests count:', platformBoothRequests.length);
      setRequests(platformBoothRequests);
    } catch (err) {
      console.error('Error loading platform booth requests:', err);
      setError('Failed to load platform booth requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformBoothRequests();
  }, [loadPlatformBoothRequests]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setProcessingIds(prev => ({ ...prev, [requestId]: true }));
      
      const result = await vendorRequestApi.updateStatus(requestId, newStatus);
      
      if (result.success) {
        // Reload requests
        await loadPlatformBoothRequests();
      } else {
        alert(result.message || 'Failed to update request status');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Failed to update request status');
    } finally {
      setProcessingIds(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  };

  const toggleRowExpansion = (requestId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRows(newExpanded);
  };

  const formatTableDate = (dateString) => {
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

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      accepted: { bg: '#d1fae5', text: '#065f46', label: 'Accepted' },
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

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => (r.status || 'pending') === statusFilter);

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Events Office';

  // Sidebar component (same as EventsOfficeDashboard)
  const renderSidebar = () => (
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
                backgroundColor: isActiveRoute('/event-office') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
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
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/event-office') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                dashboard
              </span>
              <p style={{
                color: isActiveRoute('/event-office') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/event-office') ? '700' : '500',
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
              <p style={{
                color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/event-office/platform-booth-requests') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Platform Booths
              </p>
            </Link>

            <Link
              to="/create-bazaar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-bazaar') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-bazaar')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                storefront
              </span>
              <p style={{
                color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/create-bazaar') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Bazaars
              </p>
            </Link>

            <Link
              to="/create-trip"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-trip') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-trip')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                flight_takeoff
              </span>
              <p style={{
                color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/create-trip') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Trips
              </p>
            </Link>

            <Link
              to="/create-conference"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-conference') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-conference')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                groups
              </span>
              <p style={{
                color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/create-conference') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Conferences
              </p>
            </Link>

            <Link
              to="/create-gym-session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/create-gym-session') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/create-gym-session')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                fitness_center
              </span>
              <p style={{
                color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/create-gym-session') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Gym Sessions
              </p>
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
              <p style={{
                color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                View Gym Sessions
              </p>
            </Link>
          </nav>
        )}
      </div>

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
  );

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f8f6f6'
    }}>
      {renderSidebar()}

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
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
                fontWeight: '600'
              }}>
                {(user?.name?.[0] || user?.firstName?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #1D3557'
          }}>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              Platform Booth Requests
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Review and manage vendor platform booth reservation requests.
            </p>
          </div>

          {/* Filter Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: statusFilter === 'all' ? '#1D3557' : '#FFFFFF',
                color: statusFilter === 'all' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: statusFilter === 'all' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: statusFilter === 'pending' ? '#1D3557' : '#FFFFFF',
                color: statusFilter === 'pending' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: statusFilter === 'pending' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              Pending ({requests.filter(r => (r.status || 'pending') === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: statusFilter === 'accepted' ? '#1D3557' : '#FFFFFF',
                color: statusFilter === 'accepted' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: statusFilter === 'accepted' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              Accepted ({requests.filter(r => (r.status || 'pending') === 'accepted').length})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: statusFilter === 'rejected' ? '#1D3557' : '#FFFFFF',
                color: statusFilter === 'rejected' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: statusFilter === 'rejected' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              Rejected ({requests.filter(r => (r.status || 'pending') === 'rejected').length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Loading platform booth requests...
            </div>
          ) : error ? (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '3rem',
              borderRadius: '0.75rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>
                location_off
              </span>
              <p style={{ fontSize: '1rem', margin: 0 }}>No {statusFilter === 'all' ? '' : statusFilter} platform booth requests found.</p>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Booth Size</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date Applied</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const requestId = request._id;
                    const isExpanded = expandedRows.has(requestId);
                    const status = request.status || 'pending';
                    const isProcessing = !!processingIds[requestId];
                    const vendor = request.vendor || {};
                    const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Unknown Vendor';
                    
                    return (
                      <React.Fragment key={requestId}>
                        <tr style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#f9fafb' : '#FFFFFF'
                        }}
                        onClick={() => toggleRowExpansion(requestId)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                        >
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                            {vendorName}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.boothLocation ? request.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.boothSize || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.durationWeeks ? `${request.durationWeeks} week${request.durationWeeks > 1 ? 's' : ''}` : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatTableDate(request.createdAt)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {getStatusBadge(status)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {status === 'pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleStatusUpdate(requestId, 'accepted')}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isProcessing ? '#9ca3af' : '#059669',
                                    color: '#FFFFFF',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#047857';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#059669';
                                    }
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(requestId, 'rejected')}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isProcessing ? '#9ca3af' : '#dc2626',
                                    color: '#FFFFFF',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#b91c1c';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#dc2626';
                                    }
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '1.25rem',
                              color: '#6b7280',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}>
                              expand_more
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="8" style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Vendor Email</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {vendor.email || 'N/A'}
                                    </p>
                                  </div>
                                  {request.startDate && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Start Date</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {formatTableDate(request.startDate)}
                                      </p>
                                    </div>
                                  )}
                                  {request.boothId && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Booth ID</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {request.boothId}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {request.message && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Message</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {request.message}
                                    </p>
                                  </div>
                                )}
                                {request.attendees && request.attendees.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Attendees</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {request.attendees.map((attendee, idx) => (
                                        <div key={idx} style={{
                                          padding: '0.5rem',
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '0.25rem',
                                          fontSize: '0.875rem'
                                        }}>
                                          <strong>{attendee.name}</strong> - {attendee.email}
                                        </div>
                                      ))}
                                    </div>
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
    </div>
  );
};

export default PlatformBoothRequests;

