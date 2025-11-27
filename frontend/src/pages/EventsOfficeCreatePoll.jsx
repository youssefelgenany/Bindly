import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorRequestApi } from '../api/vendorRequestApi';
import axios from 'axios';

const EventsOfficeCreatePoll = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Poll form state
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [filterDuration, setFilterDuration] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadVendorRequests = useCallback(async () => {
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

      // Filter for platform booth requests that are pending
      const platformBoothRequests = allRequests.filter(req => {
        return req.eventType === 'platformBooth' && req.status === 'pending';
      });

      setVendorRequests(platformBoothRequests);
    } catch (err) {
      console.error('Error loading vendor requests:', err);
      setError('Failed to load vendor requests');
      setVendorRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendorRequests();
  }, [loadVendorRequests]);

  // Filter requests by duration and location
  const filteredRequests = vendorRequests.filter(req => {
    if (filterDuration && req.durationWeeks !== parseInt(filterDuration)) {
      return false;
    }
    if (filterLocation && req.boothLocation !== filterLocation) {
      return false;
    }
    return true;
  });

  // Group requests by duration and location
  const groupedRequests = filteredRequests.reduce((acc, req) => {
    const key = `${req.durationWeeks || 'N/A'}-${req.boothLocation || 'N/A'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(req);
    return acc;
  }, {});

  const toggleRequestSelection = (requestId) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim()) {
      alert('Please enter a poll title');
      return;
    }
    if (!pollDescription.trim()) {
      alert('Please enter a poll description');
      return;
    }
    if (selectedRequests.size < 2) {
      alert('Please select at least 2 vendor requests to create a poll');
      return;
    }

    setCreating(true);
    try {
      const result = await vendorRequestApi.createPoll({
        title: pollTitle.trim(),
        description: pollDescription.trim(),
        vendorRequestIds: Array.from(selectedRequests)
      });

      if (result.success) {
        alert('Poll created successfully!');
        // Reset form
        setPollTitle('');
        setPollDescription('');
        setSelectedRequests(new Set());
        // Reload requests
        await loadVendorRequests();
      } else {
        alert(result.message || 'Failed to create poll');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      alert('Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Events Office';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f8f6f6'
    }}>
      {/* Left Sidebar - Same as EventsOfficeEventsView */}
      <aside style={{
        width: sidebarOpen ? '16rem' : '0',
        flexShrink: 0,
        backgroundColor: '#1D3557',
        padding: sidebarOpen ? '1.5rem' : '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'width 0.3s ease, padding 0.3s ease',
        minWidth: sidebarOpen ? '16rem' : '0'
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
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
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
                  Events Office
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
                to="/event-office/vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
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
                to="/event-office/create-poll"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/create-poll') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/create-poll')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/create-poll')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/create-poll') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  poll
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/event-office/create-poll') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/event-office/create-poll') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    Create Poll
                  </p>
                )}
              </Link>
            </nav>
          )}
        </div>

        {/* Logout Button */}
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
        overflow: 'hidden',
        backgroundColor: '#f8f6f6'
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
                Events Office
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          paddingLeft: '6rem',
          paddingRight: '6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8',
          marginTop: '73px'
        }}>
          {/* Page Title Banner */}
          <div style={{
            position: 'relative',
            height: '160px',
            borderRadius: '1rem',
            overflow: 'hidden',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/bazaar-background.jpg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)'
            }}></div>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)'
            }}></div>
            <div style={{
              position: 'relative',
              zIndex: 10,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '2.5rem',
              color: '#FFFFFF'
            }}>
              <h1 style={{
                color: '#FFFFFF',
                fontSize: '2rem',
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                Create Vendor Poll
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '1rem',
                margin: 0
              }}>
                Create a poll for conflicting vendor requests with the same duration and location
              </p>
            </div>
          </div>

          {/* Poll Form */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Poll Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Poll Title *
                </label>
                <input
                  type="text"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g., Platform Booth Selection - Sports Area (2 weeks)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Poll Description *
                </label>
                <textarea
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  placeholder="Describe the poll and why these vendors are being voted on..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              Filter Requests
            </h3>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Duration (weeks)
                </label>
                <select
                  value={filterDuration}
                  onChange={(e) => setFilterDuration(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Durations</option>
                  <option value="1">1 Week</option>
                  <option value="2">2 Weeks</option>
                  <option value="3">3 Weeks</option>
                  <option value="4">4 Weeks</option>
                </select>
              </div>

              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Location
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Locations</option>
                  <option value="sports-area">Sports Area</option>
                  <option value="parking">Parking</option>
                  <option value="main-gate">Main Gate</option>
                  <option value="platform">Platform</option>
                  <option value="exam-halls">Exam Halls</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vendor Requests Selection */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Select Vendor Requests ({selectedRequests.size} selected)
              </h3>
              {selectedRequests.size > 0 && (
                <button
                  onClick={() => setSelectedRequests(new Set())}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                Loading vendor requests...
              </div>
            ) : error ? (
              <div style={{
                padding: '1rem',
                backgroundColor: '#fee2e2',
                borderRadius: '0.5rem',
                color: '#991b1b',
                textAlign: 'center'
              }}>
                {error}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                No pending platform booth requests found matching the filters
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(groupedRequests).map(([key, requests]) => {
                  const [duration, location] = key.split('-');
                  const locationNames = {
                    'sports-area': 'Sports Area',
                    'parking': 'Parking',
                    'main-gate': 'Main Gate',
                    'platform': 'Platform',
                    'exam-halls': 'Exam Halls'
                  };

                  return (
                    <div key={key} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      backgroundColor: '#f9fafb'
                    }}>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '1rem'
                      }}>
                        {locationNames[location] || location} - {duration} Week{duration !== '1' ? 's' : ''}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {requests.map((req) => {
                          const vendor = req.vendor || {};
                          const isSelected = selectedRequests.has(req._id);
                          
                          return (
                            <div
                              key={req._id}
                              onClick={() => toggleRequestSelection(req._id)}
                              style={{
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                border: `2px solid ${isSelected ? '#1e40af' : '#e5e7eb'}`,
                                backgroundColor: isSelected ? '#eff6ff' : '#FFFFFF',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#93c5fd';
                                  e.currentTarget.style.backgroundColor = '#f0f9ff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRequestSelection(req._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    cursor: 'pointer',
                                    accentColor: '#1e40af'
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#111827',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Unknown Vendor'}
                                  </div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    display: 'flex',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                  }}>
                                    <span>Booth Size: {req.boothSize || 'N/A'}</span>
                                    <span>Duration: {req.durationWeeks || 'N/A'} week{req.durationWeeks !== 1 ? 's' : ''}</span>
                                    <span>Location: {locationNames[req.boothLocation] || req.boothLocation || 'N/A'}</span>
                                  </div>
                                  {req.message && (
                                    <div style={{
                                      fontSize: '0.75rem',
                                      color: '#6b7280',
                                      marginTop: '0.5rem',
                                      fontStyle: 'italic'
                                    }}>
                                      "{req.message}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Poll Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              onClick={() => navigate('/event-office/platform-booth-requests')}
              style={{
                padding: '0.875rem 1.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#FFFFFF';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePoll}
              disabled={creating || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()}
              style={{
                padding: '0.875rem 1.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: (creating || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()) ? '#9ca3af' : '#1e40af',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: (creating || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!creating && selectedRequests.size >= 2 && pollTitle.trim() && pollDescription.trim()) {
                  e.target.style.backgroundColor = '#1e3a8a';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && selectedRequests.size >= 2 && pollTitle.trim() && pollDescription.trim()) {
                  e.target.style.backgroundColor = '#1e40af';
                }
              }}
            >
              {creating ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventsOfficeCreatePoll;

