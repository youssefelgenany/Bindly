import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorRequestApi } from '../api/vendorRequestApi';
import EventsOfficeNotificationBell from './EventsOfficeNotificationBell';
import axios from 'axios';

const PlatformBoothRequests = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [processingIds, setProcessingIds] = useState({});
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'accepted', 'rejected'
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [filterDuration, setFilterDuration] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPollsModal, setShowPollsModal] = useState(false);
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollResults, setPollResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadPlatformBoothRequests = useCallback(async () => {
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

      // Check if response indicates an error
      if (response.data?.message && response.data.message.includes('Error')) {
        throw new Error(response.data.message);
      }

      // Handle different response formats
      let allRequests = [];
      if (Array.isArray(response.data)) {
        allRequests = response.data;
      } else if (response.data?.requests) {
        allRequests = response.data.requests;
      } else if (response.data?.success && response.data?.requests) {
        allRequests = response.data.requests;
      }

      console.log('🔍 All vendor requests:', allRequests);
      console.log('🔍 Total requests:', allRequests.length);

      // Filter for platform booth requests only
      // Platform booth requests have eventType: 'platformBooth' and no bazaar/booth references
      const platformBoothRequests = allRequests.filter(req => {
        // Check if it's explicitly marked as platformBooth
        if (req.eventType === 'platformBooth') {
          return true;
        }
        // Also check if it has no bazaar/booth references and has platform booth specific fields
        if (!req.bazaar && !req.booth && !req.standaloneBooth && req.boothLocation) {
          return true;
        }
        return false;
      });

      console.log('🔍 Platform booth requests (filtered):', platformBoothRequests);
      console.log('🔍 Platform booth requests count:', platformBoothRequests.length);
      setRequests(platformBoothRequests);
    } catch (err) {
      console.error('Error loading platform booth requests:', err);
      // Check if it's an axios error with response data
      if (err.response && err.response.status === 500) {
        const errorMessage = err.response.data?.message || err.message || 'Failed to load platform booth requests';
        // If backend returns error but we can still work with empty data, don't show error
        if (errorMessage.toLowerCase().includes('error fetching vendor')) {
          console.warn('Vendor request fetch had issues, continuing with empty list');
          setError('');
          setRequests([]);
        } else {
          setError(errorMessage);
          setRequests([]);
        }
      } else {
        // For other errors, show a generic message
        setError('Failed to load platform booth requests. Please try again.');
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformBoothRequests();
  }, [loadPlatformBoothRequests]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setProcessingIds(prev => ({ ...prev, [requestId]: true }));
      
      const result = await vendorRequestApi.updateStatus(requestId, newStatus);
      
      if (result.success) {
        // Reload requests
        await loadPlatformBoothRequests();
      } else {
        alert(result.message || 'Failed to update request status');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Failed to update request status');
    } finally {
      setProcessingIds(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  };

  const toggleRowExpansion = (requestId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
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

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      accepted: { bg: '#d1fae5', text: '#065f46', label: 'Accepted' },
      rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' }
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.text
      }}>
        {config.label}
      </span>
    );
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => (r.status || 'pending') === statusFilter);

  // Filter requests for poll creation (by duration and location)
  const getPollFilteredRequests = () => {
    return requests.filter(req => {
      if (req.status !== 'pending') return false;
      if (filterDuration && req.durationWeeks !== parseInt(filterDuration)) {
        return false;
      }
      if (filterLocation && req.boothLocation !== filterLocation) {
        return false;
      }
      return true;
    });
  };

  // Group requests by duration and location for poll creation
  const getGroupedRequests = () => {
    const filtered = getPollFilteredRequests();
    return filtered.reduce((acc, req) => {
      const key = `${req.durationWeeks || 'N/A'}-${req.boothLocation || 'N/A'}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(req);
      return acc;
    }, {});
  };

  const toggleRequestSelection = (requestId) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim()) {
      showToast('Please enter a poll title', 'error');
      return;
    }
    if (!pollDescription.trim()) {
      showToast('Please enter a poll description', 'error');
      return;
    }
    if (selectedRequests.size < 2) {
      showToast('Please select at least 2 vendor requests to create a poll', 'error');
      return;
    }

    setCreatingPoll(true);
    try {
      const result = await vendorRequestApi.createPoll({
        title: pollTitle.trim(),
        description: pollDescription.trim(),
        vendorRequestIds: Array.from(selectedRequests)
      });

      if (result.success) {
        showToast('Poll created successfully!', 'success');
        // Reset form
        setPollTitle('');
        setPollDescription('');
        setSelectedRequests(new Set());
        setFilterDuration('');
        setFilterLocation('');
        setShowCreatePollModal(false);
        // Reload requests and polls if polls modal is open
        await loadPlatformBoothRequests();
        if (showPollsModal) {
          await loadPolls();
        }
      } else {
        showToast(result.message || 'Failed to create poll', 'error');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      showToast('Failed to create poll', 'error');
    } finally {
      setCreatingPoll(false);
    }
  };

  const loadPolls = async () => {
    try {
      setLoadingPolls(true);
      console.log('🔍 Loading polls...');
      const result = await vendorRequestApi.getAllPolls();
      console.log('🔍 Polls API result:', result);
      
      if (result.success) {
        // Filter out any polls with invalid data
        const validPolls = (result.polls || []).filter(poll => {
          return poll && poll._id && poll.title;
        });
        console.log('🔍 Valid polls:', validPolls.length, validPolls);
        setPolls(validPolls);
        if (validPolls.length === 0 && result.polls && result.polls.length > 0) {
          console.warn('Some polls were filtered out due to invalid data');
        }
      } else {
        console.error('❌ Failed to load polls:', result.message);
        showToast(result.message || 'Failed to load polls', 'error');
        setPolls([]);
      }
    } catch (err) {
      console.error('❌ Error loading polls:', err);
      showToast(err.message || 'Failed to load polls', 'error');
      setPolls([]);
    } finally {
      setLoadingPolls(false);
    }
  };

  const loadPollResults = async (pollId) => {
    try {
      setLoadingResults(true);
      const result = await vendorRequestApi.getPollResults(pollId);
      if (result.success) {
        setPollResults(result.poll);
      } else {
        showToast(result.message || 'Failed to load poll results', 'error');
      }
    } catch (err) {
      console.error('Error loading poll results:', err);
      showToast('Failed to load poll results', 'error');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleViewPollResults = (poll) => {
    setSelectedPoll(poll);
    setPollResults(null);
    loadPollResults(poll._id);
  };

  const handleClosePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to close this poll? This action cannot be undone.')) {
      return;
    }
    try {
      const result = await vendorRequestApi.closePoll(pollId);
      if (result.success) {
        showToast('Poll closed successfully', 'success');
        await loadPolls();
        if (selectedPoll && selectedPoll._id === pollId) {
          setSelectedPoll(null);
          setPollResults(null);
        }
      } else {
        showToast(result.message || 'Failed to close poll', 'error');
      }
    } catch (err) {
      console.error('Error closing poll:', err);
      showToast('Failed to close poll', 'error');
    }
  };

  const getLocationName = (location) => {
    const locationNames = {
      'sports-area': 'Sports Area',
      'parking': 'Parking',
      'main-gate': 'Main Gate',
      'platform': 'Platform',
      'exam-halls': 'Exam Halls'
    };
    return locationNames[location] || location;
  };

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Events Office';

  // Sidebar component (same as EventsOfficeDashboard)
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
                to="/event-office/loyalty-partners"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/loyalty-partners') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  card_giftcard
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-partners') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
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
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
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
            {/* Notification Bell */}
            <EventsOfficeNotificationBell />
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
                {(user?.name?.[0] || user?.firstName?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div style={{
          flex: 1,
          padding: '2rem 6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
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
              backgroundImage: 'url(/assets/images/platform-booth.jpg)',
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
                Platform Booth Requests
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                Review and manage vendor platform booth reservation requests.
              </p>
            </div>
          </div>

          {/* Filter Buttons and Create Poll Button */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'pending', 'accepted', 'rejected'].map((status) => {
              const getLabel = (s) => {
                switch(s) {
                  case 'all': return `All (${requests.length})`;
                  case 'pending': return `Pending (${requests.filter(r => (r.status || 'pending') === 'pending').length})`;
                  case 'accepted': return `Accepted (${requests.filter(r => (r.status || 'pending') === 'accepted').length})`;
                  case 'rejected': return `Rejected (${requests.filter(r => (r.status || 'pending') === 'rejected').length})`;
                  default: return s;
                }
              };
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: statusFilter === status ? '#1e40af' : '#f9fafb',
                    color: statusFilter === status ? '#FFFFFF' : '#6b7280',
                    border: statusFilter === status ? 'none' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: statusFilter === status ? '600' : '500',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                    boxShadow: statusFilter === status ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (statusFilter !== status) {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (statusFilter !== status) {
                      e.target.style.backgroundColor = '#f9fafb';
                      e.target.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  {getLabel(status)}
                </button>
              );
            })}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setError(''); // Clear any previous errors
                    setShowPollsModal(true);
                    loadPolls();
                  }}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                    visibility
                  </span>
                  View Polls
                </button>
                <button
                  onClick={() => setShowCreatePollModal(true)}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                    poll
                  </span>
                  Create Poll
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Loading platform booth requests...
            </div>
          ) : error && !showPollsModal && !showCreatePollModal ? (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991b1b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '1rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  close
                </span>
              </button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '3rem',
              borderRadius: '0.75rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>
                location_off
              </span>
              <p style={{ fontSize: '1rem', margin: 0 }}>No {statusFilter === 'all' ? '' : statusFilter} platform booth requests found.</p>
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
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Booth Size</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date Applied</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const requestId = request._id;
                    const isExpanded = expandedRows.has(requestId);
                    const status = request.status || 'pending';
                    const isProcessing = !!processingIds[requestId];
                    const vendor = request.vendor || {};
                    const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Unknown Vendor';
                    
                    return (
                      <React.Fragment key={requestId}>
                        <tr style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#f9fafb' : '#FFFFFF'
                        }}
                        onClick={() => toggleRowExpansion(requestId)}
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
                            {vendorName}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.boothLocation ? request.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.boothSize || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {request.durationWeeks ? `${request.durationWeeks} week${request.durationWeeks > 1 ? 's' : ''}` : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatTableDate(request.createdAt)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {getStatusBadge(status)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {status === 'pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleStatusUpdate(requestId, 'accepted')}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isProcessing ? '#9ca3af' : '#059669',
                                    color: '#FFFFFF',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#047857';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#059669';
                                    }
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(requestId, 'rejected')}
                                  disabled={isProcessing}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isProcessing ? '#9ca3af' : '#dc2626',
                                    color: '#FFFFFF',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#b91c1c';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isProcessing) {
                                      e.target.style.backgroundColor = '#dc2626';
                                    }
                                  }}
                                >
                                  {isProcessing ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            )}
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
                            <td colSpan="8" style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Vendor Email</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {vendor.email || 'N/A'}
                                    </p>
                                  </div>
                                  {request.startDate && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Start Date</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {formatTableDate(request.startDate)}
                                      </p>
                                    </div>
                                  )}
                                  {request.boothId && (
                                    <div>
                                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Booth ID</p>
                                      <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                        {request.boothId}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {request.message && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>Message</p>
                                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                      {request.message}
                                    </p>
                                  </div>
                                )}
                                {request.attendees && request.attendees.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Attendees</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {request.attendees.map((attendee, idx) => (
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

      {/* Create Poll Modal */}
      {showCreatePollModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreatePollModal(false);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Create Vendor Poll
              </h3>
              <button
                onClick={() => setShowCreatePollModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Poll Details */}
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

              {/* Filters */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
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

                <div style={{ flex: 1 }}>
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

              {/* Vendor Requests Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    Select Vendor Requests ({selectedRequests.size} selected)
                  </h4>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {Object.entries(getGroupedRequests()).map(([key, requests]) => {
                    const [duration, location] = key.split('-');
                    return (
                      <div key={key} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb'
                      }}>
                        <h5 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '0.75rem'
                        }}>
                          {getLocationName(location)} - {duration} Week{duration !== '1' ? 's' : ''}
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {requests.map((req) => {
                            const vendor = req.vendor || {};
                            const isSelected = selectedRequests.has(req._id);
                            
                            return (
                              <div
                                key={req._id}
                                onClick={() => toggleRequestSelection(req._id)}
                                style={{
                                  padding: '0.75rem',
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                      gap: '0.75rem',
                                      flexWrap: 'wrap'
                                    }}>
                                      <span>Booth Size: {req.boothSize || 'N/A'}</span>
                                      <span>Duration: {req.durationWeeks || 'N/A'} week{req.durationWeeks !== 1 ? 's' : ''}</span>
                                    </div>
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
                {Object.keys(getGroupedRequests()).length === 0 && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    No pending platform booth requests found matching the filters
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <button
                onClick={() => {
                  setShowCreatePollModal(false);
                  setPollTitle('');
                  setPollDescription('');
                  setSelectedRequests(new Set());
                  setFilterDuration('');
                  setFilterLocation('');
                }}
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
                disabled={creatingPoll || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()}
                style={{
                  padding: '0.875rem 1.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: (creatingPoll || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()) ? '#9ca3af' : '#1e40af',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: (creatingPoll || selectedRequests.size < 2 || !pollTitle.trim() || !pollDescription.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!creatingPoll && selectedRequests.size >= 2 && pollTitle.trim() && pollDescription.trim()) {
                    e.target.style.backgroundColor = '#1e3a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingPoll && selectedRequests.size >= 2 && pollTitle.trim() && pollDescription.trim()) {
                    e.target.style.backgroundColor = '#1e40af';
                  }
                }}
              >
                {creatingPoll ? 'Creating...' : 'Create Poll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 10000,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#FFFFFF',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minWidth: '300px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', flex: 1 }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* View Polls Modal */}
      {showPollsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPollsModal(false);
            setSelectedPoll(null);
            setPollResults(null);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {selectedPoll ? 'Poll Results' : 'All Polls'}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedPoll && (
                  <button
                    onClick={() => {
                      setSelectedPoll(null);
                      setPollResults(null);
                    }}
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
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPollsModal(false);
                    setSelectedPoll(null);
                    setPollResults(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {selectedPoll ? (
                // Poll Results View
                <div>
                  {loadingResults ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                      Loading results...
                    </div>
                  ) : pollResults ? (
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#111827',
                          margin: 0,
                          marginBottom: '0.5rem'
                        }}>
                          {pollResults.title}
                        </h4>
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          margin: 0,
                          marginBottom: '1rem'
                        }}>
                          {pollResults.description}
                        </p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          <span>Status: <strong style={{ color: pollResults.status === 'active' ? '#10b981' : '#6b7280' }}>
                            {pollResults.status === 'active' ? 'Active' : 'Closed'}
                          </strong></span>
                          <span>Total Votes: <strong>{pollResults.totalVotes || 0}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pollResults.results && pollResults.results.length > 0 ? (
                          (() => {
                            const sortedResults = pollResults.results.sort((a, b) => b.voteCount - a.voteCount);
                            const isClosed = pollResults.status === 'closed';
                            const hasWinner = isClosed && sortedResults.length > 0 && 
                              (sortedResults.length === 1 || sortedResults[0].voteCount > sortedResults[1]?.voteCount);
                            
                            return sortedResults.map((result, index) => {
                              const vendorRequest = result.vendorRequest || {};
                              const vendor = vendorRequest?.vendor || {};
                              const percentage = pollResults.totalVotes > 0 
                                ? (result.voteCount / pollResults.totalVotes) * 100 
                                : 0;
                              const isWinner = hasWinner && index === 0;

                              return (
                                <div
                                  key={result.optionIndex}
                                  style={{
                                    border: isWinner ? '2px solid #10b981' : '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    padding: '1.5rem',
                                    backgroundColor: isWinner ? '#f0fdf4' : '#f9fafb'
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '1rem'
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      {isWinner && (
                                        <span style={{
                                          display: 'inline-block',
                                          padding: '0.25rem 0.75rem',
                                          borderRadius: '9999px',
                                          backgroundColor: '#10b981',
                                          color: '#FFFFFF',
                                          fontSize: '0.75rem',
                                          fontWeight: '600',
                                          marginBottom: '0.5rem'
                                        }}>
                                          🏆 Winner
                                        </span>
                                      )}
                                      <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#111827',
                                        marginBottom: '0.5rem'
                                      }}>
                                        {vendor?.companyName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}`.trim() || 'Unknown Vendor'}
                                      </div>
                                      <div style={{
                                        fontSize: '0.875rem',
                                        color: '#6b7280',
                                        display: 'flex',
                                        gap: '1rem',
                                        flexWrap: 'wrap'
                                      }}>
                                        <span>Booth Size: {vendorRequest?.boothSize || 'N/A'}</span>
                                        <span>Duration: {vendorRequest?.durationWeeks || 'N/A'} week{vendorRequest?.durationWeeks !== 1 ? 's' : ''}</span>
                                        <span>Location: {getLocationName(vendorRequest?.boothLocation)}</span>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#111827'
                                      }}>
                                        {result.voteCount}
                                      </div>
                                      <div style={{
                                        fontSize: '0.875rem',
                                        color: '#6b7280'
                                      }}>
                                        votes ({percentage.toFixed(1)}%)
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{
                                    width: '100%',
                                    height: '0.75rem',
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '9999px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${percentage}%`,
                                      height: '100%',
                                      backgroundColor: isWinner ? '#10b981' : '#3b82f6',
                                      transition: 'width 0.3s ease'
                                    }}></div>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#6b7280'
                          }}>
                            No votes yet
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                      Failed to load results
                    </div>
                  )}
                </div>
              ) : (
                // Polls List View
                <div>
                  {loadingPolls ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                      Loading polls...
                    </div>
                  ) : polls.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem',
                      color: '#6b7280'
                    }}>
                      No polls created yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {polls.map((poll) => (
                        <div
                          key={poll._id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            padding: '1.5rem',
                            backgroundColor: '#f9fafb'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#111827',
                                margin: 0,
                                marginBottom: '0.5rem'
                              }}>
                                {poll.title}
                              </h4>
                              <p style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                margin: 0,
                                marginBottom: '0.75rem'
                              }}>
                                {poll.description}
                              </p>
                              <div style={{
                                display: 'flex',
                                gap: '1rem',
                                fontSize: '0.75rem',
                                color: '#6b7280'
                              }}>
                                <span>Status: <strong style={{ color: poll.status === 'active' ? '#10b981' : '#6b7280' }}>
                                  {poll.status === 'active' ? 'Active' : 'Closed'}
                                </strong></span>
                                <span>Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
                                {poll.options && (
                                  <span>Options: {poll.options.length}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleViewPollResults(poll)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#FFFFFF',
                                  color: '#374151',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f3f4f6';
                                  e.target.style.borderColor = '#d1d5db';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#FFFFFF';
                                  e.target.style.borderColor = '#e5e7eb';
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  bar_chart
                                </span>
                                View Results
                              </button>
                              {poll.status === 'active' && (
                                <button
                                  onClick={() => handleClosePoll(poll._id)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: '#FFFFFF',
                                    color: '#ef4444',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#fef2f2';
                                    e.target.style.borderColor = '#fecaca';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.borderColor = '#e5e7eb';
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                    lock
                                  </span>
                                  Close Poll
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default PlatformBoothRequests;

