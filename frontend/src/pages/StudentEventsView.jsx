import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import WorkshopEditRequestModal from '../components/WorkshopEditRequestModal';

const StudentEventsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const result = await eventsApiService.getStudentEvents({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      
      if (result.success) {
        const mapped = (result.data || []).map(ev => ({
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
          if (!validTypes.includes(type) || !ev.title || ev.title.trim() === '' || !ev.location || ev.location.trim() === '') {
            return false;
          }
          
          // Apply type filter if not 'all'
          if (filter && filter !== 'all') {
            const filterType = filter.toLowerCase();
            if (type !== filterType) {
              return false;
            }
          }
          
          // Filter out past events - use endDate to allow events that haven't ended yet
          const now = new Date();
          if (ev.endDate) {
            const endDate = new Date(ev.endDate);
            if (!isNaN(endDate.getTime()) && endDate < now) {
              return false;
            }
          } else if (ev.startDate) {
            // If no endDate, use startDate (for backward compatibility)
            const startDate = new Date(ev.startDate);
            if (!isNaN(startDate.getTime()) && startDate < now) {
              return false;
            }
          }
          
          return true;
        });
        
        console.log('🔍 StudentEventsView - Events loaded:', {
          totalEvents: mapped.length,
          workshopEvents: mapped.filter(e => e.type === 'workshop').length,
          workshopTitles: mapped.filter(e => e.type === 'workshop').map(e => e.title),
          allWorkshops: mapped.filter(e => e.type === 'workshop').map(e => ({
            title: e.title,
            status: e.status,
            startDate: e.startDate,
            endDate: e.endDate
          }))
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
        const result = await studentRegistrationApi.getMyRegistrations(user.email);
        if (result.success && result.data.registrations) {
          // Extract event IDs from registrations
          const registeredIds = new Set();
          result.data.registrations.forEach(reg => {
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
      conference: '/assets/images/conference-background.png',
      workshop: '/assets/images/workshop-background.png',
      bazaar: '/assets/images/bazaar-background.png',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.png'
    };
    return imageMap[type] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Student';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
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
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>school</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Student Portal
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
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
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
                to="/student/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/student/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/student/my-registrations"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/my-registrations') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/my-registrations')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/my-registrations')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  event
                </span>
                <p style={{
                  color: isActiveRoute('/student/my-registrations') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/my-registrations') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Events
                </p>
              </Link>

              <Link
                to="/student/courts"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/student/courts') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/student/courts')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/student/courts')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  sports_tennis
                </span>
                <p style={{
                  color: isActiveRoute('/student/courts') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/student/courts') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Campus Courts
                </p>
              </Link>

              <Link
                to="/gym"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/gym') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/gym')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/gym')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  sports_gymnastics
                </span>
                <p style={{
                  color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/gym') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Gym Sessions
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
                Student
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
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
              Discover Events
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Browse and register for upcoming events.
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '1.25rem',
                  pointerEvents: 'none'
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
                    backgroundColor: '#f9fafb',
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
                    e.target.style.backgroundColor = '#f9fafb';
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
                Search
              </button>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadEvents();
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
                    whiteSpace: 'nowrap'
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
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                Found {events.length} upcoming event{events.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {filter !== 'all' && ` in ${filter} category`}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1.5rem'
              }}>
                {events.map(event => {
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
                              // Fallback if image doesn't exist
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
                          {getDaysUntilEvent(event.startDate) && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#1e40af',
                              fontWeight: '600',
                              backgroundColor: '#eff6ff',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '0.375rem'
                            }}>
                              {getDaysUntilEvent(event.startDate)}
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
                            <span>{formatDate(event.startDate)}</span>
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
                            <span>{event.location}</span>
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

                        {(event.type === 'workshop' || event.type === 'trip') && (
                          isRegistered ? (
                            <button
                              disabled
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: '#10b981',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'not-allowed',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
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
                              Register for {event.type === 'workshop' ? 'Workshop' : 'Trip'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Event Modal */}
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
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                {selectedEvent.title}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  transition: 'background-color 0.2s',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
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

export default StudentEventsView;
