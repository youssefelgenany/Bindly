import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import professorApiService from '../api/professorApi';

const MyWorkshops = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadWorkshops = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const result = await professorApiService.getMyWorkshops();
      if (result.success) {
        setWorkshops(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.message || 'Failed to load workshops');
        setWorkshops([]);
      }
    } catch (err) {
      console.error('Error loading workshops:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setWorkshops([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWorkshops();
    }
  }, [user, loadWorkshops]);

  useEffect(() => {
    if (location.pathname === '/professor/my-workshops' && user) {
      loadWorkshops();
    }
  }, [location.pathname, user, loadWorkshops]);

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

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#059669',
      rejected: '#dc2626',
      needs_edits: '#d97706'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      needs_edits: 'Needs Edits'
    };
    return labels[status?.toLowerCase()] || status;
  };

  const handleEditClick = (workshop) => {
    // Format dates for the form
    const startDate = workshop.startDate ? new Date(workshop.startDate).toISOString().split('T')[0] : '';
    const endDate = workshop.endDate ? new Date(workshop.endDate).toISOString().split('T')[0] : '';
    
    // Format registration deadline as datetime-local (YYYY-MM-DDTHH:mm)
    let registrationDeadline = '';
    if (workshop.registrationDeadline) {
      const deadlineDate = new Date(workshop.registrationDeadline);
      const year = deadlineDate.getFullYear();
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
      const day = String(deadlineDate.getDate()).padStart(2, '0');
      const hours = String(deadlineDate.getHours()).padStart(2, '0');
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
      registrationDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Format times
    const startTime = workshop.startTime || '';
    const endTime = workshop.endTime || '';

    setEditFormData({
      id: workshop._id,
      workshopName: workshop.workshopName || '',
      location: workshop.location || 'GUC Cairo',
      startDate: startDate,
      endDate: endDate,
      startTime: startTime,
      endTime: endTime,
      registrationDeadline: registrationDeadline,
      shortDescription: workshop.shortDescription || '',
      fullAgenda: workshop.fullAgenda || '',
      facultyResponsible: workshop.facultyResponsible || 'MET',
      professorsParticipating: Array.isArray(workshop.professorsParticipating) 
        ? workshop.professorsParticipating.join(', ') 
        : workshop.professorsParticipating || '',
      requiredBudget: workshop.requiredBudget || '',
      fundingSource: workshop.fundingSource || 'GUC',
      extraRequiredResources: workshop.extraRequiredResources || '',
      capacity: workshop.capacity || ''
    });
    setSelectedWorkshop(workshop);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate required fields
      if (!editFormData.workshopName || !editFormData.startDate || !editFormData.endDate || 
          !editFormData.startTime || !editFormData.endTime || !editFormData.registrationDeadline ||
          !editFormData.shortDescription || !editFormData.fullAgenda || !editFormData.facultyResponsible ||
          !editFormData.professorsParticipating || !editFormData.requiredBudget || !editFormData.fundingSource ||
          !editFormData.capacity) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      // Format professors participating as array
      const professorsArray = editFormData.professorsParticipating
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (professorsArray.length === 0) {
        setError('Please provide at least one participating professor');
        setSaving(false);
        return;
      }

      // Validate dates
      const startDateTime = new Date(`${editFormData.startDate}T${editFormData.startTime}`);
      const endDateTime = new Date(`${editFormData.endDate}T${editFormData.endTime}`);
      const registrationDeadlineDate = new Date(editFormData.registrationDeadline);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || isNaN(registrationDeadlineDate.getTime())) {
        setError('Invalid date or time format');
        setSaving(false);
        return;
      }

      if (endDateTime <= startDateTime) {
        setError('End date and time must be after start date and time');
        setSaving(false);
        return;
      }

      if (registrationDeadlineDate >= startDateTime) {
        setError('Registration deadline must be before the workshop start date');
        setSaving(false);
        return;
      }

      // Validate capacity and budget
      const capacity = parseInt(editFormData.capacity);
      const budget = parseFloat(editFormData.requiredBudget);

      if (isNaN(capacity) || capacity <= 0) {
        setError('Capacity must be a positive number');
        setSaving(false);
        return;
      }

      if (isNaN(budget) || budget < 0) {
        setError('Required budget must be a valid number');
        setSaving(false);
        return;
      }

      // Validate short description length
      if (editFormData.shortDescription.trim().length > 200) {
        setError('Short description must be 200 characters or less');
        setSaving(false);
        return;
      }

      // Prepare data for submission
      const submitData = {
        workshopName: editFormData.workshopName.trim(),
        location: editFormData.location,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        registrationDeadline: registrationDeadlineDate.toISOString(),
        shortDescription: editFormData.shortDescription.trim(),
        fullAgenda: editFormData.fullAgenda.trim(),
        facultyResponsible: editFormData.facultyResponsible,
        professorsParticipating: professorsArray,
        requiredBudget: budget,
        fundingSource: editFormData.fundingSource,
        extraRequiredResources: editFormData.extraRequiredResources?.trim() || undefined,
        capacity: capacity
      };

      console.log('Submitting workshop update:', submitData);
      const result = await professorApiService.updateWorkshop(editFormData.id, submitData);
      console.log('Update result:', result);
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedWorkshop(null);
        setError('');
        await loadWorkshops(); // Reload workshops
      } else {
        setError(result.message || result.error?.message || 'Failed to update workshop');
      }
    } catch (err) {
      console.error('Error updating workshop:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

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
                  Professor Portal
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
                  backgroundColor: isActiveRoute('/dashboard') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
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
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  dashboard
                </span>
                <p style={{
                  color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/dashboard') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/professor/all-events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/all-events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/all-events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/all-events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/all-events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/professor/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  event_note
                </span>
                <p style={{
                  color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Events
                </p>
              </Link>

              <Link
                to="/professor/my-workshops"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/my-workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/my-workshops')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/my-workshops')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  work
                </span>
                <p style={{
                  color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/my-workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  My Workshops
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
                <p style={{
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  View Gym Sessions
                </p>
              </Link>

              <Link
                to="/professor/create-workshop"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/professor/create-workshop') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/professor/create-workshop')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/professor/create-workshop')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '1.25rem'
                }}>
                  add_circle
                </span>
                <p style={{
                  color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/professor/create-workshop') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Create Workshop
                </p>
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
              My Workshops
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
                Professor
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
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
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px'
            }}>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading workshops...</p>
            </div>
          ) : workshops.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              textAlign: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#9ca3af', marginBottom: '1rem' }}>
                work_off
              </span>
              <h3 style={{ color: '#374151', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No Workshops Found
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                You haven't created any workshops yet.
              </p>
              <Link
                to="/professor/create-workshop"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                }}
              >
                Create Your First Workshop
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {workshops.map((workshop) => (
                <div
                  key={workshop._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                  }}
                >
                  {/* Header with Status and Edit Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        margin: 0,
                        marginBottom: '0.5rem'
                      }}>
                        {workshop.workshopName}
                      </h3>
                      <div style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        backgroundColor: getStatusColor(workshop.status) + '20',
                        color: getStatusColor(workshop.status),
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {getStatusLabel(workshop.status)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(workshop);
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#9ca3af';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.borderColor = '#d1d5db';
                      }}
                      title="Edit Workshop"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#374151' }}>
                        edit
                      </span>
                    </button>
                  </div>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
                      <span>{workshop.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>calendar_today</span>
                      <span>{formatDateOnly(workshop.startDate)} - {formatDateOnly(workshop.endDate)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>access_time</span>
                      <span>{workshop.startTime} - {workshop.endTime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>school</span>
                      <span>{workshop.facultyResponsible}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>people</span>
                      <span>Capacity: {workshop.capacity}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {workshop.shortDescription && (
                    <p style={{
                      color: '#374151',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {workshop.shortDescription}
                    </p>
                  )}

                  {/* Rejection Reason or Edit Requests */}
                  {workshop.status === 'rejected' && workshop.rejectionReason && (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca'
                    }}>
                      <p style={{ color: '#991b1b', fontSize: '0.875rem', fontWeight: '600', margin: 0, marginBottom: '0.25rem' }}>
                        Rejection Reason:
                      </p>
                      <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: 0 }}>
                        {workshop.rejectionReason}
                      </p>
                    </div>
                  )}

                  {workshop.status === 'needs_edits' && workshop.editRequests && (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a'
                    }}>
                      <p style={{ color: '#92400e', fontSize: '0.875rem', fontWeight: '600', margin: 0, marginBottom: '0.25rem' }}>
                        Edit Requests:
                      </p>
                      <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                        {workshop.editRequests}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
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
          zIndex: 1000,
          padding: '2rem'
        }}
        onClick={() => {
          if (!saving) {
            setShowEditModal(false);
            setSelectedWorkshop(null);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1D3557', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                Edit Workshop
              </h2>
              <button
                onClick={() => {
                  if (!saving) {
                    setShowEditModal(false);
                    setSelectedWorkshop(null);
                  }
                }}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#6b7280' }}>
                  close
                </span>
              </button>
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

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Workshop Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Workshop Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="workshopName"
                    value={editFormData.workshopName || ''}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Location <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    name="location"
                    value={editFormData.location || 'GUC Cairo'}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="GUC Cairo">GUC Cairo</option>
                    <option value="GUC Berlin">GUC Berlin</option>
                  </select>
                </div>

                {/* Date and Time Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Start Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={editFormData.startDate || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
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
                      Start Time <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={editFormData.startTime || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      End Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={editFormData.endDate || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
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
                      End Time <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={editFormData.endTime || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Registration Deadline */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Registration Deadline <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={editFormData.registrationDeadline || ''}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Short Description <span style={{ color: '#dc2626' }}>*</span> (max 200 characters)
                  </label>
                  <textarea
                    name="shortDescription"
                    value={editFormData.shortDescription || ''}
                    onChange={handleEditChange}
                    required
                    maxLength={200}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    marginBottom: 0
                  }}>
                    {(editFormData.shortDescription || '').length}/200 characters
                  </p>
                </div>

                {/* Full Agenda */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Full Agenda <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    name="fullAgenda"
                    value={editFormData.fullAgenda || ''}
                    onChange={handleEditChange}
                    required
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Faculty Responsible */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Faculty Responsible <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    name="facultyResponsible"
                    value={editFormData.facultyResponsible || 'MET'}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="MET">MET</option>
                    <option value="IET">IET</option>
                    <option value="EMS">EMS</option>
                    <option value="BI">BI</option>
                    <option value="MGT">MGT</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="AA">AA</option>
                    <option value="Pharm">Pharm</option>
                    <option value="Arch">Arch</option>
                  </select>
                </div>

                {/* Professors Participating */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Professor(s) Participating <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="professorsParticipating"
                    value={editFormData.professorsParticipating || ''}
                    onChange={handleEditChange}
                    required
                    placeholder="Separate multiple professors with commas"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Budget and Funding Source Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Required Budget <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="requiredBudget"
                      value={editFormData.requiredBudget || ''}
                      onChange={handleEditChange}
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
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
                      Funding Source <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      name="fundingSource"
                      value={editFormData.fundingSource || 'GUC'}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="GUC">GUC</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                </div>

                {/* Extra Required Resources */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Extra Required Resources
                  </label>
                  <textarea
                    name="extraRequiredResources"
                    value={editFormData.extraRequiredResources || ''}
                    onChange={handleEditChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Capacity <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={editFormData.capacity || ''}
                    onChange={handleEditChange}
                    required
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: saving ? '#9ca3af' : '#1e40af',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#1e3a8a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#1e40af';
                      }
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!saving) {
                        setShowEditModal(false);
                        setSelectedWorkshop(null);
                      }
                    }}
                    disabled={saving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.borderColor = '#d1d5db';
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyWorkshops;

