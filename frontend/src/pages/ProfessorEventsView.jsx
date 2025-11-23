import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import professorApiService from '../api/professorApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import WorkshopEditRequestModal from '../components/WorkshopEditRequestModal';

const ProfessorEventsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [showWorkshopEditModal, setShowWorkshopEditModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    // Exact match
    if (currentPath === path) return true;
    // For dashboard, check if it's exactly /dashboard (not /dashboard/something)
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    // For other routes, check if current path starts with the route path
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
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown]);

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const result = await professorApiService.getAllEvents({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      
      if (result.success) {
        const eventsList = Array.isArray(result.data) ? result.data : (result.data.events || []);
        const mapped = eventsList.map(ev => ({
          id: ev._id || ev.id,
          title: ev.title,
          type: ev.type,
          status: ev.status || 'pending',
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          registeredCount: ev.registeredCount,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          faculty: ev.faculty,
          professors: ev.professors,
          bannerFile: ev.bannerFile,
          creatorName: ev.creatorName,
          creatorRole: ev.creatorRole,
          vendors: ev.vendors || [],
          vendorRequests: ev.vendorRequests || []
        }))
        .filter(ev => {
          const type = (ev.type || '').toLowerCase();
          const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
          // Only keep events with valid types and non-empty title/location
          return validTypes.includes(type) && 
                 ev.title && ev.title.trim() !== '' && 
                 ev.location && ev.location.trim() !== '';
        });
        setEvents(mapped);
      } else {
        setEvents([]);
        const msg = result.message || (typeof result.error === 'string' ? result.error : 'Failed to fetch events');
        setError(msg);
      }
    } catch (error) {
      setError(error?.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    loadEvents();
  }, [filter, loadEvents]);

  // Load user's registrations to check which events they're registered for
  useEffect(() => {
    const loadUserRegistrations = async () => {
      if (!user?.email) return;
      
      try {
        // Professors register through StudentRegistrationForm which uses studentRegistrationApi
        // So we need to check the student registration API, not the professor registration API
        const result = await studentRegistrationApi.getMyRegistrations(user.email);
        if (result.success && result.data.registrations) {
          // Extract event IDs from PAID registrations only
          const registeredIds = new Set();
          result.data.registrations.forEach(reg => {
            // Only include paid registrations
            if (reg.paid !== true) return;
            
            // Check for eventId in the formatted response
            if (reg.eventId) {
              registeredIds.add(String(reg.eventId));
            }
            // Fallback: check if event object exists with _id
            else if (reg.event && typeof reg.event === 'object' && reg.event._id) {
              registeredIds.add(String(reg.event._id));
            } 
            // Fallback: check if event is a string ID
            else if (reg.event && typeof reg.event === 'string') {
              registeredIds.add(reg.event);
            }
          });
          console.log('✅ Professor registered event IDs:', Array.from(registeredIds));
          setRegisteredEventIds(registeredIds);
        }
      } catch (error) {
        console.error('Error loading user registrations:', error);
      }
    };

    loadUserRegistrations();
  }, [user]);

  const handleSearch = () => {
    loadEvents();
  };

  const handleRegisterClick = (event) => {
    setRegistrationEvent(event);
    setShowRegistrationForm(true);
  };

  const handleRegistrationSuccess = (registrationData) => {
    setShowRegistrationForm(false);
    // Add the event ID to registered set
    if (registrationEvent?.id) {
      setRegisteredEventIds(prev => new Set([...prev, String(registrationEvent.id)]));
    }
    setRegistrationEvent(null);
    loadEvents();
  };

  const handleCloseRegistrationForm = () => {
    setShowRegistrationForm(false);
    setRegistrationEvent(null);
  };

  const handleCloseWorkshopEditModal = () => {
    setShowWorkshopEditModal(false);
    setSelectedWorkshop(null);
  };

  const handleWorkshopEditRequest = (event) => {
    setSelectedWorkshop(event);
    setShowWorkshopEditModal(true);
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

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    if (event.capacity && event.registeredCount >= event.capacity) {
      return { label: 'Full', color: 'red' };
    }
    if (now >= startDate && now <= endDate) {
      return { label: 'Active', color: 'green' };
    }
    if (now < startDate) {
      return { label: 'Upcoming', color: 'blue' };
    }
    return { label: 'Past', color: 'gray' };
  };

  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleRowExpansion = (eventId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Filter events based on type
  const filteredEvents = events.filter(event => {
    const title = (event.title || '').trim();
    if (!title) return false;
    if (!event.startDate) return false;
    
    const startDate = new Date(event.startDate);
    if (isNaN(startDate.getTime())) return false;
    
    // Show all events including past events - no date filtering
    const typeMatch = filter === 'all' || (event.type && event.type === filter);
    return typeMatch;
  });
  
  console.log('🔍 ProfessorEventsView - Filtered events:', {
    totalEvents: events.length,
    filteredCount: filteredEvents.length,
    workshopEvents: filteredEvents.filter(e => e.type === 'workshop').length,
    workshopTitles: filteredEvents.filter(e => e.type === 'workshop').map(e => e.title),
    allWorkshops: events.filter(e => e.type === 'workshop').map(e => ({
      title: e.title,
      status: e.status,
      startDate: e.startDate,
      endDate: e.endDate,
      filtered: filteredEvents.some(f => f.id === e.id)
    }))
  });

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

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
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
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
              Professor
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
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
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
        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/professor/all-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/all-events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Events
          </Link>
          <Link
            to="/professor/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Events
          </Link>
          <Link
            to="/professor/my-workshops"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/my-workshops') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/my-workshops') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/my-workshops') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Workshops
          </Link>
          <Link
            to="/gym-schedule"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym-schedule') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym-schedule') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym-schedule') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            View Gym Sessions
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
              backgroundImage: 'url(/assets/images/events-banner.jpeg)',
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
                Discover Events
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                Browse and register for upcoming events.
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
                    placeholder="Search by event name, professor name, location, or description..."
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
              </div>
              
              {/* Filter Buttons - Right Side */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
                {['all', 'bazaar', 'trip', 'workshop', 'conference', 'booth'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '0.5rem',
                      backgroundColor: filter === type ? '#1e40af' : '#f9fafb',
                      color: filter === type ? '#FFFFFF' : '#6b7280',
                      border: filter === type ? 'none' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: filter === type ? '600' : '500',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                      boxShadow: filter === type ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (filter !== type) {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filter !== type) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                  </button>
                ))}
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
          ) : filteredEvents.length === 0 ? (
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
                No upcoming events found
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                marginTop: 0
              }}>
                Only events that haven't started yet are shown.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  loadEvents();
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
                Show All Upcoming Events
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
                Found {filteredEvents.length} upcoming event{filteredEvents.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {filter !== 'all' && ` in ${filter} category`}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {filteredEvents.map(event => {
                  const statusInfo = getEventStatus(event);
                  const isRegistered = registeredEventIds.has(String(event.id));
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
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
                      {getEventTypeImage(event.type) && (
                        <div style={{
                          width: '100%',
                          height: '180px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#f3f4f6',
                          flexShrink: 0
                        }}>
                          <img
                            src={getEventTypeImage(event.type)}
                            alt={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.style.backgroundColor = getEventTypeColor(event.type);
                              e.target.parentElement.style.display = 'flex';
                              e.target.parentElement.style.alignItems = 'center';
                              e.target.parentElement.style.justifyContent = 'center';
                              if (!e.target.parentElement.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text';
                                fallback.textContent = getEventTypeFallbackText(event.type);
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
                            backgroundColor: getEventTypeColor(event.type),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {event.type}
                          </div>
                          {statusInfo && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: statusInfo.color === 'blue' ? '#1e40af' : statusInfo.color === 'green' ? '#059669' : statusInfo.color === 'red' ? '#dc2626' : '#6b7280',
                              fontWeight: '600',
                              backgroundColor: statusInfo.color === 'blue' ? '#eff6ff' : statusInfo.color === 'green' ? '#d1fae5' : statusInfo.color === 'red' ? '#fee2e2' : '#f3f4f6',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '0.375rem'
                            }}>
                              {statusInfo.label}
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
                          {event.title}
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
                            {formatTableDate(event.startDate)}
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
                            {event.location}
                          </div>
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
                                groups
                              </span>
                              {event.registeredCount || 0} / {event.capacity} registered
                            </div>
                          )}
                          {(event.type === 'bazaar' || event.type === 'booth') && (
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
                                storefront
                              </span>
                              <span>{(event.vendors && event.vendors.length) || 0} vendor{((event.vendors && event.vendors.length) || 0) !== 1 ? 's' : ''} participating</span>
                            </div>
                          )}
                          {(event.type === 'workshop' || event.type === 'conference') && (
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
                                school
                              </span>
                              <span>
                                {event.professors 
                                  ? (Array.isArray(event.professors) ? event.professors.join(', ') : event.professors)
                                  : (event.creatorName || 'Professor')
                                }
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {(event.type === 'workshop' || event.type === 'trip') && (
                          <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                            {isRegistered ? (
                              <button
                                disabled
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: '100%',
                                  padding: '0.625rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#10b981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'not-allowed',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check_circle</span>
                                Registered
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegisterClick(event);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.625rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: '#1e40af',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>how_to_reg</span>
                                Register
                              </button>
                            )}
                          </div>
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

      {/* Event Modal - Same as StudentEventsView */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Event Image at Top */}
            {getEventTypeImage(selectedEvent.type) && (
              <div style={{
                width: '100%',
                height: '200px',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#f3f4f6',
                flexShrink: 0
              }}>
                <img
                  src={getEventTypeImage(selectedEvent.type)}
                  alt={selectedEvent.type ? selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1) : 'Event'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = getEventTypeColor(selectedEvent.type);
                    e.target.parentElement.style.display = 'flex';
                    e.target.parentElement.style.alignItems = 'center';
                    e.target.parentElement.style.justifyContent = 'center';
                    if (!e.target.parentElement.querySelector('.fallback-text')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-text';
                      fallback.textContent = getEventTypeFallbackText(selectedEvent.type);
                      fallback.style.color = '#FFFFFF';
                      fallback.style.fontSize = '1.5rem';
                      fallback.style.fontWeight = '700';
                      e.target.parentElement.appendChild(fallback);
                    }
                  }}
                />
              </div>
            )}
            
            {/* Close Button - Upper Right Corner */}
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                transition: 'all 0.2s',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.color = '#1D3557';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.target.style.color = '#6b7280';
              }}
            >
              ×
            </button>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                paddingRight: '1rem'
              }}>
                {selectedEvent.title}
              </h2>
            </div>
            
            <div style={{ 
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
              <div style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                backgroundColor: getEventTypeColor(selectedEvent.type),
                color: '#FFFFFF',
                fontSize: '0.6875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-block',
                marginBottom: '1.5rem'
              }}>
                {selectedEvent.type}
              </div>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    calendar_today
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Start Date</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.startDate)}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    event
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>End Date</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.endDate)}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}>
                    location_on
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Location</div>
                    <div style={{ color: '#374151', fontWeight: '500' }}>{selectedEvent.location}</div>
                  </div>
                </div>
                {selectedEvent.registrationDeadline && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      schedule
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Registration Deadline</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{formatDate(selectedEvent.registrationDeadline)}</div>
                    </div>
                  </div>
                )}
                {selectedEvent.price && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      attach_money
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Price</div>
                      <div style={{ color: '#059669', fontWeight: '600' }}>${selectedEvent.price}</div>
                    </div>
                  </div>
                )}
                {selectedEvent.capacity && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      people
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Capacity</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{selectedEvent.registeredCount || 0}/{selectedEvent.capacity} registered</div>
                    </div>
                  </div>
                )}
                {(selectedEvent.type === 'bazaar' || selectedEvent.type === 'booth') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      storefront
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Vendors</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>{(selectedEvent.vendors && selectedEvent.vendors.length) || 0} vendor{((selectedEvent.vendors && selectedEvent.vendors.length) || 0) !== 1 ? 's' : ''} participating</div>
                    </div>
                  </div>
                )}
                {(selectedEvent.type === 'workshop' || selectedEvent.type === 'conference') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: '#9ca3af'
                    }}>
                      school
                    </span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Professor</div>
                      <div style={{ color: '#374151', fontWeight: '500' }}>
                        {selectedEvent.professors 
                          ? (Array.isArray(selectedEvent.professors) ? selectedEvent.professors.join(', ') : selectedEvent.professors)
                          : (selectedEvent.creatorName || 'Professor')
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {((selectedEvent.type === 'bazaar' || selectedEvent.type === 'booth') && selectedEvent.vendors && selectedEvent.vendors.length > 0) ? (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginBottom: '0.75rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                      storefront
                    </span>
                    Participating Vendors ({selectedEvent.vendors.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {selectedEvent.vendors.map((vendor, idx) => (
                      <div key={vendor._id || idx} style={{
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#1D3557',
                          fontSize: '0.875rem',
                          marginBottom: '0.25rem'
                        }}>
                          {vendor.name || vendor.companyName || 'Vendor'}
                        </div>
                        {vendor.contactName && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Contact: {vendor.contactName}
                          </div>
                        )}
                        {vendor.email && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {vendor.email}
                          </div>
                        )}
                        {selectedEvent.type === 'booth' && vendor.boothSize && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                              square_foot
                            </span>
                            Booth Size: {vendor.boothSize}
                            {vendor.durationWeeks && ` • Duration: ${vendor.durationWeeks} week${vendor.durationWeeks !== 1 ? 's' : ''}`}
                            {vendor.boothLocation && ` • Location: ${vendor.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedEvent.description && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Description
                  </div>
                  <p style={{
                    color: '#374151',
                    lineHeight: '1.6',
                    margin: 0,
                    fontSize: '0.875rem'
                  }}>
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {(selectedEvent.type === 'workshop' || selectedEvent.type === 'trip') && (
                registeredEventIds.has(String(selectedEvent.id)) ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#10b981',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'not-allowed',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check_circle</span>
                    Registered
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegisterClick(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
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
                    Register for {selectedEvent.type === 'workshop' ? 'Workshop' : 'Trip'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegistrationForm && registrationEvent && (
        <div
          onClick={handleCloseRegistrationForm}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <StudentRegistrationForm
              event={registrationEvent}
              onClose={handleCloseRegistrationForm}
              onSuccess={handleRegistrationSuccess}
            />
          </div>
        </div>
      )}

      {/* Workshop Edit Request Modal */}
      {showWorkshopEditModal && selectedWorkshop && (
        <WorkshopEditRequestModal
          open={showWorkshopEditModal}
          onClose={handleCloseWorkshopEditModal}
          workshop={selectedWorkshop}
          onSubmitted={handleCloseWorkshopEditModal}
        />
      )}
    </div>
  );
};

export default ProfessorEventsView;

