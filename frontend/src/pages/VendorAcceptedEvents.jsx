import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import IDUploadModal from '../components/IDUploadModal';
import axios from 'axios';

const VendorAcceptedEvents = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'upcoming', 'past'
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [showIDUploadModal, setShowIDUploadModal] = useState(false);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState(null);

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

  const loadAcceptedEvents = async () => {
    try {
      setLoading(true);
      setError('');
      // Use requests endpoint so we receive requestId and payment fields
      const data = await vendorApi.listMyRequests({ status: 'accepted' });
      const eventsList = Array.isArray(data?.events) ? data.events : (Array.isArray(data) ? data : []);

      // Sort events: upcoming first (nearest first), then past events (most recent past first)
      const now = new Date();
      const upcomingEvents = eventsList.filter(ev => {
        const startDate = new Date(ev.startDate || ev.date || 0);
        return startDate >= now;
      }).sort((a, b) => {
        const dateA = new Date(a.startDate || a.date || 0);
        const dateB = new Date(b.startDate || b.date || 0);
        return dateA - dateB; // Ascending: nearest first
      });

      const pastEvents = eventsList.filter(ev => {
        const startDate = new Date(ev.startDate || ev.date || 0);
        return startDate < now;
      }).sort((a, b) => {
        const dateA = new Date(a.startDate || a.date || 0);
        const dateB = new Date(b.startDate || b.date || 0);
        return dateB - dateA; // Descending: most recent past first
      });

      setEvents([...upcomingEvents, ...pastEvents]);
    } catch (err) {
      console.error('Error loading accepted events:', err);
      setError('Failed to load accepted events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcceptedEvents();
  }, []);

  const handleCancel = async (requestId) => {
    if (!requestId) return;
    const ok = window.confirm('Are you sure you want to cancel this participation request? This cannot be undone.');
    if (!ok) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/vendor-requests/${requestId}/cancel`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.status === 200) {
        setEvents(prev => prev.filter(ev => String(ev.requestId || ev._id) !== String(requestId)));
        alert('Participation request cancelled successfully.');
      } else {
        alert(res.data?.message || 'Failed to cancel request');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      const msg = err.response?.data?.message || err.message || 'Error cancelling request';
      alert(msg);
    }
  };

  const handleOpenPaymentModal = (event) => {
    // Navigate to a full-page payment layout (same UX as student trip payment)
    navigate(`/vendor-requests/${event.requestId}/payment`, { state: { selectedEvent: event } });
  };

  const handleOpenIDUploadModal = (event) => {
    setSelectedEventForUpload(event);
    setShowIDUploadModal(true);
  };

  const handleCloseIDUploadModal = () => {
    setShowIDUploadModal(false);
    setSelectedEventForUpload(null);
  };

  const handleIDUploadSuccess = (updatedRequest) => {
    // Reload events to reflect uploaded IDs
    loadAcceptedEvents();
  };

  

  const toggleRowExpansion = (eventId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedRows(newExpanded);
  };
  // Formats date for table display, returns 'N/A' on error
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

  // Formats date, returns 'TBD' if missing
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
    if (Number.isNaN(diffDays)) return null;
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
      platformbooth: '#3F51B5',
      standalonebooth: '#3F51B5',
      other: '#757575'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  const getEventTypeImage = (type) => {
    const imageMap = {
      conference: '/assets/images/conference-background.jpg',
      workshop: '/assets/images/workshop-background.jpg',
      bazaar: '/assets/images/bazaar-background.jpg',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.jpg',
      platformbooth: '/assets/images/booth-background.jpg',
      standalonebooth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type?.toLowerCase()] || null;
  };

  const getEventImageSrc = (event) => {
    if (!event) return null;
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
    const candidates = [
      event.image,
      event.imageUrl,
      event.imagePath,
      event.banner,
      event.coverImage,
      event.logo,
      event.logoUrl,
      event.logoPath,
      event.boothImage,
      event.images && event.images[0],
      event.media && event.media[0] && event.media[0].url,
      event.eventImage,
      event.picture
    ].filter(Boolean);
    if (candidates.length === 0) return null;
    const raw = candidates.find(src => typeof src === 'string' && src.trim().length > 0) || null;
    if (!raw) return null;
    const cleaned = raw.trim().replace(/\\/g, '/');
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:')) return cleaned;
    const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    return `${API_BASE_URL}${normalized}`;
  };

  const getEventTypeFallbackText = (type) => {
    const texts = {
      bazaar: 'BAZAAR',
      trip: 'TRIP',
      workshop: 'WORKSHOP',
      conference: 'CONFERENCE',
      booth: 'BOOTH',
      other: 'EVENT'
    };
    return texts[type?.toLowerCase()] || texts.other;
  };

  const getEventTypeLabel = (type) => {
    const typeMap = {
      bazaar: 'Bazaar',
      trip: 'Trip',
      workshop: 'Workshop',
      conference: 'Conference',
      booth: 'Booth',
      platformbooth: 'Platform Booth',
      standalonebooth: 'Standalone Booth'
    };
    return typeMap[type?.toLowerCase()] || (type || 'Event');
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: '#059669',
      accepted: '#059669',
      pending: '#f59e0b',
      rejected: '#dc2626'
    };
    return colors[String(status || '').toLowerCase()] || '#6b7280';
  };

  const getDisplayStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved' || normalized === 'accepted' || normalized === 'registered') return 'REGISTERED';
    if (normalized === 'pending') return 'PENDING';
    if (normalized === 'rejected') return 'REJECTED';
    return status ? String(status).toUpperCase() : 'STATUS';
  };

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
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2.5rem',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
          <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
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
                  backgroundColor: '#1D3557',
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
      </header>

      {/* Horizontal Menu Bar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/vendor"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/vendor/bazaars"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/bazaars') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Bazaars
          </Link>
          <Link
            to="/vendor/accepted-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/accepted-events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Participations
          </Link>
          <Link
            to="/vendor/my-requests"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/my-requests') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Applications
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Content */}
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
            {/* Page Title Box */}
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
                  marginBottom: '0.5rem'
                }}>
                  My Participations
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  margin: 0
                }}>
                  View all upcoming bazaars and booth setups you are participating in (accepted requests only).
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem'
            }}>
              {loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }} >
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #1e40af',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    display: 'inline-block'
                  }} className="spinner"></div>
                  <p style={{ margin: 0, color: '#6b7280' }}>Loading accepted events...</p>
                </div >
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
              ) : events.length === 0 ? (
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
                  }}>📅</div>
                  <p style={{
                    color: '#374151',
                    fontSize: '1.125rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    marginTop: 0
                  }}>
                    No accepted events found
                  </p>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    marginBottom: '1.5rem',
                    marginTop: 0
                  }}>
                    You haven't been accepted to any events yet.
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
                    Found {events.length} participation{events.length !== 1 ? 's' : ''}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {events.map((event) => {
                      const eventId = event._id || event.id;
                      const eventType = event.type || event.eventType || 'bazaar';
                      const eventName = event.name || event.title || event.eventName || 'Untitled Event';
                      const startDate = event.startDate || event.date;
                      const isUpcoming = new Date(startDate || 0) >= new Date();

                      return (
                        <div
                          key={eventId}
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
                          {(() => {
                            const eventImage = getEventImageSrc(event);
                            const typeImage = getEventTypeImage(eventType);
                            const showImage = eventImage || typeImage;
                            if (!showImage) return null;
                            const imgSrc = eventImage || typeImage;
                            const imgAlt = eventImage ? (event.name || event.title || 'Event image') : getEventTypeLabel(eventType);
                            return (
                              <div style={{
                                width: '100%',
                                height: '180px',
                                overflow: 'hidden',
                                position: 'relative',
                                backgroundColor: '#f3f4f6',
                                flexShrink: 0
                              }}>
                                <img
                                  src={imgSrc}
                                  alt={imgAlt}
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
                            );
                          })()}

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
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                {getDaysUntilEvent(startDate) && (
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#1e40af',
                                    fontWeight: '600',
                                    backgroundColor: '#eff6ff',
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '0.375rem'
                                  }}>
                                    {getDaysUntilEvent(startDate)}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); /* optional action on status click */ }}
                                  style={{
                                    padding: '0.375rem 0.875rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: getStatusColor(event.status || event.requestStatus || event.paymentStatus),
                                    color: '#FFFFFF',
                                    fontSize: '0.6875rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    cursor: 'default'
                                  }}
                                >
                                  {getDisplayStatus(event.status || event.requestStatus || (event.paymentStatus === 'paid' ? 'paid' : 'accepted'))}
                                </button>
                                {/* (Cancel button moved to card footer) */}
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
                                  <span>{formatDate(startDate)}</span>
                                </div>
                              )}
                              {event.location && (
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
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.boothSize && (
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
                                    square_foot
                                  </span>
                                  <span>Booth Size: {event.boothSize}</span>
                                </div>
                              )}
                              {event.durationWeeks && (
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
                                  <span>Duration: {event.durationWeeks} week{event.durationWeeks > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>

                            {event.description && (
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
                                {event.description}
                              </p>
                            )}
                            
                            {/* Vendor QR Code Display */}
                            {event.qrCode && (
                              <div style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb'
                              }}>
                                <p style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#374151',
                                  margin: '0 0 0.5rem 0'
                                }}>
                                  Your Vendor QR Code
                                </p>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem'
                                }}>
                                  <img
                                    src={event.qrCode}
                                    alt="Vendor QR Code"
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      padding: '4px',
                                      backgroundColor: '#FFFFFF'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const parent = e.target.parentElement;
                                      if (parent && !parent.querySelector('.qr-placeholder')) {
                                        const placeholder = document.createElement('div');
                                        placeholder.className = 'qr-placeholder';
                                        placeholder.textContent = 'QR Code';
                                        placeholder.style.cssText = 'width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border: 1px solid #d1d5db; border-radius: 0.375rem; background-color: #f3f4f6; color: #6b7280; font-size: 0.75rem;';
                                        parent.appendChild(placeholder);
                                      }
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <p style={{
                                      fontSize: '0.6875rem',
                                      color: '#6b7280',
                                      margin: 0,
                                      lineHeight: '1.4'
                                    }}>
                                      Use this QR code for vendor check-in at the event.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Footer with Payment and Cancel buttons aligned bottom-right */}
                          <div style={{ padding: '0.75rem 1rem 1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                            {/* Upload IDs Button */}
                            {event.requestId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenIDUploadModal(event); }}
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#1e40af',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#1e3a8a';
                                  e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#1e40af';
                                  e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                }}
                                title="Upload individual IDs for attendees"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  upload_file
                                </span>
                                Upload IDs
                              </button>
                            )}

                            {/* Payment Button - show "Paid" if already paid, otherwise "Payment" */}
                            {event.paymentStatus === 'paid' || event.paidAt ? (
                              <button
                                disabled
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#10b981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'not-allowed',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  opacity: 0.7,
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                ✓ Paid
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(event); }}
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#1e40af',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#1e3a8a';
                                  e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#1e40af';
                                  e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                }}
                              >
                                Payment
                              </button>
                            )}

                            {/* Cancel Button - only show if not paid */}
                            {event.requestId && (event.paymentStatus !== 'paid' && !event.paidAt) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(event.requestId); }}
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#ef4444',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#dc2626';
                                  e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#ef4444';
                                  e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
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
        </div>
      </main>

      {/* ID Upload Modal */}
      {
        showIDUploadModal && selectedEventForUpload && (
          <IDUploadModal
            requestId={selectedEventForUpload.requestId || selectedEventForUpload._id}
            attendeesCount={selectedEventForUpload.attendees ? selectedEventForUpload.attendees.length : 0}
            onClose={handleCloseIDUploadModal}
            onSuccess={handleIDUploadSuccess}
          />
        )
      }

      {/* Vendor payments now use the full-page flow at /vendor-requests/:requestId/payment */}
    </div >
  );
};

export default VendorAcceptedEvents;

