import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';

const AdminUsers = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | gucId
  const [pendingRoles, setPendingRoles] = useState({}); // id -> role
  const [updatingIds, setUpdatingIds] = useState({}); // id -> boolean
  const [messageById, setMessageById] = useState({}); // id -> message

  // Users state - will be loaded from API
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Verification controls - declared early so they can be used in useMemo
  const [verificationStatusById, setVerificationStatusById] = useState({});
  const [verifyingIds, setVerifyingIds] = useState({}); // id -> boolean
  const [verifyMsgById, setVerifyMsgById] = useState({}); // id -> message
  
  // Verification email state
  const [sendingEmailIds, setSendingEmailIds] = useState({}); // id -> boolean
  const [emailMsgById, setEmailMsgById] = useState({}); // id -> message

  const toggleRowExpansion = (userId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  // Separate users into pending verification and verified
  const { pendingVerificationUsers, verifiedUsers } = useMemo(() => {
    const pending = [];
    const verified = [];

    users.forEach(u => {
      const userId = u._id || u.id;
      const isVerified = verificationStatusById[userId] || u.isVerified;
      
      if (!isVerified && (['Staff', 'TA', 'Professor'].includes(u.userType) || !u.userType)) {
        pending.push(u);
      } else {
        verified.push(u);
      }
    });

    return { pendingVerificationUsers: pending, verifiedUsers: verified };
  }, [users, verificationStatusById]);

  const filterUsers = (userList) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return userList;

    const match = (u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
      const email = (u.email || '').toLowerCase();
      const gucId = (u.gucId || '').toLowerCase();
      const id = (u.id || u._id || '').toLowerCase();

      if (searchField === 'name') return name.includes(q);
      if (searchField === 'email') return email.includes(q);
      if (searchField === 'gucId') return gucId.includes(q) || id.includes(q);
      return name.includes(q) || email.includes(q) || gucId.includes(q) || id.includes(q);
    };

    return userList.filter(match);
  };

  const filteredPendingUsers = useMemo(() => filterUsers(pendingVerificationUsers), [pendingVerificationUsers, searchQuery, searchField]);
  const filteredVerifiedUsers = useMemo(() => filterUsers(verifiedUsers), [verifiedUsers, searchQuery, searchField]);

  // Only allow assigning academic roles
  const roleOptions = [
    'Staff',
    'TA',
    'Professor'
  ];

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Starting to load users...');
      console.log('🔍 Current user:', user);
      console.log('🔍 User type:', user?.userType);
      console.log('🔍 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const result = await adminApiService.getAllUsers();
      console.log('🔍 API result:', result);
      
      if (result.success) {
        console.log('🔍 Raw API response:', result);
        console.log('🔍 All users from API:', result.data.users);
        
        // More comprehensive filtering - handle different possible variations
        const filteredUsers = (result.data.users || []).filter(user => {
          const userType = user.userType;
          const userTypeLower = userType?.toLowerCase();
          
          // Check for various possible admin/event office variations
          const isAdmin = userType === 'Admin' || 
                         userType === 'admin' || 
                         userTypeLower === 'admin';
          
          const isEventOffice = userType === 'Event Office' || 
                               userType === 'event office' || 
                               userType === 'Event_Office' ||
                               userType === 'event_office' ||
                               userTypeLower === 'event office';
          
          const shouldExclude = isAdmin || isEventOffice;
          
          console.log(`🔍 User: ${user.firstName} ${user.lastName}`);
          console.log(`   - userType: "${userType}"`);
          console.log(`   - userTypeLower: "${userTypeLower}"`);
          console.log(`   - isAdmin: ${isAdmin}`);
          console.log(`   - isEventOffice: ${isEventOffice}`);
          console.log(`   - shouldExclude: ${shouldExclude}`);
          console.log('---');
          
          return !shouldExclude;
        });
        
        console.log('✅ Final filtered users count:', filteredUsers.length);
        console.log('✅ Filtered users:', filteredUsers);
        setUsers(filteredUsers);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, nextRole) => {
    setPendingRoles(prev => ({ ...prev, [userId]: nextRole }));
    setMessageById(prev => ({ ...prev, [userId]: '' }));
  };

  const handleUpdateRole = async (userId) => {
    const selectedRole = pendingRoles[userId];
    if (!selectedRole) {
      setMessageById(prev => ({ ...prev, [userId]: 'Please select a role first.' }));
      return;
    }

    setUpdatingIds(prev => ({ ...prev, [userId]: true }));
    setMessageById(prev => ({ ...prev, [userId]: '' }));

    try {
      // Use assignRoleAndSendVerification for Staff/TA/Professor registration requests
      const result = await adminApiService.assignRoleAndSendVerification(userId, selectedRole);
      if (result.success) {
        setMessageById(prev => ({ ...prev, [userId]: 'Role assigned and verification email sent successfully!' }));
        // Update the user in the local state
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, userType: selectedRole, isVerified: false } : u
        ));
        // Update verification status
        setVerificationStatusById(prev => ({ ...prev, [userId]: false }));
        // Reload users to update the sections
        setTimeout(() => {
          loadUsers();
        }, 1000);
        // Clear the pending role
        setPendingRoles(prev => ({ ...prev, [userId]: '' }));
        // Clear message after 5 seconds
        setTimeout(() => {
          setMessageById(prev => ({ ...prev, [userId]: '' }));
        }, 5000);
      } else {
        setMessageById(prev => ({ ...prev, [userId]: result.message || 'Failed to assign role and send verification email.' }));
      }
    } catch (err) {
      setMessageById(prev => ({ ...prev, [userId]: 'Failed to assign role and send verification email. Try again.' }));
    } finally {
      setUpdatingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const [activeStatusById, setActiveStatusById] = useState({});
  const [togglingIds, setTogglingIds] = useState({}); // id -> boolean
  const [toggleMsgById, setToggleMsgById] = useState({}); // id -> message

  // Update activeStatusById when users are loaded
  useEffect(() => {
    const initial = {};
    const verificationInitial = {};
    users.forEach(u => { 
      initial[u._id || u.id] = u.status === 'active'; 
      verificationInitial[u._id || u.id] = u.isVerified || false;
    });
    setActiveStatusById(initial);
    setVerificationStatusById(verificationInitial);
  }, [users]);

  const handleToggleActive = async (userId) => {
    const newStatus = !activeStatusById[userId];
    setTogglingIds(prev => ({ ...prev, [userId]: true }));
    setToggleMsgById(prev => ({ ...prev, [userId]: '' }));
    
    try {
      const result = await adminApiService.updateUserStatus(userId, newStatus);
      if (result.success) {
        setActiveStatusById(prev => ({ ...prev, [userId]: newStatus }));
        setToggleMsgById(prev => ({ ...prev, [userId]: 'Status updated.' }));
        // Update the user in the local state
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, status: newStatus ? 'active' : 'blocked' } : u
        ));
      } else {
        setToggleMsgById(prev => ({ ...prev, [userId]: result.message || 'Failed to update status.' }));
      }
    } catch (e) {
      setToggleMsgById(prev => ({ ...prev, [userId]: 'Failed to update status.' }));
    } finally {
      setTogglingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleToggleVerification = async (userId) => {
    console.log('🔍 handleToggleVerification called for userId:', userId);
    console.log('🔍 Current user:', user);
    console.log('🔍 User type:', user?.userType);
    console.log('🔍 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
    
    setVerifyingIds(prev => ({ ...prev, [userId]: true }));
    setVerifyMsgById(prev => ({ ...prev, [userId]: '' }));
    
    try {
      console.log('🔍 Calling sendVerificationEmail API...');
      const result = await adminApiService.sendVerificationEmail(userId);
      console.log('🔍 API result:', result);
      
      if (result.success) {
        console.log('✅ Verification email sent successfully');
        setVerifyMsgById(prev => ({ ...prev, [userId]: 'Verification email sent successfully!' }));
        // Reload users to update the sections
        setTimeout(() => {
          loadUsers();
        }, 1000);
        // Clear message after 3 seconds
        setTimeout(() => {
          setVerifyMsgById(prev => ({ ...prev, [userId]: '' }));
        }, 3000);
      } else {
        console.log('❌ Verification email failed:', result.message);
        setVerifyMsgById(prev => ({ ...prev, [userId]: result.message || 'Failed to send verification email.' }));
      }
    } catch (e) {
      console.log('❌ Verification email error:', e);
      const serverMessage = e?.response?.data?.message;
      setVerifyMsgById(prev => ({ ...prev, [userId]: serverMessage || 'Failed to send verification email.' }));
    } finally {
      setVerifyingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Send verification email handler
  const handleSendVerificationEmail = async (userId) => {
    setSendingEmailIds(prev => ({ ...prev, [userId]: true }));
    setEmailMsgById(prev => ({ ...prev, [userId]: '' }));

    try {
      const result = await adminApiService.sendVerificationEmail(userId);
      if (result.success) {
        setEmailMsgById(prev => ({ ...prev, [userId]: 'Verification email sent successfully!' }));
        // Clear message after 3 seconds
        setTimeout(() => {
          setEmailMsgById(prev => ({ ...prev, [userId]: '' }));
        }, 3000);
      } else {
        setEmailMsgById(prev => ({ ...prev, [userId]: result.message || 'Failed to send email.' }));
      }
    } catch (e) {
      const serverMessage = e?.response?.data?.message;
      setEmailMsgById(prev => ({ ...prev, [userId]: serverMessage || 'Failed to send verification email.' }));
    } finally {
      setSendingEmailIds(prev => ({ ...prev, [userId]: false }));
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

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.userType === 'admin' || user?.userType === 'Admin')) {
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
                  Users Management
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0'
                }}>
                  View and manage all platform users. Assign roles and send verification emails for registration requests.
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
                    onClick={loadUsers}
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

              {/* Search Controls */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1D3557';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                  />
                </div>
                <div style={{ width: '180px' }}>
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1D3557';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <option value="all">All fields</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="gucId">GUC ID / Record ID</option>
                  </select>
                </div>
              </div>

              {/* Pending Verification Users Section */}
              {filteredPendingUsers.length > 0 && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  marginBottom: '2rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fef3c7'
                  }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#92400e',
                      margin: 0
                    }}>
                      Pending Verification ({filteredPendingUsers.length})
                    </h4>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#a16207',
                      margin: '0.25rem 0 0 0'
                    }}>
                      Users awaiting role assignment and verification
                    </p>
                  </div>
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
                        <th style={{ padding: '1rem 1.5rem', width: '48px' }}></th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                      {filteredPendingUsers.map((u) => {
                        const userId = u._id || u.id;
                        const isExpanded = expandedRows.has(userId);
                        const needsRoleAssignment = !u.userType || (u.userType !== 'Student' && u.userType !== 'Vendor');
                        
                        return (
                          <React.Fragment key={userId}>
                            <tr style={{
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
                                {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown User'}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {u.email}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {u.userType || 'Not Assigned'}
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
                                  backgroundColor: u.status === 'active' ? '#d1fae5' : '#fee2e2',
                                  color: u.status === 'active' ? '#065f46' : '#991b1b'
                                }}>
                                  {u.status === 'active' ? 'Active' : 'Blocked'}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'right'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  {needsRoleAssignment && (
                                    <select
                                      value={pendingRoles[userId] ?? ''}
                                      onChange={(e) => handleRoleChange(userId, e.target.value)}
                                      style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        backgroundColor: '#FFFFFF',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="" disabled>Select role</option>
                                      {roleOptions.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                      ))}
                                    </select>
                                  )}
                                  {needsRoleAssignment && (
                                    <button
                                      onClick={() => handleUpdateRole(userId)}
                                      disabled={!!updatingIds[userId] || !pendingRoles[userId]}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: pendingRoles[userId] && !updatingIds[userId] ? '#1D3557' : '#9ca3af',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: pendingRoles[userId] && !updatingIds[userId] ? 'pointer' : 'not-allowed'
                                      }}
                                    >
                                      {updatingIds[userId] ? 'Assigning...' : 'Assign & Send Email'}
                                    </button>
                                  )}
                                  {!needsRoleAssignment && ['Staff', 'TA', 'Professor'].includes(u.userType) && (
                                    <button
                                      onClick={() => handleToggleVerification(userId)}
                                      disabled={!!verifyingIds[userId]}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: verifyingIds[userId] ? '#9ca3af' : '#f59e0b',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: verifyingIds[userId] ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {verifyingIds[userId] ? 'Sending...' : 'Send Email'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'right'
                              }}>
                                <button
                                  onClick={() => toggleRowExpansion(userId)}
                                  style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f3f4f6';
                                    e.target.style.color = '#137fec';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#6b7280';
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                    expand_more
                                  </span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td colSpan="6" style={{ padding: '1.5rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                      gap: '1rem'
                                    }}>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          GUC ID
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {u.gucId || 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          User ID
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {userId}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          Joined Date
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    {messageById[userId] && (
                                      <div style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: messageById[userId].includes('success') ? '#d1fae5' : '#fee2e2',
                                        color: messageById[userId].includes('success') ? '#065f46' : '#991b1b',
                                        fontSize: '0.875rem'
                                      }}>
                                        {messageById[userId]}
                                      </div>
                                    )}
                                    {verifyMsgById[userId] && (
                                      <div style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: verifyMsgById[userId].includes('success') ? '#d1fae5' : '#fee2e2',
                                        color: verifyMsgById[userId].includes('success') ? '#065f46' : '#991b1b',
                                        fontSize: '0.875rem'
                                      }}>
                                        {verifyMsgById[userId]}
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

              {/* All Users Section */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    All Users ({filteredVerifiedUsers.length})
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: '0.25rem 0 0 0'
                  }}>
                    Verified and active users
                  </p>
                </div>
                {filteredVerifiedUsers.length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#6b7280' }}>
                    {users.length === 0 ? 'No users found.' : 'No users match your search.'}
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
                        <th style={{ padding: '1rem 1.5rem', width: '48px' }}></th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                      {filteredVerifiedUsers.map((u) => {
                        const userId = u._id || u.id;
                        const isExpanded = expandedRows.has(userId);
                        const isVerified = verificationStatusById[userId] || u.isVerified;
                        
                        return (
                          <React.Fragment key={userId}>
                            <tr style={{
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
                                {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown User'}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {u.email}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {u.userType || 'Not Assigned'}
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
                                  backgroundColor: u.status === 'active' ? '#d1fae5' : '#fee2e2',
                                  color: u.status === 'active' ? '#065f46' : '#991b1b'
                                }}>
                                  {u.status === 'active' ? 'Active' : 'Blocked'}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'right'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleToggleActive(userId)}
                                    disabled={!!togglingIds[userId]}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: activeStatusById[userId] ? '#dc2626' : '#059669',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem',
                                      fontWeight: '500',
                                      cursor: togglingIds[userId] ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    {togglingIds[userId] ? 'Updating...' : (activeStatusById[userId] ? 'Block' : 'Activate')}
                                  </button>
                                </div>
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'right'
                              }}>
                                <button
                                  onClick={() => toggleRowExpansion(userId)}
                                  style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f3f4f6';
                                    e.target.style.color = '#137fec';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#6b7280';
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                    expand_more
                                  </span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td colSpan="6" style={{ padding: '1.5rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                      gap: '1rem'
                                    }}>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          GUC ID
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {u.gucId || 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          User ID
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {userId}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          Joined Date
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                          Verification Status
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                          {isVerified ? 'Verified' : 'Not Verified'}
                                        </p>
                                      </div>
                                    </div>
                                    {toggleMsgById[userId] && (
                                      <div style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        fontSize: '0.875rem'
                                      }}>
                                        {toggleMsgById[userId]}
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
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;
