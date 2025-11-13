import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';

const VendorAcceptedEvents = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadAcceptedEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await vendorApi.listMyAccepted();
      const eventsList = Array.isArray(data?.events) ? data.events : [];
      
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

  const toggleRowExpansion = (eventId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
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

  const getEventTypeLabel = (type) => {
    const typeMap = {
      'bazaar': 'Bazaar',
      'booth': 'Booth',
      'platformBooth': 'Platform Booth',
      'standaloneBooth': 'Standalone Booth'
    };
    return typeMap[type] || type || 'Event';
  };

  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

  // Sidebar component (same as VendorDashboard)
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                storefront
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Vendor Portal
              </h1>
              <p style={{
                color: 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: '400',
                lineHeight: 'normal',
                margin: 0
              }}>
                {user?.companyName || 'Company'}
              </p>
            </div>
          </div>
        )}

        {sidebarOpen && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link
              to="/vendor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                dashboard
              </span>
              <p style={{
                color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Dashboard
              </p>
            </Link>

            <Link
              to="/vendor/bazaars"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor/bazaars') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor/bazaars')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor/bazaars')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                explore
              </span>
              <p style={{
                color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor/bazaars') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Discover Bazaars
              </p>
            </Link>

            <Link
              to="/vendor/platform-booths"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor/platform-booths') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor/platform-booths')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor/platform-booths')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                location_on
              </span>
              <p style={{
                color: isActiveRoute('/vendor/platform-booths') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor/platform-booths') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Platform Booths
              </p>
            </Link>

            <Link
              to="/vendor/accepted-events"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor/accepted-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor/accepted-events')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor/accepted-events')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                check_circle
              </span>
              <p style={{
                color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor/accepted-events') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                My Participations
              </p>
            </Link>

            <Link
              to="/vendor/my-requests"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: isActiveRoute('/vendor/my-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActiveRoute('/vendor/my-requests')) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveRoute('/vendor/my-requests')) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                fontSize: '1.25rem' 
              }}>
                assignment
              </span>
              <p style={{
                color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/vendor/my-requests') ? '700' : '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                My Applications
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
                Vendor
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
                {(user?.companyName?.[0] || user?.firstName?.[0] || 'V').toUpperCase()}
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
              My Participations
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              View all upcoming bazaars and booth setups you are participating in (accepted requests only).
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Loading accepted events...
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
          ) : events.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '3rem',
              borderRadius: '0.75rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>
                event_busy
              </span>
              <p style={{ fontSize: '1rem', margin: 0 }}>No accepted events found.</p>
              <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>You haven't been accepted to any events yet.</p>
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
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Event Name</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Start Date</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const eventId = event._id || event.id;
                    const isExpanded = expandedRows.has(eventId);
                    const isUpcoming = new Date(event.startDate || event.date || 0) >= new Date();
                    
                    return (
                      <React.Fragment key={eventId}>
                        <tr style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#f9fafb' : '#FFFFFF'
                        }}
                        onClick={() => toggleRowExpansion(eventId)}
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
                            {event.name || event.title || event.eventName || 'Untitled Event'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {getEventTypeLabel(event.type || event.eventType)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatTableDate(event.startDate || event.date)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {event.location || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: '#d1fae5',
                              color: '#065f46'
                            }}>
                              Accepted
                            </span>
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
                            <td colSpan="6" style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Description</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {event.description || 'No description available'}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>End Date</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {formatTableDate(event.endDate || event.endDate)}
                                    </p>
                                  </div>
                                  {event.boothSize && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Booth Size</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {event.boothSize}
                                      </p>
                                    </div>
                                  )}
                                  {event.durationWeeks && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Duration</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {event.durationWeeks} week{event.durationWeeks > 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  )}
                                  {event.boothLocation && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Booth Location</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {event.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {event.attendees && event.attendees.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Attendees</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {event.attendees.map((attendee, idx) => (
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

export default VendorAcceptedEvents;

