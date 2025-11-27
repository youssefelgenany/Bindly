import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';
import VendorNotificationBell from '../components/VendorNotificationBell';

const AdminUsers = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | gucId
  const [roleFilter, setRoleFilter] = useState('all'); // all | Admin | Event Office | TA | Staff | Professor | Student
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, userId: null });
  const [deletingIds, setDeletingIds] = useState({}); // id -> boolean
  const [pendingRoles, setPendingRoles] = useState({}); // id -> role
  const [updatingIds, setUpdatingIds] = useState({}); // id -> boolean
  const [messageById, setMessageById] = useState({}); // id -> message
  const [sectionExpanded, setSectionExpanded] = useState({
    pending: false,
    all: true
  });

  // Users state - will be loaded from API
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [documentPreview, setDocumentPreview] = useState({
    visible: false,
    url: '',
    type: '',
    title: ''
  });
  
  // Verification controls - declared early so they can be used in useMemo
  const [verificationStatusById, setVerificationStatusById] = useState({});
  const [verifyingIds, setVerifyingIds] = useState({}); // id -> boolean
  const [verifyMsgById, setVerifyMsgById] = useState({}); // id -> message
  
  // Verification email state
  const [sendingEmailIds, setSendingEmailIds] = useState({}); // id -> boolean
  const [emailMsgById, setEmailMsgById] = useState({}); // id -> message

  // Create account modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const toggleRowExpansion = (userId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSectionExpansion = (section) => {
    setSectionExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Separate users into pending verification and verified
  const { pendingVerificationUsers, verifiedUsers } = useMemo(() => {
    const pending = [];
    const verified = [];

    users.forEach(u => {
      const userId = u._id || u.id;
      const isVerified = verificationStatusById[userId] || u.isVerified;
      const userType = u.userType;
      const userTypeLower = userType?.toLowerCase();
      
      // Check if user is Admin or Event Office
      const isAdmin = userType === 'Admin' || userType === 'admin' || userTypeLower === 'admin';
      const isEventOffice = userType === 'Event Office' || userType === 'event office' || 
                           userType === 'Event_Office' || userType === 'event_office' ||
                           userTypeLower === 'event office';
      
      // Admin and Event Office accounts are always verified, other users follow normal logic
      if (isAdmin || isEventOffice) {
        verified.push(u);
      } else if (!isVerified && (['Staff', 'TA', 'Professor'].includes(u.userType) || !u.userType)) {
        pending.push(u);
      } else {
        verified.push(u);
      }
    });

    return { pendingVerificationUsers: pending, verifiedUsers: verified };
  }, [users, verificationStatusById]);

  const filterUsers = (userList) => {
    let filtered = userList;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => {
        const userType = u.userType;
        const userTypeLower = userType?.toLowerCase();
        
        if (roleFilter === 'Admin') {
          return userType === 'Admin' || userType === 'admin' || userTypeLower === 'admin';
        } else if (roleFilter === 'Event Office') {
          return userType === 'Event Office' || userType === 'event office' || 
                 userType === 'Event_Office' || userType === 'event_office' ||
                 userTypeLower === 'event office';
        } else if (roleFilter === 'Vendor') {
          return userType === 'Vendor' || userType === 'vendor' || userTypeLower === 'vendor';
        } else {
          return userType === roleFilter;
        }
      });
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;

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

    return filtered.filter(match);
  };

  const filteredPendingUsers = useMemo(() => filterUsers(pendingVerificationUsers), [pendingVerificationUsers, searchQuery, searchField, roleFilter]);
  const filteredVerifiedUsers = useMemo(() => filterUsers(verifiedUsers), [verifiedUsers, searchQuery, searchField, roleFilter]);

  // Only allow assigning academic roles
  const roleOptions = [
    'Staff',
    'TA',
    'Professor'
  ];

  // Create account form handlers
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
        setFormErrors({});
        // Reload users to show the new account
        await loadUsers();
        // Close modal after a delay
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateMessage('');
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

  const roleOptionsForCreate = ['Admin', 'Event Office'];

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (documentPreview.url) {
        window.URL.revokeObjectURL(documentPreview.url);
      }
    };
  }, [documentPreview.url]);

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
        
        // Include all users (including Admin and Event Office accounts)
        setUsers(result.data.users || []);
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
      console.log('🔄 Assigning role and sending verification:', { userId, role: selectedRole });
      // Use assignRoleAndSendVerification for Staff/TA/Professor registration requests
      const result = await adminApiService.assignRoleAndSendVerification(userId, selectedRole);
      console.log('📬 Result from API:', result);
      
      if (result.success) {
        // Show appropriate message based on email sending status
        let successMessage = result.message || 'Role assigned and verification email sent successfully!';
        
        // If email wasn't sent, show a warning message
        if (result.emailSent === false) {
          successMessage = result.message || 'Role assigned, but verification email could not be sent. Please try again.';
          console.warn('⚠️ Email not sent:', result.emailError);
        }
        
        setMessageById(prev => ({ ...prev, [userId]: successMessage }));
        
        // Update the user in the local state
        // Note: Backend sets isVerified to true when admin assigns role
        setUsers(prev => prev.map(u => 
          u._id === userId || u.id === userId ? { ...u, userType: selectedRole, isVerified: true } : u
        ));
        // Update verification status
        setVerificationStatusById(prev => ({ ...prev, [userId]: true }));
        
        // Reload users to update the sections
        setTimeout(() => {
          loadUsers();
        }, 1000);
        // Clear the pending role
        setPendingRoles(prev => ({ ...prev, [userId]: '' }));
        // Clear message after 5 seconds (or 8 seconds if email failed)
        setTimeout(() => {
          setMessageById(prev => ({ ...prev, [userId]: '' }));
        }, result.emailSent === false ? 8000 : 5000);
      } else {
        const errorMessage = result.message || 'Failed to assign role and send verification email.';
        console.error('❌ Failed to assign role:', errorMessage);
        setMessageById(prev => ({ ...prev, [userId]: errorMessage }));
      }
    } catch (err) {
      console.error('❌ Exception in handleUpdateRole:', err);
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
      // Use dedicated block/unblock endpoints instead of updateUserStatus
      const result = newStatus 
        ? await adminApiService.unblockUser(userId)
        : await adminApiService.blockUser(userId);
      
      if (result.success) {
        setActiveStatusById(prev => ({ ...prev, [userId]: newStatus }));
        setToggleMsgById(prev => ({ ...prev, [userId]: result.message || 'Status updated.' }));
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

  const handleDeleteClick = (userId) => {
    setDeleteConfirm({ show: true, userId });
  };

  const closeDocumentPreview = () => {
    if (documentPreview.url) {
      window.URL.revokeObjectURL(documentPreview.url);
    }
    setDocumentPreview({
      visible: false,
      url: '',
      type: '',
      title: ''
    });
  };

  const handleViewDocument = async (vendorId, documentType) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/vendor/${vendorId}/documents/${documentType}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const vendor = users.find(v => (v._id || v.id) === vendorId);
        const vendorName = vendor?.companyName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}`.trim() || 'Vendor Document';
        const contentType = blob.type || '';
        const type = contentType.includes('pdf') ? 'pdf' : 'image';

        if (documentPreview.url) {
          window.URL.revokeObjectURL(documentPreview.url);
        }

        setDocumentPreview({
          visible: true,
          url: blobUrl,
          type,
          title: `${vendorName} — ${documentType === 'logo' ? 'Logo' : 'Tax Card'}`
        });
      } else {
        alert('Failed to load document');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (vendorId, documentType) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/vendor/${vendorId}/documents/${documentType}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const vendor = users.find(v => (v._id || v.id) === vendorId);
        const companyName = vendor?.companyName || 'vendor';
        const safeName = companyName.replace(/[^a-z0-9]/gi, '_');
        link.download = `${safeName}_${documentType}.${documentType === 'logo' ? 'png' : 'pdf'}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.userId) return;

    const userId = deleteConfirm.userId;
    setDeletingIds(prev => ({ ...prev, [userId]: true }));

    try {
      const result = await adminApiService.deleteAdminAccount(userId);
      
      if (result.success) {
        // Remove user from list
        setUsers(prev => prev.filter(u => (u._id || u.id) !== userId));
        setDeleteConfirm({ show: false, userId: null });
      } else {
        alert(result.message || 'Failed to delete account');
      }
    } catch (error) {
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeletingIds(prev => ({ ...prev, [userId]: false }));
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
                to="/admin/loyalty-program-vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/admin/loyalty-program-vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/admin/loyalty-program-vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/admin/loyalty-program-vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/admin/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  local_offer
                </span>
                <p style={{
                  color: isActiveRoute('/admin/loyalty-program-vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/admin/loyalty-program-vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
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
            <VendorNotificationBell managePath="/admin/platform-booth-requests" />
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
          padding: '2.5rem 6rem',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
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
                  backgroundImage: 'url(/assets/images/admin-users.jpg)',
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
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2rem 2.5rem',
                  color: '#FFFFFF',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{
                      color: '#FFFFFF',
                      fontSize: '1.75rem',
                      fontWeight: '700',
                      margin: 0,
                      marginBottom: '0.5rem'
                    }}>
                      Users Management
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      margin: 0
                    }}>
                      View and manage all platform users. Assign roles and send verification emails for registration requests.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#FFFFFF',
                      color: '#1D3557',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f0f0f0';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#FFFFFF';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                      add
                    </span>
                    Create Account
                  </button>
                </div>
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

              {/* Search and Filters */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {/* Search Bar and Filters Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: sidebarOpen ? '1fr' : 'minmax(320px, 420px) auto',
                    gap: '1rem',
                    width: '100%',
                    alignItems: 'start'
                  }}
                >
                  {/* Search Bar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'center',
                      flexWrap: 'nowrap'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '420px'
                      }}
                    >
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
                        placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.875rem',
                          outline: 'none',
                          transition: 'all 0.2s',
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
                    <button
                      onClick={() => setSearchQuery(searchQuery)}
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
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        flexShrink: 0
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
            </div>

                  {/* Filter Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: sidebarOpen ? 'wrap' : 'nowrap',
                      alignItems: 'center',
                      justifyContent: sidebarOpen ? 'flex-start' : 'flex-end'
                    }}
                  >
                    {['all', 'Admin', 'Event Office', 'TA', 'Staff', 'Professor', 'Student', 'Vendor'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        style={{
                          padding: '0.625rem 1.25rem',
                          borderRadius: '0.5rem',
                          backgroundColor: roleFilter === role ? '#1e40af' : '#f9fafb',
                          color: roleFilter === role ? '#FFFFFF' : '#6b7280',
                          border: roleFilter === role ? 'none' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          fontWeight: roleFilter === role ? '600' : '500',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s',
                          boxShadow: roleFilter === role ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                          minWidth: '90px',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (roleFilter !== role) {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.borderColor = '#d1d5db';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (roleFilter !== role) {
                            e.target.style.backgroundColor = '#f9fafb';
                            e.target.style.borderColor = '#e5e7eb';
                          }
                        }}
                      >
                        {role === 'all' ? 'All Users' : role}
                      </button>
                    ))}
                  </div>
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
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                  <div>
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
                  <button
                    onClick={() => toggleSectionExpansion('pending')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '9999px',
                      padding: '0.25rem',
                      cursor: 'pointer',
                      color: '#92400e',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Toggle pending verification section"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '1.5rem',
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: sectionExpanded.pending ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                </div>
                {sectionExpanded.pending && (
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
                                {u.userType === 'Vendor' 
                                  ? (u.companyName || 'Unknown Vendor')
                                  : (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown User')}
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
                                        padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        backgroundColor: '#FFFFFF',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.75rem center',
                                        backgroundSize: '12px'
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
                )}
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
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
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
                  <button
                    onClick={() => toggleSectionExpansion('all')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '9999px',
                      padding: '0.25rem',
                      cursor: 'pointer',
                      color: '#111827',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Toggle all users section"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '1.5rem',
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: sectionExpanded.all ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                </div>
                {sectionExpanded.all && (
                  filteredVerifiedUsers.length === 0 ? (
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
                                {u.userType === 'Vendor' 
                                  ? (u.companyName || 'Unknown Vendor')
                                  : (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown User')}
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
                                  {(() => {
                                    const userType = u.userType;
                                    const userTypeLower = userType?.toLowerCase();
                                    const isAdmin = userType === 'Admin' || userType === 'admin' || userTypeLower === 'admin';
                                    const isEventOffice = userType === 'Event Office' || userType === 'event office' || 
                                                         userType === 'Event_Office' || userType === 'event_office' ||
                                                         userTypeLower === 'event office';
                                    
                                    if (isAdmin || isEventOffice) {
                                      return (
                          <button
                                          onClick={() => handleDeleteClick(userId)}
                                          disabled={!!deletingIds[userId]}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#dc2626',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: deletingIds[userId] ? 'not-allowed' : 'pointer',
                                            transition: 'background-color 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!deletingIds[userId]) {
                                              e.target.style.backgroundColor = '#b91c1c';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!deletingIds[userId]) {
                                              e.target.style.backgroundColor = '#dc2626';
                                            }
                                          }}
                                        >
                                          {deletingIds[userId] ? 'Deleting...' : 'Delete'}
                          </button>
                                      );
                                    } else {
                                      const isBlocked = !activeStatusById[userId];
                                      return (
                                        <button
                                          onClick={() => handleToggleActive(userId)}
                                          disabled={!!togglingIds[userId]}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: isBlocked ? '#059669' : '#dc2626',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: togglingIds[userId] ? 'not-allowed' : 'pointer',
                                            transition: 'background-color 0.2s, transform 0.1s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            opacity: togglingIds[userId] ? 0.7 : 1
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!togglingIds[userId]) {
                                              e.target.style.backgroundColor = isBlocked ? '#047857' : '#b91c1c';
                                              e.target.style.transform = 'translateY(-1px)';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!togglingIds[userId]) {
                                              e.target.style.backgroundColor = isBlocked ? '#059669' : '#dc2626';
                                              e.target.style.transform = 'translateY(0)';
                                            }
                                          }}
                                        >
                                          {togglingIds[userId] ? (
                                            <>
                                              <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}>
                                                hourglass_empty
                          </span>
                                              Updating...
                                            </>
                                          ) : (
                                            <>
                                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                                {isBlocked ? 'lock_open' : 'block'}
                            </span>
                                              {isBlocked ? 'Unblock' : 'Block'}
                                            </>
                                          )}
                                        </button>
                                      );
                                    }
                                  })()}
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
                                      {u.userType === 'Vendor' && u.companyName && (
                                        <div>
                                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                            Company Name
                                          </h4>
                                          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                            {u.companyName}
                                          </p>
                        </div>
                        )}
                                    </div>
                                    {u.userType === 'Vendor' && (
                                      <div style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e5e7eb'
                                      }}>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                                          Documents
                                        </h4>
                                        <div style={{
                                          display: 'flex',
                                          gap: '1rem',
                                          flexWrap: 'wrap'
                                        }}>
                                          {(u.vendorLogoPath || u.hasLogo) && (
                                            <div style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.5rem',
                                              padding: '0.75rem',
                                              backgroundColor: '#f9fafb',
                                              borderRadius: '0.5rem',
                                              border: '1px solid #e5e7eb'
                                            }}>
                                              <span className="material-symbols-outlined" style={{ 
                                                fontSize: '1.25rem',
                                                color: '#3b82f6'
                                              }}>
                                                image
                                              </span>
                          <span style={{ 
                                                fontSize: '0.875rem',
                                                color: '#111827',
                            fontWeight: '500'
                          }}>
                                                Logo
                          </span>
                                              <button
                                                onClick={() => handleViewDocument(userId, 'logo')}
                                                style={{
                                                  padding: '0.375rem 0.75rem',
                                                  borderRadius: '0.375rem',
                                                  border: '1px solid #3b82f6',
                                                  backgroundColor: 'transparent',
                                                  color: '#3b82f6',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  marginLeft: '0.5rem'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.target.style.backgroundColor = '#eff6ff';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = 'transparent';
                                                }}
                                              >
                                                View
                                              </button>
                                              <button
                                                onClick={() => handleDownloadDocument(userId, 'logo')}
                                                style={{
                                                  padding: '0.375rem 0.75rem',
                                                  borderRadius: '0.375rem',
                                                  border: 'none',
                                                  backgroundColor: '#3b82f6',
                                                  color: '#FFFFFF',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.target.style.backgroundColor = '#2563eb';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = '#3b82f6';
                                                }}
                                              >
                                                Download
                                              </button>
                        </div>
                        )}
                                          {(u.vendorTaxCardPath || u.hasTaxCard) && (
                                            <div style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.5rem',
                                              padding: '0.75rem',
                                              backgroundColor: '#f9fafb',
                                              borderRadius: '0.5rem',
                                              border: '1px solid #e5e7eb'
                                            }}>
                                              <span className="material-symbols-outlined" style={{ 
                                                fontSize: '1.25rem',
                                                color: '#10b981'
                                              }}>
                                                description
                                              </span>
                                              <span style={{
                                                fontSize: '0.875rem',
                                                color: '#111827',
                                                fontWeight: '500'
                                              }}>
                                                Tax Card
                                              </span>
                                              <button
                                                onClick={() => handleViewDocument(userId, 'tax-card')}
                                                style={{
                                                  padding: '0.375rem 0.75rem',
                                                  borderRadius: '0.375rem',
                                                  border: '1px solid #10b981',
                                                  backgroundColor: 'transparent',
                                                  color: '#10b981',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  marginLeft: '0.5rem'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.target.style.backgroundColor = '#ecfdf5';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = 'transparent';
                                                }}
                                              >
                                                View
                                              </button>
                                              <button
                                                onClick={() => handleDownloadDocument(userId, 'tax-card')}
                                                style={{
                                                  padding: '0.375rem 0.75rem',
                                                  borderRadius: '0.375rem',
                                                  border: 'none',
                                                  backgroundColor: '#10b981',
                                                  color: '#FFFFFF',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.target.style.backgroundColor = '#059669';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = '#10b981';
                                                }}
                                              >
                                                Download
                                              </button>
                                            </div>
                                          )}
                                          {!(u.vendorLogoPath || u.hasLogo) && !(u.vendorTaxCardPath || u.hasTaxCard) && (
                                            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
                                              No documents uploaded
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
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
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Create Account Modal */}
      {showCreateModal && (
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
            setShowCreateModal(false);
            setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
            setFormErrors({});
            setCreateMessage('');
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Create New Admin/Event Office Account
              </h4>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
                  setFormErrors({});
                  setCreateMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  borderRadius: '0.375rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#111827';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

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
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formErrors.firstName ? '#ef4444' : '#e5e7eb';
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
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formErrors.lastName ? '#ef4444' : '#e5e7eb';
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
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = formErrors.email ? '#ef4444' : '#e5e7eb';
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
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formErrors.password ? '#ef4444' : '#e5e7eb';
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
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      border: `1px solid ${formErrors.role ? '#ef4444' : '#e5e7eb'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '12px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1D3557';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formErrors.role ? '#ef4444' : '#e5e7eb';
                    }}
                    disabled={isCreating}
                  >
                    {roleOptionsForCreate.map(role => (
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
                    setShowCreateModal(false);
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
                  Cancel
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
        </div>
      )}

      {documentPreview.visible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={closeDocumentPreview}
        >
          <div
            style={{
              width: '65%',
              maxWidth: '720px',
              backgroundColor: '#fff',
              borderRadius: '0.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{documentPreview.title}</h3>
              <button
                onClick={closeDocumentPreview}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#6b7280'
                }}
                aria-label="Close document preview"
              >
                ×
              </button>
            </div>
            <div style={{
              padding: '1rem',
              minHeight: '50vh',
              maxHeight: '75vh',
              backgroundColor: '#f9fafb'
            }}>
              {documentPreview.type === 'pdf' ? (
                <iframe
                  src={documentPreview.url}
                  title={documentPreview.title}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fff'
                  }}
                />
              ) : (
                <img
                  src={documentPreview.url}
                  alt={documentPreview.title}
                  style={{
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fff'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
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
            setDeleteConfirm({ show: false, userId: null });
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '400px',
            padding: '2rem'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
              marginBottom: '1rem'
            }}>
              Delete Account
            </h4>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0,
              marginBottom: '1.5rem'
            }}>
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, userId: null })}
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
                disabled={!!deletingIds[deleteConfirm.userId]}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingIds[deleteConfirm.userId]}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: deletingIds[deleteConfirm.userId] ? '#9ca3af' : '#dc2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: deletingIds[deleteConfirm.userId] ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!deletingIds[deleteConfirm.userId]) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deletingIds[deleteConfirm.userId]) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {deletingIds[deleteConfirm.userId] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
