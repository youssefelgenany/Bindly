import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'password', 'settings'

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    eventCategories: ['Academic', 'Social', 'Sports', 'Cultural', 'Career', 'Technology'],
    eventTypes: ['Workshop', 'Conference', 'Seminar', 'Competition', 'Exhibition', 'Performance'],
    maxEventAttendees: 500,
    eventApprovalRequired: true,
    vendorApprovalRequired: true,
    systemMaintenanceMode: false
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileData.firstName.trim()) errors.firstName = 'First name is required';
    if (!profileData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!profileData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profileData.email)) errors.email = 'Email is invalid';

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) errors.newPassword = 'New password is required';
    else if (passwordData.newPassword.length < 6) errors.newPassword = 'Password must be at least 6 characters';
    if (!passwordData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setIsUpdatingProfile(true);
    setProfileMessage('');

    try {
      // TODO: Replace with backend call
      // Example: await axios.put('/api/admin/profile', profileData);
      await new Promise(res => setTimeout(res, 1000));
      setProfileMessage('Profile updated successfully!');
    } catch (error) {
      setProfileMessage('Failed to update profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    setPasswordMessage('');

    try {
      // TODO: Replace with backend call
      // Example: await axios.put('/api/admin/change-password', passwordData);
      await new Promise(res => setTimeout(res, 1000));
      setPasswordMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage('Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    setSettingsMessage('');

    try {
      // TODO: Replace with backend call
      // Example: await axios.put('/api/admin/system-settings', systemSettings);
      await new Promise(res => setTimeout(res, 1000));
      setSettingsMessage('System settings updated successfully!');
    } catch (error) {
      setSettingsMessage('Failed to update settings. Please try again.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Profile & System Settings</h1>
            <p className="card-subtitle">Manage your profile and system configuration</p>
          </div>

          <div style={{ padding: '1rem' }}>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <button
                className={activeTab === 'profile' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setActiveTab('profile')}
              >
                Edit Profile
              </button>
              <button
                className={activeTab === 'password' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setActiveTab('password')}
              >
                Change Password
              </button>
              <button
                className={activeTab === 'settings' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setActiveTab('settings')}
              >
                System Settings
              </button>
            </div>

            {/* Edit Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    Edit Admin Profile
                  </h3>
                  
                  {profileMessage && (
                    <div className={`alert ${profileMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {profileMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label htmlFor="firstName" className="form-label">First Name</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                          className={`form-input ${profileErrors.firstName ? 'error' : ''}`}
                          placeholder="First name"
                          disabled={isUpdatingProfile}
                        />
                        {profileErrors.firstName && <div className="form-error">{profileErrors.firstName}</div>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="lastName" className="form-label">Last Name</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                          className={`form-input ${profileErrors.lastName ? 'error' : ''}`}
                          placeholder="Last name"
                          disabled={isUpdatingProfile}
                        />
                        {profileErrors.lastName && <div className="form-error">{profileErrors.lastName}</div>}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        className={`form-input ${profileErrors.email ? 'error' : ''}`}
                        placeholder="admin@guc.edu.eg"
                        disabled={isUpdatingProfile}
                      />
                      {profileErrors.email && <div className="form-error">{profileErrors.email}</div>}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdatingProfile}
                      style={{ width: '100%' }}
                    >
                      {isUpdatingProfile ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: '8px' }}>Updating Profile...</span>
                        </>
                      ) : 'Update Profile'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    Change Password
                  </h3>
                  
                  {passwordMessage && (
                    <div className={`alert ${passwordMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {passwordMessage}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="currentPassword" className="form-label">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                        placeholder="Enter current password"
                        disabled={isChangingPassword}
                      />
                      {passwordErrors.currentPassword && <div className="form-error">{passwordErrors.currentPassword}</div>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                          placeholder="Enter new password"
                          disabled={isChangingPassword}
                        />
                        {passwordErrors.newPassword && <div className="form-error">{passwordErrors.newPassword}</div>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                          placeholder="Confirm new password"
                          disabled={isChangingPassword}
                        />
                        {passwordErrors.confirmPassword && <div className="form-error">{passwordErrors.confirmPassword}</div>}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isChangingPassword}
                      style={{ width: '100%' }}
                    >
                      {isChangingPassword ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: '8px' }}>Changing Password...</span>
                        </>
                      ) : 'Change Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'settings' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    System Settings
                  </h3>
                  
                  {settingsMessage && (
                    <div className={`alert ${settingsMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {settingsMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateSettings}>
                    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Event Categories</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {systemSettings.eventCategories.map((category, index) => (
                            <span key={index} style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--medium-gray)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {category}
                            </span>
                          ))}
                        </div>
                        <small style={{ color: 'var(--text-light)' }}>
                          Event categories are managed by the system administrator
                        </small>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Event Types</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {systemSettings.eventTypes.map((type, index) => (
                            <span key={index} style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--medium-gray)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {type}
                            </span>
                          ))}
                        </div>
                        <small style={{ color: 'var(--text-light)' }}>
                          Event types are managed by the system administrator
                        </small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="maxEventAttendees" className="form-label">Maximum Event Attendees</label>
                        <input
                          type="number"
                          id="maxEventAttendees"
                          name="maxEventAttendees"
                          value={systemSettings.maxEventAttendees}
                          onChange={handleSettingsChange}
                          className="form-input"
                          min="1"
                          max="10000"
                          disabled={isUpdatingSettings}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              name="eventApprovalRequired"
                              checked={systemSettings.eventApprovalRequired}
                              onChange={handleSettingsChange}
                              disabled={isUpdatingSettings}
                            />
                            Event Approval Required
                          </label>
                          <small style={{ color: 'var(--text-light)' }}>
                            All events require admin approval before going live
                          </small>
                        </div>

                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              name="vendorApprovalRequired"
                              checked={systemSettings.vendorApprovalRequired}
                              onChange={handleSettingsChange}
                              disabled={isUpdatingSettings}
                            />
                            Vendor Approval Required
                          </label>
                          <small style={{ color: 'var(--text-light)' }}>
                            All vendors require admin approval before activation
                          </small>
                        </div>
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            name="systemMaintenanceMode"
                            checked={systemSettings.systemMaintenanceMode}
                            onChange={handleSettingsChange}
                            disabled={isUpdatingSettings}
                          />
                          System Maintenance Mode
                        </label>
                        <small style={{ color: 'var(--text-light)' }}>
                          Enable maintenance mode to restrict user access
                        </small>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdatingSettings}
                      style={{ width: '100%' }}
                    >
                      {isUpdatingSettings ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: '8px' }}>Updating Settings...</span>
                        </>
                      ) : 'Update System Settings'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Logout Section */}
            <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--medium-gray)' }}>
              <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                Account Actions
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleLogout}
                  style={{ color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                >
                  Logout
                </button>
                <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                  Sign out of your admin account
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
