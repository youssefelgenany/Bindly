import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorRequestApi } from '../api/vendorRequestApi';
import axios from 'axios';
import VendorNotificationBell from '../components/VendorNotificationBell';

const AdminPlatformBoothRequests = () => {
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

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin';

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                Admin Portal
              </h1>
              <p style={{
                color: 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: '400',
                lineHeight: 'normal',
                margin: 0
              }}>
                Platform Management
              </p>
            </div>
          </div>
        )}

        {sidebarOpen && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link
              to="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/dashboard')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/dashboard')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '1.25rem'
              }}>
                dashboard
              </span>
              <p style={{
                color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/dashboard') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Dashboard
              </p>
            </Link>

            <Link
              to="/admin/events-view"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/admin/events-view') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/admin/events-view')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/admin/events-view')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '1.25rem'
              }}>
                explore
              </span>
              <p style={{
                color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/admin/events-view') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Discover Events
              </p>
            </Link>

            <Link
              to="/admin/users"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/admin/users') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/admin/users')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/admin/users')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '1.25rem'
              }}>
                people
              </span>
              <p style={{
                color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/admin/users') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Users
              </p>
            </Link>

            <Link
              to="/admin/loyalty-program-vendors"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/admin/loyalty-program-vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/admin/loyalty-program-vendors')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/admin/loyalty-program-vendors')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: isActiveRoute('/admin/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '1.25rem'
              }}>
                local_offer
              </span>
              <p style={{
                color: isActiveRoute('/admin/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/admin/loyalty-program-vendors') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Loyalty Partners
              </p>
            </Link>

            <Link
              to="/admin/platform-booth-requests"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/admin/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/admin/platform-booth-requests')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/admin/platform-booth-requests')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '1.25rem'
              }}>
                location_on
              </span>
              <p style={{
                color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/admin/platform-booth-requests') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Platform Booths
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2.5rem',
          backgroundColor: '#1D3557'
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
            <h2 style={{
              color: '#FFFFFF',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0
            }}>
              Bindly
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <VendorNotificationBell managePath="/admin/platform-booth-requests" />
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
                Admin
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
                {(user?.name?.[0] || user?.firstName?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div style={{
          flex: 1,
          padding: '2rem 6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
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
              from { opacity: 0; transform: translateX(30px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div style={{
            position: 'relative',
            height: '140px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/platform-booth.jpg)',
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
                Platform Booth Requests
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                animation: 'slideInRight 0.8s ease-out 0.2s both',
                margin: 0
              }}>
                Review and manage vendor platform booth reservation requests.
              </p>
            </div>
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
                                {request.individualIdsPaths && request.individualIdsPaths.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.75rem 0 0.5rem 0' }}>📄 Uploaded Individual IDs ({request.individualIdsPaths.length})</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                      {request.individualIdsPaths.map((idPath, idx) => (
                                        <a
                                          key={idx}
                                          href={`http://localhost:5000${idPath}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            padding: '0.5rem',
                                            backgroundColor: '#eff6ff',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.875rem',
                                            color: '#1e40af',
                                            textDecoration: 'none',
                                            border: '1px solid #bfdbfe',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#dbeafe';
                                            e.currentTarget.style.borderColor = '#7dd3fc';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                          }}
                                        >
                                          ⬇️ {idPath.split('/').pop()}
                                        </a>
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

export default AdminPlatformBoothRequests;

