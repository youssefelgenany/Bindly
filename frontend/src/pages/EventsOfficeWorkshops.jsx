import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const EventsOfficeWorkshops = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [processingIds, setProcessingIds] = useState({});
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'request-edits'
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [actionData, setActionData] = useState({ rejectionReason: '', editRequests: '' });

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadWorkshops = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workshops', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allWorkshops = Array.isArray(response.data) ? response.data : [];
      setWorkshops(allWorkshops);
    } catch (err) {
      console.error('Error loading workshops:', err);
      setError(err.response?.data?.error || 'Failed to load workshops');
      setWorkshops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  const filteredWorkshops = workshops.filter(workshop => {
    if (filter === 'all') return true;
    return workshop.status === filter;
  });

  const toggleRow = (workshopId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workshopId)) {
        newSet.delete(workshopId);
      } else {
        newSet.add(workshopId);
      }
      return newSet;
    });
  };

  const handleApprove = async (workshopId) => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
      }
    } catch (err) {
      console.error('Error approving workshop:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const handleReject = async (workshopId, rejectionReason = '') => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/reject`,
        { rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
      }
    } catch (err) {
      console.error('Error rejecting workshop:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const handleRequestEdits = async (workshopId, editRequests) => {
    try {
      setProcessingIds(prev => ({ ...prev, [workshopId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/workshops/${workshopId}/request-edits`,
        { editRequests },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        await loadWorkshops();
        setShowActionModal(false);
        setSelectedWorkshop(null);
        setActionData({ rejectionReason: '', editRequests: '' });
      }
    } catch (err) {
      console.error('Error requesting edits:', err);
    } finally {
      setProcessingIds(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const openActionModal = (workshop, type) => {
    setSelectedWorkshop(workshop);
    setActionType(type);
    setShowActionModal(true);
    setActionData({ rejectionReason: '', editRequests: '' });
  };

  const submitAction = () => {
    if (!selectedWorkshop) return;
    
    if (actionType === 'request-edits') {
      if (!actionData.editRequests.trim()) {
        alert('Please provide edit requests');
        return;
      }
      handleRequestEdits(selectedWorkshop._id, actionData.editRequests);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'needs_edits': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'needs_edits': return 'Needs Edits';
      default: return status;
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
                to="/create-bazaar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-bazaar') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-bazaar')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-bazaar')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-bazaar') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Bazaars
                </p>
              </Link>

              <Link
                to="/create-trip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-trip') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-trip')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-trip')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  flight_takeoff
                </span>
                <p style={{
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-trip') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Trips
                </p>
              </Link>

              <Link
                to="/create-conference"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-conference') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-conference')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-conference')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  groups
                </span>
                <p style={{
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-conference') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Conferences
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
                to="/create-gym-session"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-gym-session') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-gym-session')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-gym-session')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  fitness_center
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/create-gym-session') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    Create Gym Session
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
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                {displayName.charAt(0).toUpperCase()}
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
              Professor Workshops
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Review and manage workshops created by professors
            </p>
          </div>
          {/* Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: filter === 'all' ? '#1D3557' : '#FFFFFF',
                color: filter === 'all' ? '#FFFFFF' : '#1D3557',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filter === 'all' ? '600' : '500',
                border: filter === 'all' ? 'none' : '1px solid #E5E7EB'
              }}
            >
              All ({workshops.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: filter === 'pending' ? '#F59E0B' : '#FFFFFF',
                color: filter === 'pending' ? '#FFFFFF' : '#F59E0B',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filter === 'pending' ? '600' : '500',
                border: filter === 'pending' ? 'none' : '1px solid #E5E7EB'
              }}
            >
              Pending ({workshops.filter(w => w.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: filter === 'approved' ? '#10B981' : '#FFFFFF',
                color: filter === 'approved' ? '#FFFFFF' : '#10B981',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filter === 'approved' ? '600' : '500',
                border: filter === 'approved' ? 'none' : '1px solid #E5E7EB'
              }}
            >
              Approved ({workshops.filter(w => w.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('needs_edits')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: filter === 'needs_edits' ? '#3B82F6' : '#FFFFFF',
                color: filter === 'needs_edits' ? '#FFFFFF' : '#3B82F6',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filter === 'needs_edits' ? '600' : '500',
                border: filter === 'needs_edits' ? 'none' : '1px solid #E5E7EB'
              }}
            >
              Needs Edits ({workshops.filter(w => w.status === 'needs_edits').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: filter === 'rejected' ? '#EF4444' : '#FFFFFF',
                color: filter === 'rejected' ? '#FFFFFF' : '#EF4444',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: filter === 'rejected' ? '600' : '500',
                border: filter === 'rejected' ? 'none' : '1px solid #E5E7EB'
              }}
            >
              Rejected ({workshops.filter(w => w.status === 'rejected').length})
            </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              color: '#DC2626',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '3rem',
              color: '#6B7280'
            }}>
              Loading workshops...
            </div>
          )}

          {/* Workshops List */}
          {!loading && filteredWorkshops.length === 0 && (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E5E7EB'
            }}>
              No workshops found with status "{filter}".
            </div>
          )}

          {!loading && filteredWorkshops.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredWorkshops.map(workshop => {
                const isExpanded = expandedRows.has(workshop._id);
                const isProcessing = processingIds[workshop._id];
                const canRequestEdits = workshop.status === 'pending' || workshop.status === 'needs_edits';
                const canReject = workshop.status !== 'rejected' && workshop.status !== 'approved';
                const canApprove = workshop.status === 'pending' || workshop.status === 'needs_edits';

                return (
                  <div
                    key={workshop._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.5rem',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Workshop Header */}
                    <div
                      style={{
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none'
                      }}
                      onClick={() => toggleRow(workshop._id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1D3557',
                            margin: 0
                          }}>
                            {workshop.workshopName || workshop.title}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: `${getStatusColor(workshop.status)}20`,
                            color: getStatusColor(workshop.status)
                          }}>
                            {getStatusLabel(workshop.status)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                          <span>Location: {workshop.location}</span>
                          <span>Faculty: {workshop.facultyResponsible}</span>
                          <span>Start: {new Date(workshop.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{
                        color: '#6B7280',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}>
                        expand_more
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>SHORT DESCRIPTION</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.shortDescription}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>FULL AGENDA</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0, whiteSpace: 'pre-wrap' }}>{workshop.fullAgenda}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>START DATE & TIME</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                              {new Date(workshop.startDate).toLocaleDateString()} at {workshop.startTime}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>END DATE & TIME</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                              {new Date(workshop.endDate).toLocaleDateString()} at {workshop.endTime}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REGISTRATION DEADLINE</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                              {new Date(workshop.registrationDeadline).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>CAPACITY</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.capacity} participants</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>PROFESSORS PARTICIPATING</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                              {Array.isArray(workshop.professorsParticipating) 
                                ? workshop.professorsParticipating.join(', ')
                                : workshop.professorsParticipating}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REQUIRED BUDGET</p>
                            <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>
                              {workshop.requiredBudget} ({workshop.fundingSource})
                            </p>
                          </div>
                          {workshop.extraRequiredResources && (
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>EXTRA RESOURCES</p>
                              <p style={{ fontSize: '0.875rem', color: '#1D3557', margin: 0 }}>{workshop.extraRequiredResources}</p>
                            </div>
                          )}
                          {workshop.rejectionReason && (
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>REJECTION REASON</p>
                              <p style={{ fontSize: '0.875rem', color: '#EF4444', margin: 0 }}>{workshop.rejectionReason}</p>
                            </div>
                          )}
                          {workshop.editRequests && (
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>EDIT REQUESTS</p>
                              <p style={{ fontSize: '0.875rem', color: '#3B82F6', margin: 0 }}>{workshop.editRequests}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                          {canApprove && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(workshop._id);
                              }}
                              disabled={isProcessing}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                opacity: isProcessing ? 0.6 : 1
                              }}
                            >
                              {isProcessing ? 'Processing...' : 'Approve & Publish'}
                            </button>
                          )}
                          {canReject && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(workshop._id);
                              }}
                              disabled={isProcessing}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #EF4444',
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                opacity: isProcessing ? 0.6 : 1
                              }}
                            >
                              {isProcessing ? 'Processing...' : 'Reject'}
                            </button>
                          )}
                          {canRequestEdits && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openActionModal(workshop, 'request-edits');
                              }}
                              disabled={isProcessing}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #3B82F6',
                                backgroundColor: 'transparent',
                                color: '#3B82F6',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                opacity: isProcessing ? 0.6 : 1
                              }}
                            >
                              Request Edits
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Action Modal */}
      {showActionModal && (
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
          setShowActionModal(false);
          setSelectedWorkshop(null);
          setActionData({ rejectionReason: '', editRequests: '' });
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1D3557',
              margin: '0 0 1rem 0'
            }}>
              Request Edits
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6B7280',
              margin: '0 0 1.5rem 0'
            }}>
              Please specify what edits are needed:
            </p>
            <textarea
              value={actionData.editRequests}
              onChange={(e) => {
                setActionData({ ...actionData, editRequests: e.target.value });
              }}
              placeholder="Enter edit requests..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1.5rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedWorkshop(null);
                  setActionData({ rejectionReason: '', editRequests: '' });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={processingIds[selectedWorkshop?._id]}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  cursor: processingIds[selectedWorkshop?._id] ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  opacity: processingIds[selectedWorkshop?._id] ? 0.6 : 1
                }}
              >
                {processingIds[selectedWorkshop?._id] ? 'Processing...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsOfficeWorkshops;

