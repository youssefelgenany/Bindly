import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gymApiService } from '../api/gymApi';

const TYPES = ['yoga', 'pilates', 'aerobics', 'zumba', 'cross circuit', 'kick-boxing', 'strength', 'cardio', 'other'];

const GymSchedule = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'User';

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
                  Student Events
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
                  event_note
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
                to="/gym-schedule"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/gym-schedule') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
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
                <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
                  calendar_month
                </span>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Gym Schedule
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
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <div>
              <h1 style={{
                color: '#1D3557',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: 0
              }}>
                Gym Schedule
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
                marginTop: '0.25rem'
              }}>
                View sessions for the selected month
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {/* Filter and Navigation Toolbar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
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
              padding: '1.5rem'
            }}>
              {/* Calendar Grid */}
              {/* Day Headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                {daysOfWeek.map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#1D3557',
                      fontSize: '0.875rem',
                      padding: '0.5rem'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.5rem'
              }}>
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      minHeight: '8rem',
                      backgroundColor: '#f8f6f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.5rem'
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
                        minHeight: '8rem',
                        backgroundColor: isToday ? '#e0e7ff' : '#FFFFFF',
                        border: isToday ? '2px solid #1e40af' : '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        position: 'relative'
                      }}
                    >
                      {/* Day Number */}
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: isToday ? '600' : '500',
                        color: isToday ? '#1e40af' : '#1D3557',
                        marginBottom: '0.25rem'
                      }}>
                        {day}
                      </div>

                      {/* Sessions for this day */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        flex: 1,
                        overflowY: 'auto'
                      }}>
                        {daySessions.length === 0 ? (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            textAlign: 'center',
                            marginTop: '0.25rem'
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
                                    borderRadius: '0.375rem',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
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
                                    marginBottom: '0.125rem'
                                  }}>
                                    {typeLabel}
                                  </div>
                                  <div style={{
                                    fontSize: '0.6875rem',
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
