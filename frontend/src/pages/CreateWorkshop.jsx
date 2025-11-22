import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import professorApiService from '../api/professorApi';

const CreateWorkshop = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    workshopName: '',
    location: 'GUC Cairo',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    shortDescription: '',
    fullAgenda: '',
    facultyResponsible: 'MET',
    professorsParticipating: '',
    requiredBudget: '',
    fundingSource: 'GUC',
    extraRequiredResources: '',
    capacity: ''
  });

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate required fields
    const requiredFields = [
      'workshopName', 'location', 'startDate', 'endDate', 'startTime', 
      'endTime', 'registrationDeadline', 'shortDescription', 'fullAgenda',
      'facultyResponsible', 'professorsParticipating', 'requiredBudget',
      'fundingSource', 'capacity'
    ];

    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    // Validate short description length
    if (formData.shortDescription.length > 200) {
      setError('Short description must be 200 characters or less');
      setLoading(false);
      return;
    }

    // Validate dates
    const startDate = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDate = new Date(`${formData.endDate}T${formData.endTime}`);
    const registrationDeadline = new Date(formData.registrationDeadline);

    if (endDate <= startDate) {
      setError('End date and time must be after start date and time');
      setLoading(false);
      return;
    }

    if (registrationDeadline >= startDate) {
      setError('Registration deadline must be before the workshop start date');
      setLoading(false);
      return;
    }

    // Validate capacity and budget
    if (parseInt(formData.capacity) <= 0) {
      setError('Capacity must be greater than 0');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.requiredBudget) < 0) {
      setError('Required budget cannot be negative');
      setLoading(false);
      return;
    }

    try {
      // Format professors participating as array
      const professorsArray = formData.professorsParticipating
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (professorsArray.length === 0) {
        setError('Please provide at least one participating professor');
        setLoading(false);
        return;
      }

      // Prepare data for submission
      const submitData = {
        workshopName: formData.workshopName.trim(),
        location: formData.location,
        startDate: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
        endDate: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        registrationDeadline: new Date(formData.registrationDeadline).toISOString(),
        shortDescription: formData.shortDescription.trim(),
        fullAgenda: formData.fullAgenda.trim(),
        facultyResponsible: formData.facultyResponsible,
        professorsParticipating: professorsArray,
        requiredBudget: parseFloat(formData.requiredBudget),
        fundingSource: formData.fundingSource,
        extraRequiredResources: formData.extraRequiredResources.trim() || undefined,
        capacity: parseInt(formData.capacity)
      };

      console.log('Submitting workshop data:', submitData);
      const result = await professorApiService.createWorkshop(submitData);
      
      if (result.success) {
        setSuccess(true);
        setError('');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.message || 'Failed to create workshop');
      }
    } catch (err) {
      console.error('Error creating workshop:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/professor/my-workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/professor/my-workshops') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    My Workshops
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
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/professor/create-workshop') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/professor/create-workshop') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    Create Workshop
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
              Create Workshop
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              Submit a new workshop proposal for review and approval.
            </p>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            maxWidth: '900px',
            margin: '0 auto'
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

            {success && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: '0.375rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                fontSize: '0.875rem'
              }}>
                Workshop created successfully! Redirecting to dashboard...
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                    value={formData.workshopName}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.location}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.registrationDeadline}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.shortDescription}
                    onChange={handleChange}
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
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    marginBottom: 0
                  }}>
                    {formData.shortDescription.length}/200 characters
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
                    value={formData.fullAgenda}
                    onChange={handleChange}
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
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.facultyResponsible}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.professorsParticipating}
                    onChange={handleChange}
                    required
                    placeholder="Separate multiple professors with commas (e.g., Dr. Smith, Dr. Jones)"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    marginBottom: 0
                  }}>
                    Enter professor names separated by commas
                  </p>
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
                      value={formData.requiredBudget}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                      value={formData.fundingSource}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.extraRequiredResources}
                    onChange={handleChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={loading || success}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: loading || success ? '#9ca3af' : '#1e40af',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: loading || success ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && !success) {
                        e.target.style.backgroundColor = '#1e3a8a';
                        e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && !success) {
                        e.target.style.backgroundColor = '#1e40af';
                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }
                    }}
                  >
                    {loading ? 'Creating...' : success ? 'Created!' : 'Create Workshop'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
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
      </main>
    </div>
  );
};

export default CreateWorkshop;

