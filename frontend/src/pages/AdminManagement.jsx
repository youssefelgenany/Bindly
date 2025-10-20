import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';

const AdminManagement = () => {
  const { user } = useAuth();
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

  // Activation state management
  const [activatingIds, setActivatingIds] = useState({}); // id -> boolean
  const [activationMessages, setActivationMessages] = useState({}); // id -> message

  // Password confirmation modal state (used for activation and verification)
  const [passwordConfirm, setPasswordConfirm] = useState({
    show: false,
    mode: 'activation', // 'activation' | 'verification'
    accountId: null,
    currentStatus: '', // 'active' | 'blocked'
    currentVerified: false,
    value: '',
    error: '',
    submitting: false
  });

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

    console.log('🔍 handleCreateAccount called');
    console.log('🔍 Current user:', user);
    console.log('🔍 User type:', user?.userType);
    console.log('🔍 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
    console.log('🔍 Form data:', formData);

    setIsCreating(true);
    setCreateMessage('');

    try {
      console.log('🔍 Calling createAdminAccount API...');
      const result = await adminApiService.createAdminAccount({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      console.log('🔍 API result:', result);
      
      if (result.success) {
        console.log('✅ Account creation successful');
        setCreateMessage('Account created successfully!');
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
        // Reload admin accounts to show the new one
        await loadAdminAccounts();
      } else {
        console.log('❌ Account creation failed:', result.message);
        setCreateMessage(result.message || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.log('❌ Account creation error:', error);
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
        console.error('Delete failed:', result.message);
        // You could show an error message to the user here
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, account: null });
  };

  const openActivationPasswordModal = (accountId, currentStatus) => {
    setPasswordConfirm({
      show: true,
      mode: 'activation',
      accountId,
      currentStatus,
      currentVerified: false,
      value: '',
      error: '',
      submitting: false
    });
  };

  const closeActivationPasswordModal = () => {
    setPasswordConfirm(prev => ({ ...prev, show: false, value: '', error: '', submitting: false }));
  };

  const openVerificationPasswordModal = (accountId, currentVerified) => {
    setPasswordConfirm({
      show: true,
      mode: 'verification',
      accountId,
      currentStatus: '',
      currentVerified,
      value: '',
      error: '',
      submitting: false
    });
  };

  const submitPasswordConfirm = async () => {
    const { mode, accountId, currentStatus, currentVerified, value } = passwordConfirm;
    if (!value) {
      setPasswordConfirm(prev => ({ ...prev, error: 'Password is required' }));
      return;
    }
    setPasswordConfirm(prev => ({ ...prev, submitting: true, error: '' }));
    setActivatingIds(prev => ({ ...prev, [accountId]: true }));
    setActivationMessages(prev => ({ ...prev, [accountId]: '' }));

    try {
      if (mode === 'activation') {
        const newStatus = currentStatus === 'active' ? false : true; // isActive parameter
        const result = await adminApiService.updateUserStatus(accountId, newStatus, value);
        if (result.success) {
          setActivationMessages(prev => ({ ...prev, [accountId]: 'Status updated successfully' }));
          setAdminAccounts(prev => prev.map(acc =>
            (acc._id || acc.id) === accountId
              ? { ...acc, status: newStatus ? 'active' : 'blocked' }
              : acc
          ));
          closeActivationPasswordModal();
        } else {
          setPasswordConfirm(prev => ({ ...prev, error: result.message || 'Invalid password' }));
        }
      } else {
        // verification
        const newVerified = !currentVerified;
        const result = await adminApiService.updateUserVerification(accountId, newVerified, value);
        if (result.success) {
          setActivationMessages(prev => ({ ...prev, [accountId]: 'Verification updated successfully' }));
          setAdminAccounts(prev => prev.map(acc =>
            (acc._id || acc.id) === accountId
              ? { ...acc, isVerified: newVerified }
              : acc
          ));
          closeActivationPasswordModal();
        } else {
          setPasswordConfirm(prev => ({ ...prev, error: result.message || 'Invalid password' }));
        }
      }
    } catch (error) {
      setPasswordConfirm(prev => ({ ...prev, error: 'Failed to update status' }));
    } finally {
      setActivatingIds(prev => ({ ...prev, [accountId]: false }));
      setPasswordConfirm(prev => ({ ...prev, submitting: false }));
    }
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

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Admin Management</h1>
              <p className="card-subtitle">Loading...</p>
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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Admin Management</h1>
            <p className="card-subtitle">Create and manage admin accounts</p>
          </div>

          <div style={{ padding: '1rem' }}>
            {error && (
              <div className="alert alert-error">
                {error}
                <button 
                  onClick={loadAdminAccounts}
                  className="btn btn-outline"
                  style={{ marginLeft: '1rem', padding: '4px 8px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <button
                className={activeTab === 'create' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setActiveTab('create')}
              >
                Create New Account
              </button>
              <button
                className={activeTab === 'view' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setActiveTab('view')}
              >
                View All Accounts
              </button>
            </div>

            {/* Create Account Form */}
            {activeTab === 'create' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    Create New Admin/Event Office Account
                  </h3>
                  
                  {createMessage && (
                    <div className={`alert ${createMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {createMessage}
                    </div>
                  )}

                  <form onSubmit={handleCreateAccount}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label htmlFor="firstName" className="form-label">First Name</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleFormChange}
                          className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                          placeholder="First name"
                          disabled={isCreating}
                        />
                        {formErrors.firstName && <div className="form-error">{formErrors.firstName}</div>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="lastName" className="form-label">Last Name</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleFormChange}
                          className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                          placeholder="Last name"
                          disabled={isCreating}
                        />
                        {formErrors.lastName && <div className="form-error">{formErrors.lastName}</div>}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        className={`form-input ${formErrors.email ? 'error' : ''}`}
                        placeholder="admin@guc.edu.eg"
                        disabled={isCreating}
                      />
                      {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleFormChange}
                          className={`form-input ${formErrors.password ? 'error' : ''}`}
                          placeholder="Password"
                          disabled={isCreating}
                        />
                        {formErrors.password && <div className="form-error">{formErrors.password}</div>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="role" className="form-label">Role</label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleFormChange}
                          className={`form-input ${formErrors.role ? 'error' : ''}`}
                          disabled={isCreating}
                        >
                          {roleOptions.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        {formErrors.role && <div className="form-error">{formErrors.role}</div>}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isCreating}
                      style={{ width: '100%' }}
                    >
                      {isCreating ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: '8px' }}>Creating Account...</span>
                        </>
                      ) : 'Create Account'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* View All Accounts */}
            {activeTab === 'view' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    All Admin/Event Office Accounts
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {adminAccounts.length === 0 ? (
                      <div className="card" style={{ backgroundColor: 'var(--white)' }}>
                        <div style={{ padding: '1rem', color: 'var(--text-light)' }}>
                          No admin accounts found.
                        </div>
                      </div>
                    ) : (
                      adminAccounts.map((account) => {
                        const accountId = account._id || account.id;
                        return (
                          <div key={accountId} className="card" style={{ backgroundColor: 'var(--white)' }}>
                            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                                  {account.firstName} {account.lastName}
                                </div>
                                <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                                  {account.email}
                                </div>
                                <div style={{ 
                                  fontSize: '12px',
                                  color: 'var(--text-light)'
                                }}>
                                  Role: {formatUserType(account.userType)} • Created: {new Date(account.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: (account.userType === 'Admin' || account.userType === 'event_office') ? 'var(--success-green)' : (account.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)')
                                }}>
                                  {(account.userType === 'Admin' || account.userType === 'event_office') ? 'Verified (Auto)' : (account.isVerified ? 'Verified' : 'Pending')}
                                </span>
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: (account.userType === 'Admin' || account.userType === 'event_office') ? 'var(--success-green)' : (account.status === 'active' ? 'var(--success-green)' : 'var(--guc-red)')
                                }}>
                                  {(account.userType === 'Admin' || account.userType === 'event_office') ? 'Active (Auto)' : (account.status === 'active' ? 'Active' : 'Blocked')}
                                </span>
                                
                                {/* Activation/Deactivation Button - Hidden for Admin and Event Office accounts */}
                                {account.userType !== 'Admin' && account.userType !== 'event_office' && (
                                  <button
                                    className={account.status === 'active' ? 'btn btn-outline' : 'btn btn-primary'}
                                    onClick={() => openActivationPasswordModal(accountId, account.status)}
                                    disabled={activatingIds[accountId]}
                                    style={{ 
                                      padding: '4px 8px', 
                                      fontSize: '12px',
                                      backgroundColor: account.status === 'active' ? 'var(--guc-red)' : 'var(--success-green)',
                                      color: 'white',
                                      border: 'none'
                                    }}
                                    title={
                                      account.status === 'active' 
                                        ? 'Deactivate Account' 
                                        : 'Activate Account'
                                    }
                                  >
                                    {activatingIds[accountId] 
                                      ? 'Updating...' 
                                      : account.status === 'active' 
                                        ? 'Deactivate' 
                                        : 'Activate'
                                    }
                                  </button>
                                )}

                                {/* Verify/Unverify Button - Hidden for Admin and Event Office accounts */}
                                {account.userType !== 'Admin' && account.userType !== 'event_office' && (
                                  <button
                                    className={account.isVerified ? 'btn btn-outline' : 'btn btn-primary'}
                                    onClick={() => openVerificationPasswordModal(accountId, !!account.isVerified)}
                                    disabled={activatingIds[accountId]}
                                    style={{ 
                                      padding: '4px 8px', 
                                      fontSize: '12px',
                                      backgroundColor: account.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)',
                                      color: 'white',
                                      border: 'none'
                                    }}
                                    title={account.isVerified ? 'Unverify Account' : 'Verify Account'}
                                  >
                                    {account.isVerified ? 'Unverify' : 'Verify'}
                                  </button>
                                )}
                                
                                <button
                                  className="btn btn-outline"
                                  onClick={() => handleDeleteClick(account)}
                                  style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--guc-red)' }}
                                  title="Delete Account"
                                >
                                  🗑️
                                </button>
                                
                                {/* Status Message */}
                                {activationMessages[accountId] && (
                                  <span style={{ 
                                    fontSize: '10px', 
                                    color: activationMessages[accountId].includes('success') ? 'var(--success-green)' : 'var(--guc-red)',
                                    marginLeft: '0.5rem'
                                  }}>
                                    {activationMessages[accountId]}
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
            )}
          </div>
        </div>
      </div>

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
              backgroundColor: 'var(--white)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--medium-gray)' }}>
              <h3 style={{ color: 'var(--guc-red)', margin: 0 }}>Confirm Deletion</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                Are you sure you want to delete the account for <strong>{deleteConfirm.account.firstName} {deleteConfirm.account.lastName}</strong>?
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '1rem' }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={{ backgroundColor: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Password Modal (Activation / Verification) */}
      {passwordConfirm.show && (
        <>
          <div
            onClick={closeActivationPasswordModal}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
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
              backgroundColor: 'var(--white)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--medium-gray)' }}>
              <h3 style={{ color: 'var(--guc-red)', margin: 0 }}>
                {passwordConfirm.mode === 'activation' ? 'Password Required' : 'Password Required (Verification)'}
              </h3>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                Enter your admin password to confirm this action.
              </div>
              <input
                type="password"
                value={passwordConfirm.value}
                onChange={(e) => setPasswordConfirm(prev => ({ ...prev, value: e.target.value, error: '' }))}
                className="form-input"
                placeholder="Enter password"
                disabled={passwordConfirm.submitting}
              />
              {passwordConfirm.error && (
                <div className="form-error" style={{ color: 'var(--guc-red)', fontSize: '12px' }}>
                  {passwordConfirm.error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={closeActivationPasswordModal} disabled={passwordConfirm.submitting}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitPasswordConfirm}
                  disabled={passwordConfirm.submitting}
                  style={{ backgroundColor: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                >
                  {passwordConfirm.submitting ? 'Confirming...' : 'Confirm'}
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
