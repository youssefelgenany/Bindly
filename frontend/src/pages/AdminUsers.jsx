import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AdminUsers = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | gucId
  const [pendingRoles, setPendingRoles] = useState({}); // id -> role
  const [updatingIds, setUpdatingIds] = useState({}); // id -> boolean
  const [messageById, setMessageById] = useState({}); // id -> message

  // Placeholder data until backend is wired
  const users = [
    {
      id: '64fa-1001',
      firstName: 'Sara',
      lastName: 'Kamal',
      email: 'sara.kamal@student.guc.edu.eg',
      userType: 'Student',
      gucId: '34-1234',
      isVerified: true,
      isActive: true,
      createdAt: '2024-09-10T10:00:00Z'
    },
    {
      id: '64fa-1002',
      firstName: 'Omar',
      lastName: 'Hassan',
      email: 'omar.hassan@guc.edu.eg',
      userType: 'Staff',
      gucId: '12-5678',
      isVerified: false,
      isActive: false,
      createdAt: '2024-09-11T08:20:00Z'
    },
    {
      id: '64fa-1003',
      firstName: 'Mona',
      lastName: 'Adel',
      email: 'mona.adel@company.com',
      userType: 'Vendor',
      companyName: 'Adel Foods',
      isVerified: true,
      isActive: true,
      createdAt: '2024-09-12T12:45:00Z'
    }
  ];

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
      // TODO: Replace with backend call
      // Example: await axios.put(`/api/admin/users/${userId}/role`, { role: selectedRole });
      await new Promise(res => setTimeout(res, 600));
      setMessageById(prev => ({ ...prev, [userId]: 'Role updated successfully.' }));
    } catch (err) {
      setMessageById(prev => ({ ...prev, [userId]: 'Failed to update role. Try again.' }));
    } finally {
      setUpdatingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const [activeStatusById, setActiveStatusById] = useState(() => {
    const initial = {};
    users.forEach(u => { initial[u.id || u._id] = !!u.isActive; });
    return initial;
  });

  const [togglingIds, setTogglingIds] = useState({}); // id -> boolean
  const [toggleMsgById, setToggleMsgById] = useState({}); // id -> message

  const handleToggleActive = async (userId) => {
    setTogglingIds(prev => ({ ...prev, [userId]: true }));
    setToggleMsgById(prev => ({ ...prev, [userId]: '' }));
    try {
      // TODO: replace with backend call
      // Example: await axios.patch(`/api/admin/users/${userId}/status`, { isActive: !activeStatusById[userId] });
      await new Promise(res => setTimeout(res, 500));
      setActiveStatusById(prev => ({ ...prev, [userId]: !prev[userId] }));
      setToggleMsgById(prev => ({ ...prev, [userId]: 'Status updated.' }));
    } catch (e) {
      setToggleMsgById(prev => ({ ...prev, [userId]: 'Failed to update status.' }));
    } finally {
      setTogglingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Vendor-related controls removed per request

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.role === 'admin' || user?.userType === 'Admin')) {
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
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Users</h1>
            <p className="card-subtitle">Manage platform users</p>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
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
                    No users match your search.
                  </div>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id || u._id} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                    <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                            {(u.firstName || '') + ' ' + (u.lastName || '')}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{u.email}</div>
                          <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                            {(u.gucId && `GUC ID: ${u.gucId}`) || (u.id && `ID: ${u.id}`) || (u._id && `ID: ${u._id}`)}
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
                          value={pendingRoles[u.id || u._id] ?? ''}
                          onChange={(e) => handleRoleChange(u.id || u._id, e.target.value)}
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
                          onClick={() => handleUpdateRole(u.id || u._id)}
                          disabled={!!updatingIds[u.id || u._id]}
                        >
                          {updatingIds[u.id || u._id] ? 'Updating...' : 'Update Role'}
                        </button>

                        {messageById[u.id || u._id] && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: messageById[u.id || u._id].includes('success') ? 'var(--success-green)' : 'var(--guc-red)' }}>
                            {messageById[u.id || u._id]}
                          </span>
                        )}
                      </div>

                      {/* Activation controls */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className={activeStatusById[u.id || u._id] ? 'btn btn-outline' : 'btn btn-primary'}
                          onClick={() => handleToggleActive(u.id || u._id)}
                          disabled={!!togglingIds[u.id || u._id]}
                        >
                          {togglingIds[u.id || u._id]
                            ? 'Updating...'
                            : activeStatusById[u.id || u._id]
                              ? 'Deactivate User'
                              : 'Activate User'}
                        </button>
                        <span style={{ fontSize: '12px', color: activeStatusById[u.id || u._id] ? 'var(--success-green)' : 'var(--guc-red)' }}>
                          {activeStatusById[u.id || u._id] ? 'Active' : 'Disabled'}
                        </span>
                        {toggleMsgById[u.id || u._id] && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: 'var(--text-light)' }}>
                            {toggleMsgById[u.id || u._id]}
                          </span>
                        )}
                      </div>

                      {/* Vendor-specific actions removed */}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Vendor modal and approval removed */}
    </div>
  );
};

export default AdminUsers;


