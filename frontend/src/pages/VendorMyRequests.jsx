import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import VendorDocumentsModal from '../components/VendorDocumentsModal';
import PlatformBoothsModal from '../components/PlatformBoothsModal';
import axios from 'axios';

const VendorMyRequests = () => {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showPlatformBoothsModal, setShowPlatformBoothsModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'rejected'

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/vendor') {
      return currentPath === '/vendor';
    }
    return currentPath.startsWith(path);
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

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Loading vendor requests...');
      const [pendingRes, rejectedRes] = await Promise.all([
        vendorApi.listMyRequests({ status: 'pending' }),
        vendorApi.listMyRequests({ status: 'rejected' })
      ]);

      console.log('🔍 Pending response:', pendingRes);
      console.log('🔍 Rejected response:', rejectedRes);

      const pending = Array.isArray(pendingRes?.events) ? pendingRes.events.map(r => ({ ...r, status: 'pending' })) : [];
      const rejected = Array.isArray(rejectedRes?.events) ? rejectedRes.events.map(r => ({ ...r, status: 'rejected' })) : [];
      
      console.log('🔍 Pending requests:', pending);
      console.log('🔍 Rejected requests:', rejected);
      
      const allRequests = [...pending, ...rejected].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateApplied || 0);
        const dateB = new Date(b.createdAt || b.dateApplied || 0);
        return dateB - dateA; // Most recent first
      });

      console.log('🔍 All requests (sorted):', allRequests);
      setRequests(allRequests);
    } catch (err) {
      console.error('❌ Error loading my requests:', err);
      setError('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  const handleCancel = async (requestId) => {
    if (!requestId) return;
    const ok = window.confirm('Are you sure you want to cancel this request? This cannot be undone.');
    if (!ok) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/vendor-requests/${requestId}/cancel`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.status === 200) {
        // remove from UI
        setRequests(prev => prev.filter(r => String(r._id || r.id) !== String(requestId)));
        alert('Request cancelled successfully.');
      } else {
        alert(res.data?.message || 'Failed to cancel request');
      }
    } catch (err) {
      console.error('Error cancelling request', err);
      const msg = err.response?.data?.message || err.message || 'Error cancelling request';
      alert(msg);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1', // Light pink
      trip: '#2196F3',
      seminar: '#9C27B0',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      platformBooth: '#3F51B5',
      standaloneBooth: '#3F51B5',
      other: '#757575'
    };
    return colors[type] || colors.other;
  };

  const getEventTypeImage = (type) => {
    const imageMap = {
      conference: '/assets/images/conference-background.jpg',
      workshop: '/assets/images/workshop-background.jpg',
      bazaar: '/assets/images/bazaar-background.jpg',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.jpg',
      platformBooth: '/assets/images/booth-background.jpg',
      standaloneBooth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
  };

  const getEventTypeLabel = (type) => {
    const typeMap = {
      'bazaar': 'Bazaar',
      'booth': 'Booth',
      'platformBooth': 'Platform Booth',
      'standaloneBooth': 'Standalone Booth'
    };
    return typeMap[type] || type || 'Event';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
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

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

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
                <img
                  src={avatarSrc}
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
          {/* Page Title Banner - Animated */}
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
              backgroundImage: 'url(/assets/images/bazaar-background.jpg)',
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
                My Applications
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0,
                animation: 'slideInRight 0.8s ease-out 0.2s both'
              }}>
                View all requests for upcoming bazaars or booth setups you want to participate in (pending or rejected).
              </p>
            </div>
          </div>

          {/* Apply for a Booth Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => setShowPlatformBoothsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1D3557',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(29, 53, 87, 0.2)',
                height: 'fit-content'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#152843';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(29, 53, 87, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1D3557';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(29, 53, 87, 0.2)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                add
              </span>
              Apply for a Booth
            </button>
          </div>

          {/* Filter Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: filterStatus === 'all' ? 'none' : '1px solid #e5e7eb',
                backgroundColor: filterStatus === 'all' ? '#1e40af' : '#f9fafb',
                color: filterStatus === 'all' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.8125rem',
                fontWeight: filterStatus === 'all' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: filterStatus === 'all' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (filterStatus !== 'all') {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (filterStatus !== 'all') {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }
              }}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: filterStatus === 'pending' ? 'none' : '1px solid #e5e7eb',
                backgroundColor: filterStatus === 'pending' ? '#1e40af' : '#f9fafb',
                color: filterStatus === 'pending' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.8125rem',
                fontWeight: filterStatus === 'pending' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: filterStatus === 'pending' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (filterStatus !== 'pending') {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (filterStatus !== 'pending') {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }
              }}
            >
              Pending ({requests.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: filterStatus === 'rejected' ? 'none' : '1px solid #e5e7eb',
                backgroundColor: filterStatus === 'rejected' ? '#1e40af' : '#f9fafb',
                color: filterStatus === 'rejected' ? '#FFFFFF' : '#6b7280',
                fontSize: '0.8125rem',
                fontWeight: filterStatus === 'rejected' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: filterStatus === 'rejected' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (filterStatus !== 'rejected') {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (filterStatus !== 'rejected') {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }
              }}
            >
              Rejected ({requests.filter(r => r.status === 'rejected').length})
            </button>
          </div>

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #1e40af',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'inline-block'
              }} className="spinner"></div>
              <p style={{ margin: 0, color: '#6b7280' }}>Loading requests...</p>
            </div>
          ) : error ? (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                opacity: 0.5
              }}>📋</div>
              <p style={{
                color: '#374151',
                fontSize: '1.125rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                marginTop: 0
              }}>
                No {filterStatus === 'all' ? '' : filterStatus} requests found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                marginTop: 0
              }}>
                {filterStatus === 'all' 
                  ? "You haven't submitted any requests yet."
                  : filterStatus === 'pending'
                  ? "You don't have any pending requests."
                  : "You don't have any rejected requests."}
              </p>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: '1.5rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Found {filteredRequests.length} application{filteredRequests.length !== 1 ? 's' : ''}
                {filterStatus !== 'all' && ` (${filterStatus})`}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {filteredRequests.map((request) => {
                  const requestId = request._id || request.id;
                  const eventType = request.type || request.eventType || 'bazaar';
                  const eventName = request.name || request.title || request.eventName || 'Untitled Event';
                  const startDate = request.startDate || request.date;
                  const appliedDate = request.createdAt || request.dateApplied;

                  return (
                    <div
                      key={requestId}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.75rem',
                        padding: 0,
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#1e40af';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      {/* Event Type Image - Top Half */}
                      {getEventTypeImage(eventType) && (
                        <div style={{
                          width: '100%',
                          height: '180px',
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
                              // Fallback if image doesn't exist
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
                                fallback.style.fontSize = '1.5rem';
                                fallback.style.fontWeight = '700';
                                e.target.parentElement.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '0.5rem',
                            backgroundColor: getEventTypeColor(eventType),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {getEventTypeLabel(eventType)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            {getStatusBadge(request.status)}
                          </div>
                        </div>
                        
                        <h3 style={{
                          color: '#1D3557',
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          marginBottom: '0.75rem',
                          marginTop: 0,
                          lineHeight: '1.4'
                        }}>
                          {eventName}
                        </h3>
                        
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          flex: 1
                        }}>
                          {appliedDate && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              fontSize: '0.8125rem',
                              color: '#6b7280'
                            }}>
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.125rem',
                                color: '#9ca3af'
                              }}>
                                schedule
                              </span>
                              <span>Applied: {formatDate(appliedDate)}</span>
                            </div>
                          )}
                          {startDate && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              fontSize: '0.8125rem',
                              color: '#6b7280'
                            }}>
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.125rem',
                                color: '#9ca3af'
                              }}>
                                calendar_today
                              </span>
                              <span>Event: {formatDate(startDate)}</span>
                            </div>
                          )}
                          {request.location && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              fontSize: '0.8125rem',
                              color: '#6b7280'
                            }}>
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.125rem',
                                color: '#9ca3af'
                              }}>
                                location_on
                              </span>
                              <span>{request.location}</span>
                            </div>
                          )}
                        </div>

                        {request.description && (
                          <p style={{
                            color: '#6b7280',
                            fontSize: '0.8125rem',
                            marginBottom: '0.75rem',
                            marginTop: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: '1.5'
                          }}>
                            {request.description}
                          </p>
                        )}
                      </div>
                      {/* Footer with Cancel button aligned bottom-right */}
                      <div style={{ padding: '0.75rem 1rem 1rem', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                        {request.status === 'pending' && (request.paymentStatus !== 'paid' && !request.paidAt) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancel(requestId); }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              minWidth: 160,
                              borderRadius: '0.375rem',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 700
                            }}
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </main>
      {/* Vendor Documents Modal */}
      {showDocumentsModal && (
        <VendorDocumentsModal
          onClose={() => setShowDocumentsModal(false)}
          onSuccess={(vendorData) => {
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

      {/* Platform Booths Modal */}
      <PlatformBoothsModal
        isOpen={showPlatformBoothsModal}
        onClose={() => setShowPlatformBoothsModal(false)}
        onSuccess={() => {
          loadMyRequests();
        }}
      />
    </div>
  );
};

export default VendorMyRequests;

