import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

  // Admin accounts data
  const [adminAccounts, setAdminAccounts] = useState([
    {
      id: 'admin-001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@guc.edu.eg',
      role: 'Admin',
      createdAt: '2024-01-01T00:00:00Z',
      isActive: true
    },
    {
      id: 'admin-002',
      firstName: 'Event',
      lastName: 'Manager',
      email: 'events@guc.edu.eg',
      role: 'Event Office',
      createdAt: '2024-02-15T10:30:00Z',
      isActive: true
    },
    {
      id: 'admin-003',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@guc.edu.eg',
      role: 'Event Office',
      createdAt: '2024-03-20T14:45:00Z',
      isActive: false
    }
  ]);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, account: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const roleOptions = ['Admin', 'Event Office'];

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
      // TODO: Replace with backend call
      // Example: await axios.post('/api/admin/create-account', formData);
      await new Promise(res => setTimeout(res, 1000));
      
      // Add to local state for demo
      const newAccount = {
        id: `admin-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      setAdminAccounts(prev => [...prev, newAccount]);
      
      setCreateMessage('Account created successfully!');
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Admin' });
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
      // TODO: Replace with backend call
      // Example: await axios.delete(`/api/admin/accounts/${deleteConfirm.account.id}`);
      await new Promise(res => setTimeout(res, 500));
      
      setAdminAccounts(prev => prev.filter(acc => acc.id !== deleteConfirm.account.id));
      setDeleteConfirm({ show: false, account: null });
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, account: null });
  };

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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Admin Management</h1>
            <p className="card-subtitle">Create and manage admin accounts</p>
          </div>

          <div style={{ padding: '1rem' }}>
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
                    {adminAccounts.map((account) => (
                      <div key={account.id} className="card" style={{ backgroundColor: 'var(--white)' }}>
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'grid', gap: '0.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                              {account.firstName} {account.lastName}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                              {account.email}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                              Role: {account.role} • Created: {new Date(account.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              fontSize: '12px', 
                              color: account.isActive ? 'var(--success-green)' : 'var(--guc-red)' 
                            }}>
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleDeleteClick(account)}
                              style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--guc-red)' }}
                              title="Delete Account"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
    </div>
  );
};

export default AdminManagement;
