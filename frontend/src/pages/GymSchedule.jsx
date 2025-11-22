import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gymApiService } from '../api/gymApi';
import { gymSessionApi } from '../api/gymSessionApi';
import GymSessionForm from '../components/GymSessionForm';

const TYPES = ['yoga', 'pilates', 'aerobics', 'zumba', 'cross circuit', 'kick-boxing', 'strength', 'cardio', 'other'];

const GymSchedule = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || (user?.userType === 'TA' ? 'TA' : user?.userType === 'Staff' ? 'Staff' : user?.userType === 'Professor' ? 'Professor' : user?.userType === 'Student' ? 'Student' : 'Events Office');

  // Determine portal branding and navigation based on user type
  const getPortalBranding = () => {
    if (user?.userType === 'TA') return 'TA Portal';
    if (user?.userType === 'Staff') return 'Staff Portal';
    if (user?.userType === 'Professor') return 'Professor Portal';
    if (user?.userType === 'Student') return 'Student Portal';
    return 'Events Office';
  };

  const getUserRole = () => {
    if (user?.userType === 'TA') return 'TA';
    if (user?.userType === 'Staff') return 'Staff';
    if (user?.userType === 'Professor') return 'Professor';
    if (user?.userType === 'Student') return 'Student';
    return 'Events Office';
  };

  const getEventsRoute = () => {
    if (user?.userType === 'TA' || user?.userType === 'Staff') return '/staff/events';
    if (user?.userType === 'Professor') return '/professor/events';
    if (user?.userType === 'Student') return '/student/events';
    return '/event-office';
  };

  const getMyEventsRoute = () => {
    if (user?.userType === 'TA' || user?.userType === 'Staff') return '/staff/my-registrations';
    if (user?.userType === 'Professor') return '/professor/my-registrations';
    if (user?.userType === 'Student') return '/student/my-registrations';
    return '/event-office';
  };

  const getDashboardRoute = () => {
    return '/dashboard';
  };
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
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
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // month state is 0-11 (JS Date). Backend expects 1-12 — send month + 1.
      const res = await gymApiService.getMonthlySessions(year, month + 1);
      if (res.success) {
        // Ensure sessions is an array and filter out invalid sessions
        const sessionsData = res.data.sessions || [];
        const validSessions = sessionsData.filter(s => s && s.date);
        setSessions(validSessions);
      } else {
        setError(res.message || 'Failed to load gym sessions');
      }
    } catch (error) {
      console.error('Error loading gym sessions:', error);
      setError('Failed to load gym sessions');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // Calendar calculations
  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startDay = useMemo(() => firstOfMonth.getDay(), [firstOfMonth]);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group sessions by date (YYYY-MM-DD format)
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      // Skip sessions with invalid data
      if (!s || !s.date) continue;
      
      if (typeFilter !== 'all' && (s.type || '').toLowerCase() !== typeFilter.toLowerCase()) continue;
      
      try {
        const d = new Date(s.date);
        // Skip if date is invalid
        if (isNaN(d.getTime())) continue;
        
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD format
        if (!map[key]) map[key] = [];
        map[key].push(s);
      } catch (error) {
        console.warn('Invalid session data:', s, error);
        continue;
      }
    }
    return map;
  }, [sessions, typeFilter]);

  const formatDateKey = (y, m, day) => {
    const date = new Date(y, m, day);
    return date.toISOString().slice(0, 10);
  };

  // Get color for session type
  const getSessionTypeColor = (type) => {
    const typeLower = (type || '').toLowerCase();
    const colors = {
      'yoga': '#A7F3D0', // light green
      'pilates': '#E9D5FF', // light purple
      'zumba': '#FED7AA', // light orange
      'aerobics': '#FBCFE8', // light pink
      'cross circuit': '#BFDBFE', // light blue
      'kick-boxing': '#FECACA', // light red/pink
      'strength': '#DDD6FE', // light indigo
      'cardio': '#FDE68A', // light yellow
      'other': '#E5E7EB' // light gray
    };
    return colors[typeLower] || colors['other'];
  };

  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });

  const shiftMonth = (delta) => {
    const n = new Date(year, month + delta, 1);
    setYear(n.getFullYear());
    setMonth(n.getMonth());
  };

  // Check if user is Events Office
  const isEventsOffice = user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office';

  // Handle gym session creation
  const handleGymSessionCreate = async (formData) => {
    try {
      setCreating(true);
      const response = await gymSessionApi.create(formData);
      if (response.success) {
        await load(); // Reload sessions
        setIsCreateModalOpen(false);
      } else {
        alert(response.message || 'Failed to create gym session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create gym session:', error);
      alert('Failed to create gym session. Please try again.');
    } finally {
      setCreating(false);
    }
  };


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
    }}>
      {/* Header/Navbar */}
      <aside style={{
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
                  {getPortalBranding()}
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

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0'
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
              {getUserRole()}
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
                {displayName.charAt(0).toUpperCase()}
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

      {/* Horizontal Menu Bar - Only show for Students */}
      {user?.userType === 'Student' && (
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #e2e8f0'
        }}>
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
              to="/student/events"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/events') ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/events') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/events') ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              Discover Events
            </Link>
            <Link
              to="/student/my-registrations"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/my-registrations') ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/my-registrations') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/my-registrations') ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              My Events
            </Link>
            <Link
              to="/student/courts"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/student/courts') ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/student/courts') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/student/courts') ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              Campus Courts
            </Link>
            <Link
              to="/gym"
              style={{
                textDecoration: 'none',
                color: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '600' : '500',
                paddingBottom: '0.5rem',
                borderBottom: isActiveRoute('/gym') || isActiveRoute('/gym-schedule') ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              Gym Sessions
            </Link>
          </div>
        </nav>
      )}

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          paddingLeft: '6rem',
          paddingRight: '6rem',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
          <div style={{
            position: 'relative',
            height: '140px',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            borderLeft: '4px solid #1D3557',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{
                color: '#1D3557',
                fontSize: '1rem',
                fontWeight: '700',
                margin: '0 0 0.125rem 0'
              }}>
                Gym Schedule
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                View sessions for the selected month
              </p>
            </div>
            {isEventsOffice && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  backgroundColor: '#1D3557',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  height: 'fit-content'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#152843';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1D3557';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  add
                </span>
                Create
              </button>
            )}
          </div>

          {/* Filter and Navigation Toolbar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => shiftMonth(-1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  padding: '0.25rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#374151';
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>‹</span>
              </button>
              <div style={{
                fontWeight: '500',
                color: '#1D3557',
                fontSize: '1rem',
                textAlign: 'center',
                minWidth: '10rem'
              }}>
                {monthName} {year}
              </div>
              <button
                onClick={() => shiftMonth(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  padding: '0.25rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#374151';
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>›</span>
              </button>
            </div>

            {/* Type Filter - Horizontal Buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setTypeFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: typeFilter === 'all' ? '#e0e7ff' : '#FFFFFF',
                  color: typeFilter === 'all' ? '#1e40af' : '#1D3557',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (typeFilter !== 'all') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (typeFilter !== 'all') {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  filter_list
                </span>
                All
              </button>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: typeFilter === t ? '#e0e7ff' : '#FFFFFF',
                    color: typeFilter === t ? '#1e40af' : '#1D3557',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (typeFilter !== t) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (typeFilter !== t) {
                      e.target.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {loading ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #1e40af',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginTop: '1rem',
                margin: 0
              }}>
                Loading schedule...
              </p>
            </div>
          ) : error ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <p style={{
                color: '#dc2626',
                fontSize: '1rem',
                fontWeight: '600',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                Failed to load gym sessions
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
                marginBottom: '1rem'
              }}>
                {error}
              </p>
              <button
                onClick={load}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '1rem'
            }}>
              {/* Calendar Grid */}
              {/* Day Headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '0.5rem 0.375rem',
                marginBottom: '0.375rem'
              }}>
                {daysOfWeek.map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#1D3557',
                      fontSize: '0.75rem',
                      padding: '0.375rem'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '0.5rem 0.375rem'
              }}>
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      minHeight: '6.5rem',
                      backgroundColor: '#f8f6f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '0.375rem'
                    }}
                  />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const key = formatDateKey(year, month, day);
                  const daySessions = sessionsByDate[key] || [];
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                  return (
                    <div
                      key={key}
                      style={{
                        minHeight: '6.5rem',
                        backgroundColor: isToday ? '#e0e7ff' : '#FFFFFF',
                        border: isToday ? '2px solid #1e40af' : '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        padding: '0.375rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        position: 'relative'
                      }}
                    >
                      {/* Day Number */}
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: isToday ? '600' : '500',
                        color: isToday ? '#1e40af' : '#1D3557',
                        marginBottom: '0.125rem'
                      }}>
                        {day}
                      </div>

                      {/* Sessions for this day */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        flex: 1,
                        overflowY: 'auto'
                      }}>
                        {daySessions.length === 0 ? (
                          <div style={{
                            fontSize: '0.625rem',
                            color: '#9ca3af',
                            textAlign: 'center',
                            marginTop: '0.125rem'
                          }}>
                            No sessions
                          </div>
                        ) : (
                          daySessions.map((s, sessionIdx) => {
                            try {
                              if (!s) return null;
                              
                              // Determine start time
                              let start = null;
                              if (s.startTime) {
                                start = new Date(s.startTime);
                                if (isNaN(start.getTime())) start = null;
                              }
                              if (!start && s.time) {
                                const sessionDate = new Date(s.date);
                                const [hh = '0', mm = '0'] = String(s.time).split(':');
                                start = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), parseInt(hh, 10) || 0, parseInt(mm, 10) || 0);
                              }

                              const typeLabel = s.title || (s.type ? (s.type.charAt(0).toUpperCase() + s.type.slice(1)) : 'Session');
                              const timeStr = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
                              const sessionType = s.type || 'other';
                              const sessionColor = getSessionTypeColor(sessionType);

                              return (
                                <div
                                  key={s._id || s.id || sessionIdx}
                                  style={{
                                    backgroundColor: sessionColor,
                                    color: '#1D3557',
                                    borderRadius: '0.25rem',
                                    padding: '0.25rem 0.375rem',
                                    fontSize: '0.625rem',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s, transform 0.2s',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.opacity = '0.9';
                                    e.target.style.transform = 'scale(1.02)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.opacity = '1';
                                    e.target.style.transform = 'scale(1)';
                                  }}
                                  title={`${typeLabel} at ${timeStr}`}
                                >
                                  <div style={{
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginBottom: '0.0625rem'
                                  }}>
                                    {typeLabel}
                                  </div>
                                  <div style={{
                                    fontSize: '0.5625rem',
                                    opacity: 0.8,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {timeStr}
                                  </div>
                                </div>
                              );
                            } catch (error) {
                              console.warn('Error rendering session:', s, error);
                              return null;
                            }
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Gym Session Modal */}
      {isCreateModalOpen && isEventsOffice && (
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
          setIsCreateModalOpen(false);
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1D3557',
                margin: 0
              }}>
                Create Gym Session
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              <GymSessionForm
                onSubmit={handleGymSessionCreate}
                loading={creating}
                submitLabel="Create Gym Session"
                loadingLabel="Creating..."
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GymSchedule;
