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
    if (!q) return users;

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

  const roleOptions = [
    'Student',
    'Staff',
    'TA',
    'Professor',
    'Vendor',
    'Event Office',
    'Admin'
  ];

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApiService.getAllUsers();
      if (result.success) {
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
      const result = await adminApiService.updateUserRole(userId, selectedRole);
      if (result.success) {
        setMessageById(prev => ({ ...prev, [userId]: 'Role updated successfully.' }));
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

  // Update activeStatusById when users are loaded
  useEffect(() => {
    const initial = {};
    users.forEach(u => { 
      initial[u._id || u.id] = u.status === 'active'; 
    });
    setActiveStatusById(initial);
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

  // Vendor-related controls removed per request

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.userType === 'Admin')) {
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

                        {/* Role controls */}
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
                            {updatingIds[userId] ? 'Updating...' : 'Update Role'}
                          </button>

                          {messageById[userId] && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: messageById[userId].includes('success') ? 'var(--success-green)' : 'var(--guc-red)' }}>
                              {messageById[userId]}
                            </span>
                          )}
                        </div>

                        {/* Activation controls */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className={activeStatusById[userId] ? 'btn btn-outline' : 'btn btn-primary'}
                            onClick={() => handleToggleActive(userId)}
                            disabled={!!togglingIds[userId]}
                          >
                            {togglingIds[userId]
                              ? 'Updating...'
                              : activeStatusById[userId]
                                ? 'Deactivate User'
                                : 'Activate User'}
                          </button>
                          <span style={{ fontSize: '12px', color: activeStatusById[userId] ? 'var(--success-green)' : 'var(--guc-red)' }}>
                            {activeStatusById[userId] ? 'Active' : 'Disabled'}
                          </span>
                          {toggleMsgById[userId] && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: 'var(--text-light)' }}>
                              {toggleMsgById[userId]}
                            </span>
                          )}
                        </div>
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


