import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';

const AdminUsers = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | gucId
  const [pendingRoles, setPendingRoles] = useState({}); // id -> role
  const [updatingIds, setUpdatingIds] = useState({}); // id -> boolean
  const [messageById, setMessageById] = useState({}); // id -> message

  // Users state - will be loaded from API
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users; // users are already filtered to exclude Admin/Event Office

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

    return users.filter(match);
  }, [searchQuery, searchField, users]);

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
      const result = await adminApiService.updateUserRole(userId, selectedRole);
      if (result.success) {
        setMessageById(prev => ({ ...prev, [userId]: 'Role updated and verification email sent successfully.' }));
        // Update the user in the local state
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, userType: selectedRole } : u
        ));
        // Clear the pending role
        setPendingRoles(prev => ({ ...prev, [userId]: '' }));
      } else {
        setMessageById(prev => ({ ...prev, [userId]: result.message || 'Failed to update role.' }));
      }
    } catch (err) {
      setMessageById(prev => ({ ...prev, [userId]: 'Failed to update role. Try again.' }));
    } finally {
      setUpdatingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const [activeStatusById, setActiveStatusById] = useState({});
  const [togglingIds, setTogglingIds] = useState({}); // id -> boolean
  const [toggleMsgById, setToggleMsgById] = useState({}); // id -> message

  // Verification controls
  const [verificationStatusById, setVerificationStatusById] = useState({});
  const [verifyingIds, setVerifyingIds] = useState({}); // id -> boolean
  const [verifyMsgById, setVerifyMsgById] = useState({}); // id -> message
  
  // Verification email state
  const [sendingEmailIds, setSendingEmailIds] = useState({}); // id -> boolean
  const [emailMsgById, setEmailMsgById] = useState({}); // id -> message

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

  // Vendor-related controls removed per request

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

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Users</h1>
              <p className="card-subtitle">Loading users...</p>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Users</h1>
            <p className="card-subtitle">Manage platform users</p>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            {error && (
              <div className="alert alert-error">
                {error}
                <button 
                  onClick={loadUsers}
                  className="btn btn-outline"
                  style={{ marginLeft: '1rem', padding: '4px 8px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Search Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name, email, or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '260px' }}
              />
              <select
                className="form-input"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">All fields</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="gucId">GUC ID / Record ID</option>
              </select>
            </div>

            {/* Users List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredUsers.length === 0 ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--text-light)' }}>
                    {users.length === 0 ? 'No users found.' : 'No users match your search.'}
                  </div>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const userId = u._id || u.id;
                  return (
                    <div key={userId} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                              {(u.firstName || '') + ' ' + (u.lastName || '')}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{u.email}</div>
                            <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                              {(u.gucId && `GUC ID: ${u.gucId}`) || `ID: ${userId}`}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '500',
                              color: u.userType === 'Admin' ? 'var(--guc-red)' : 
                                     u.userType === 'Professor' ? 'var(--primary-blue)' :
                                     u.userType === 'Student' ? 'var(--success-green)' :
                                     u.userType === 'Vendor' ? 'var(--warning-yellow)' :
                                     'var(--text-light)'
                            }}>
                              Role: {u.userType || 'Unknown'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: u.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)' }}>
                              {u.isVerified ? 'Verified' : 'Pending'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>

                        {/* Role controls (hidden for Students and Vendors) */}
                        {!(u.userType === 'Student' || u.userType === 'Vendor') && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            className="form-input"
                            value={pendingRoles[userId] ?? ''}
                            onChange={(e) => handleRoleChange(userId, e.target.value)}
                            style={{ minWidth: '180px' }}
                          >
                            <option value="" disabled>
                              Select role
                            </option>
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleUpdateRole(userId)}
                            disabled={!!updatingIds[userId]}
                          >
                            {updatingIds[userId] ? 'Assigning...' : 'Assign Role'}
                          </button>

                          {messageById[userId] && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: messageById[userId].includes('success') ? 'var(--success-green)' : 'var(--guc-red)' }}>
                              {messageById[userId]}
                            </span>
                          )}
                        </div>
                        )}

                        {/* Verification controls (only for unverified TA/Staff/Professor) */}
                        {(['TA', 'Staff', 'Professor'].includes(u.userType)) && !verificationStatusById[userId] && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleToggleVerification(userId)}
                            disabled={!!verifyingIds[userId]}
                            style={{ backgroundColor: 'var(--warning-yellow)', color: 'white' }}
                          >
                            {verifyingIds[userId] ? 'Sending Email...' : 'Send Verification Email'}
                          </button>
                          <span style={{ fontSize: '12px', color: 'var(--warning-yellow)' }}>
                            Pending Email Verification
                          </span>
                          {verifyMsgById[userId] && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: 'var(--text-light)' }}>
                              {verifyMsgById[userId]}
                            </span>
                          )}
                        </div>
                        )}

                        {/* Verification status display (only for verified TA/Staff/Professor) */}
                        {(['TA', 'Staff', 'Professor'].includes(u.userType)) && verificationStatusById[userId] && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ 
                            fontSize: '12px', 
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--success-green)', 
                            color: 'white',
                            fontWeight: '500'
                          }}>
                            ✅ Verified
                          </span>
                        </div>
                        )}


                        {/* Activation controls removed as requested */}

                        {/* Verification email controls removed as requested */}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;


