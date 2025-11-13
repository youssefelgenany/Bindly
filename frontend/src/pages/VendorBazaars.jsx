import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import BoothApplicationForm from '../components/BoothApplicationForm';

const VendorBazaars = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bazaars, setBazaars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [showBoothForm, setShowBoothForm] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadBazaars = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await vendorApi.listUpcoming('bazaar');
      const list = Array.isArray(data) ? data : [];
      setBazaars(list);
    } catch (e) {
      setBazaars([]);
      setError('Failed to load bazaars');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBazaars();
  }, [loadBazaars]);

  const handleSearch = () => {
    // Filtering is done in the filteredEvents/filteredBooths computed values
  };

  const handleApplyToBazaar = (bazaar) => {
    // Create a booth-like object from bazaar data for the form
    const boothObject = {
      _id: bazaar._id || bazaar.id,
      type: 'bazaar',
      name: bazaar.name || bazaar.title,
      title: bazaar.name || bazaar.title,
      description: bazaar.description,
      startDate: bazaar.startDate,
      endDate: bazaar.endDate,
      location: bazaar.location,
      price: bazaar.price || 0,
      capacity: bazaar.capacity || 0
    };
    setSelectedBooth({ booth: boothObject, bazaar, isStandalone: false });
    setShowBoothForm(true);
  };

  const handleBoothApplicationSubmit = async (applicationData) => {
    try {
      if (applicationData.eventId.startsWith('mock-booth-')) {
        return {
          success: true,
          message: 'Booth application submitted successfully! (Demo Mode)'
        };
      }
      const result = await vendorApi.applyToEvent(applicationData);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const closeBoothForm = () => {
    setShowBoothForm(false);
    setSelectedBooth(null);
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

  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Filter bazaars based on search
  const filteredBazaars = bazaars.filter(bazaar => {
    const matchesSearch = !searchQuery || 
      (bazaar.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bazaar.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bazaar.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Prepare bazaars for display
  const allEventsRaw = filteredBazaars.map(b => ({ ...b, displayType: 'bazaar', id: b._id }));

  // Sort events: upcoming events first (nearest first), then past events (most recent past first)
  const now = new Date();
  const upcomingEvents = allEventsRaw.filter(ev => {
    const startDate = new Date(ev.startDate || ev.date || 0);
    return startDate >= now;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate || a.date || 0);
    const dateB = new Date(b.startDate || b.date || 0);
    return dateA - dateB; // Ascending: nearest first
  });

  const pastEvents = allEventsRaw.filter(ev => {
    const startDate = new Date(ev.startDate || ev.date || 0);
    return startDate < now;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate || a.date || 0);
    const dateB = new Date(b.startDate || b.date || 0);
    return dateB - dateA; // Descending: most recent past first
  });

  const allEvents = [...upcomingEvents, ...pastEvents];

  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

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

          {/* Navigation */}
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
                {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f8f6f6'
        }}>
          {/* Page Title Box */}
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
              Discover Bazaars
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Browse and apply to upcoming bazaars.
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              alignItems: 'center'
            }}>
              {/* Search */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', width: '100%', height: '3rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingLeft: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRight: 'none',
                      backgroundColor: '#f9fafb',
                      borderTopLeftRadius: '0.5rem',
                      borderBottomLeftRadius: '0.5rem'
                    }}>
                      <span className="material-symbols-outlined" style={{ 
                        fontSize: '1.5rem',
                        color: '#9ca3af'
                      }}>
                        search
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by Bazaar Name or Location"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: '1px solid #e5e7eb',
                        borderLeft: 'none',
                        borderTopRightRadius: '0.5rem',
                        borderBottomRightRadius: '0.5rem',
                        fontSize: '1rem',
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={handleSearch}
                style={{
                  height: '3rem',
                  padding: '0 1.5rem',
                  backgroundColor: '#1D3557',
                  color: '#FFFFFF',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#152843'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#1D3557'}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {error && (
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
          )}

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
                borderTop: '3px solid #1D3557',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ margin: 0, color: '#6b7280' }}>Loading events...</p>
            </div>
          ) : allEvents.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                event_busy
              </span>
              <p style={{ color: '#6b7280', margin: 0 }}>No events found.</p>
            </div>
          ) : (
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
                      Event Name
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Type
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
                      textAlign: 'center'
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
                  {allEvents.map(event => {
                    const isExpanded = expandedRows.has(event.id);
                    const eventName = event.name || event.title || 'Untitled Event';
                    const startDate = event.startDate || event.date;
                    const isUpcoming = startDate ? new Date(startDate) > new Date() : true;

                    return (
                      <React.Fragment key={event.id}>
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
                            color: '#111827'
                          }}>
                            {eventName}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            Bazaar
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {formatTableDate(startDate)}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {event.location || 'N/A'}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'center'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: isUpcoming ? '#d1fae5' : '#f3f4f6',
                              color: isUpcoming ? '#065f46' : '#4b5563'
                            }}>
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </span>
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            {isUpcoming && (
                              <button
                                onClick={() => handleApplyToBazaar(event)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '0.375rem',
                                  border: 'none',
                                  backgroundColor: '#1D3557',
                                  color: '#FFFFFF',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#152843';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#1D3557';
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  add
                                </span>
                                Apply
                              </button>
                            )}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            <button
                              onClick={() => toggleRowExpansion(event.id)}
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Event Description */}
                                {event.description && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                                      Description
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.description}
                                    </p>
                                  </div>
                                )}

                                {/* Event Details Grid */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                  gap: '1rem'
                                }}>
                                  {/* Start Date */}
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Start Date & Time
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {startDate ? formatDateTime(startDate) : 'N/A'}
                                    </p>
                                  </div>

                                  {/* End Date */}
                                  {(event.endDate || event.end) && (
                                    <div>
                                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                        End Date & Time
                                      </h4>
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        {formatDateTime(event.endDate || event.end)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Registration Deadline */}
                                  {event.registrationDeadline && (
                                    <div>
                                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                        Registration Deadline
                                      </h4>
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        {formatDateTime(event.registrationDeadline)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Capacity */}
                                  {event.capacity && (
                                    <div>
                                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                        Capacity
                                      </h4>
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        {event.registeredCount || 0} / {event.capacity} registered
                                      </p>
                                    </div>
                                  )}
                                </div>

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

      {/* Booth Application Form Modal */}
      {showBoothForm && selectedBooth && (
        <BoothApplicationForm
          booth={selectedBooth.booth}
          bazaar={selectedBooth.bazaar || { name: selectedBooth.booth.name || 'Bazaar' }}
          onClose={closeBoothForm}
          onSubmit={handleBoothApplicationSubmit}
        />
      )}
    </div>
  );
};

export default VendorBazaars;
