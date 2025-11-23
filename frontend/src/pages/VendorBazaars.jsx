import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import BoothApplicationForm from '../components/BoothApplicationForm';

const VendorBazaars = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [bazaars, setBazaars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [showBoothForm, setShowBoothForm] = useState(false);

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
      booth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
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
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
              </div>
            )}
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
                Discover Bazaars
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                Browse and apply to upcoming bazaars.
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {/* Search Input and Button - Left Side */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '0 1 auto' }}>
                <div style={{ position: 'relative', width: '520px' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '1.25rem',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by bazaar name, location, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    style={{
                      width: '100%',
                      padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1e40af';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  style={{
                    padding: '0.875rem 1.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#1e40af',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    flexShrink: 0
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
                  Search
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadBazaars();
                    }}
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
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
                borderTop: '3px solid #1e40af',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'inline-block'
              }} className="spinner"></div>
              <p style={{ margin: 0, color: '#6b7280' }}>Loading events...</p>
            </div>
          ) : allEvents.length === 0 ? (
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
                No upcoming bazaars found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                marginTop: 0
              }}>
                Only bazaars that haven't started yet are shown.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  loadBazaars();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
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
                Show All Upcoming Bazaars
              </button>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: '1.5rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Found {allEvents.length} upcoming bazaar{allEvents.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {allEvents.map(event => {
                  const eventName = event.name || event.title || 'Untitled Bazaar';
                  const startDate = event.startDate || event.date;
                  const isUpcoming = startDate ? new Date(startDate) > new Date() : true;

                  return (
                    <div
                      key={event.id}
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
                      {getEventTypeImage('bazaar') && (
                        <div style={{
                          width: '100%',
                          height: '180px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#f3f4f6',
                          flexShrink: 0
                        }}>
                          <img
                            src={getEventTypeImage('bazaar')}
                            alt="Bazaar"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            onError={(e) => {
                              // Fallback if image doesn't exist
                              e.target.style.display = 'none';
                              e.target.parentElement.style.backgroundColor = getEventTypeColor('bazaar');
                              e.target.parentElement.style.display = 'flex';
                              e.target.parentElement.style.alignItems = 'center';
                              e.target.parentElement.style.justifyContent = 'center';
                              if (!e.target.parentElement.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text';
                                fallback.textContent = 'BAZAAR';
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
                            backgroundColor: getEventTypeColor('bazaar'),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Bazaar
                          </div>
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
                            <span>{event.location || 'N/A'}</span>
                          </div>
                          {event.price && (
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
                                attach_money
                              </span>
                              <span style={{ fontWeight: '500', color: '#059669' }}>${event.price}</span>
                            </div>
                          )}
                          {event.capacity && (
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
                                people
                              </span>
                              <span>{event.registeredCount || 0}/{event.capacity} registered</span>
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

                        {isUpcoming && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyToBazaar(event);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#1e40af',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              marginTop: 'auto',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                            Apply to Bazaar
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
