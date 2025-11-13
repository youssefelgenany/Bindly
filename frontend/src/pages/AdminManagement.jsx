import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';

const AdminManagement = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'view'
  
  // Create form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Admin'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  // Admin accounts data - will be loaded from API
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, account: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const roleOptions = ['Admin', 'Event Office'];

  // Helper function to format userType for display
  const formatUserType = (userType) => {
    switch (userType) {
      case 'admin':
        return 'Admin';
      case 'event_office':
        return 'Event Office';
      default:
        return userType;
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin';

  // Load admin accounts on component mount
  useEffect(() => {
    loadAdminAccounts();
  }, []);

  const loadAdminAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApiService.getAllUsers();
      if (result.success) {
        // Filter for admin and event office accounts (handle both cases)
        const adminUsers = result.data.users.filter(user => 
          user.userType === 'Admin' || user.userType === 'admin' ||
          user.userType === 'Event Office' || user.userType === 'event_office'
        );
        setAdminAccounts(adminUsers);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load admin accounts');
      console.error('Error loading admin accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    if (!formData.password.trim()) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!formData.role) errors.role = 'Role is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsCreating(true);
    setCreateMessage('');

    try {
      const result = await adminApiService.createAdminAccount({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      if (result.success) {
        setCreateMessage('Account created successfully!');
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
        // Reload admin accounts to show the new one
        await loadAdminAccounts();
        // Switch to view tab after creation
        setTimeout(() => {
          setActiveTab('view');
        }, 1500);
      } else {
        setCreateMessage(result.message || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      setCreateMessage('Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (account) => {
    setDeleteConfirm({ show: true, account });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.account) return;

    setIsDeleting(true);
    try {
      const accountId = deleteConfirm.account._id || deleteConfirm.account.id;
      const result = await adminApiService.deleteAdminAccount(accountId);
      
      if (result.success) {
        setAdminAccounts(prev => prev.filter(acc => 
          (acc._id || acc.id) !== accountId
        ));
        setDeleteConfirm({ show: false, account: null });
      } else {
        alert(result.message || 'Failed to delete account');
      }
    } catch (error) {
      alert('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, account: null });
  };

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.userType === 'Admin' || user?.userType === 'admin')) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Unauthorized</h1>
              <p className="card-subtitle">You do not have access to this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  Admin Portal
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Management
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
                to="/admin/events-view"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/events-view') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/events-view')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/events-view')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/admin/events-view') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/events-view') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/admin/users"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/users') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/users')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/users')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  people
                </span>
                <p style={{
                  color: isActiveRoute('/admin/users') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/users') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Users
                </p>
              </Link>

              <Link
                to="/admin/platform-booth-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                <p style={{
                  color: isActiveRoute('/admin/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/platform-booth-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Platform Booths
                </p>
              </Link>

              <Link
                to="/admin/manage"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/manage') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/manage')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/manage')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/manage') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  settings
                </span>
                <p style={{
                  color: isActiveRoute('/admin/manage') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/manage') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Management
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
                Admin
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'A').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2.5rem',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Page Name Box */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '2rem',
                borderLeft: '4px solid #1D3557'
              }}>
                <h3 style={{
                  color: '#1D3557',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Admin & Event Office Management
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0'
                }}>
                  Create and manage admin and Event Office accounts
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{error}</span>
                  <button 
                    onClick={loadAdminAccounts}
                    style={{
                      marginLeft: '1rem',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#991b1b',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Tab Navigation */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '0.5rem',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => setActiveTab('create')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: activeTab === 'create' ? '#1D3557' : 'transparent',
                    color: activeTab === 'create' ? '#FFFFFF' : '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'create') {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'create') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Create New Account
                </button>
                <button
                  onClick={() => setActiveTab('view')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: activeTab === 'view' ? '#1D3557' : 'transparent',
                    color: activeTab === 'view' ? '#FFFFFF' : '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'view') {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'view') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  View All Accounts ({adminAccounts.length})
                </button>
              </div>

              {/* Create Account Form */}
              {activeTab === 'create' && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  padding: '2rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '1.5rem'
                  }}>
                    Create New Admin/Event Office Account
                  </h4>
                  
                  {createMessage && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      marginBottom: '1.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: createMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
                      color: createMessage.includes('successfully') ? '#065f46' : '#991b1b',
                      fontSize: '0.875rem'
                    }}>
                      {createMessage}
                    </div>
                  )}

                  <form onSubmit={handleCreateAccount}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          First Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleFormChange}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: `1px solid ${formErrors.firstName ? '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1D3557';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = formErrors.firstName ? '#ef4444' : '#e5e7eb';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          placeholder="First name"
                          disabled={isCreating}
                        />
                        {formErrors.firstName && (
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                            {formErrors.firstName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Last Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleFormChange}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: `1px solid ${formErrors.lastName ? '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1D3557';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = formErrors.lastName ? '#ef4444' : '#e5e7eb';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          placeholder="Last name"
                          disabled={isCreating}
                        />
                        {formErrors.lastName && (
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                            {formErrors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: `1px solid ${formErrors.email ? '#ef4444' : '#e5e7eb'}`,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          backgroundColor: '#FFFFFF',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1D3557';
                          e.target.style.backgroundColor = '#FFFFFF';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.email ? '#ef4444' : '#e5e7eb';
                          e.target.style.backgroundColor = '#FFFFFF';
                        }}
                        placeholder="admin@guc.edu.eg"
                        disabled={isCreating}
                      />
                      {formErrors.email && (
                        <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Password <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleFormChange}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: `1px solid ${formErrors.password ? '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1D3557';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = formErrors.password ? '#ef4444' : '#e5e7eb';
                            e.target.style.backgroundColor = '#FFFFFF';
                          }}
                          placeholder="Password (min 6 characters)"
                          disabled={isCreating}
                        />
                        {formErrors.password && (
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                            {formErrors.password}
                          </p>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Role <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleFormChange}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: `1px solid ${formErrors.role ? '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1D3557';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = formErrors.role ? '#ef4444' : '#e5e7eb';
                          }}
                          disabled={isCreating}
                        >
                          {roleOptions.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        {formErrors.role && (
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                            {formErrors.role}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
                          setFormErrors({});
                          setCreateMessage('');
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#f3f4f6';
                        }}
                        disabled={isCreating}
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: isCreating ? '#9ca3af' : '#1D3557',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: isCreating ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isCreating) {
                            e.target.style.backgroundColor = '#0f172a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCreating) {
                            e.target.style.backgroundColor = '#1D3557';
                          }
                        }}
                      >
                        {isCreating ? 'Creating Account...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* View All Accounts */}
              {activeTab === 'view' && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}>
                  {adminAccounts.length === 0 ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#6b7280' }}>
                      No admin or Event Office accounts found.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'left'
                          }}>
                            Name
                          </th>
                          <th style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'left'
                          }}>
                            Email
                          </th>
                          <th style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'left'
                          }}>
                            Role
                          </th>
                          <th style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'center'
                          }}>
                            Status
                          </th>
                          <th style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'right'
                          }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                        {adminAccounts.map((account) => {
                          const accountId = account._id || account.id;
                          const accountName = account.name || `${account.firstName || ''} ${account.lastName || ''}`.trim() || 'Unknown';
                          
                          return (
                            <tr
                              key={accountId}
                              style={{
                                borderBottom: '1px solid #e5e7eb',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                {accountName}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {account.email}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {formatUserType(account.userType)}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'center'
                              }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  backgroundColor: account.status === 'active' ? '#d1fae5' : '#fee2e2',
                                  color: account.status === 'active' ? '#065f46' : '#991b1b'
                                }}>
                                  {account.status === 'active' ? 'Active' : 'Blocked'}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'right'
                              }}>
                                <button
                                  onClick={() => handleDeleteClick(account)}
                                  disabled={isDeleting && deleteConfirm.account?._id === accountId}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#ef4444',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: (isDeleting && deleteConfirm.account?._id === accountId) ? 'not-allowed' : 'pointer',
                                    opacity: (isDeleting && deleteConfirm.account?._id === accountId) ? 0.6 : 1,
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!(isDeleting && deleteConfirm.account?._id === accountId)) {
                                      e.target.style.backgroundColor = '#dc2626';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!(isDeleting && deleteConfirm.account?._id === accountId)) {
                                      e.target.style.backgroundColor = '#ef4444';
                                    }
                                  }}
                                >
                                  {(isDeleting && deleteConfirm.account?._id === accountId) ? 'Deleting...' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.account && (
        <>
          <div
            onClick={handleDeleteCancel}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 1000
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(90vw, 400px)',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                Confirm Deletion
              </h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                Are you sure you want to delete the account for <strong>{deleteConfirm.account.name || `${deleteConfirm.account.firstName || ''} ${deleteConfirm.account.lastName || ''}`.trim()}</strong>?
              </p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) {
                      e.target.style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) {
                      e.target.style.backgroundColor = '#ef4444';
                    }
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminManagement;
