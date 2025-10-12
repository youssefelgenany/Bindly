import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfessorProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    department: user?.department || '',
    gucId: user?.gucId || '',
    avatarFile: null,
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleProfileChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'avatarFile') {
      setProfileData(prev => ({ ...prev, avatarFile: files?.[0] || null }));
      return;
    }
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors(prev => ({ ...prev, [name]: '' }));
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setIsUpdatingProfile(true);
    setProfileMessage('');
    try {
      // TODO: call backend to update profile and upload avatar
      await new Promise(res => setTimeout(res, 800));
      setProfileMessage('Profile updated successfully!');
    } catch (err) {
      setProfileMessage('Failed to update profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) errors.newPassword = 'New password is required';
    else if (passwordData.newPassword.length < 6) errors.newPassword = 'At least 6 characters';
    if (!passwordData.confirmPassword) errors.confirmPassword = 'Please confirm password';
    else if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setIsChangingPassword(true);
    setPasswordMessage('');
    try {
      // TODO: call backend to change password
      await new Promise(res => setTimeout(res, 800));
      setPasswordMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage('Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Only professors should use this page (UI guard)
  if (user?.userType !== 'Professor') {
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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Profile & Account Settings</h1>
            <p className="card-subtitle">Manage your profile information and account security</p>
          </div>

          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <button className={activeTab === 'profile' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setActiveTab('profile')}>Profile</button>
              <button className={activeTab === 'password' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setActiveTab('password')}>Change Password</button>
            </div>

            {activeTab === 'profile' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>Your Profile</h3>

                  {profileMessage && (
                    <div className={`alert ${profileMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {profileMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input className={`form-input ${profileErrors.firstName ? 'error' : ''}`} name="firstName" type="text" value={profileData.firstName} onChange={handleProfileChange} placeholder="First name" disabled={isUpdatingProfile} />
                        {profileErrors.firstName && <div className="form-error">{profileErrors.firstName}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input className={`form-input ${profileErrors.lastName ? 'error' : ''}`} name="lastName" type="text" value={profileData.lastName} onChange={handleProfileChange} placeholder="Last name" disabled={isUpdatingProfile} />
                        {profileErrors.lastName && <div className="form-error">{profileErrors.lastName}</div>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className={`form-input ${profileErrors.email ? 'error' : ''}`} name="email" type="email" value={profileData.email} onChange={handleProfileChange} placeholder="prof@guc.edu" disabled={isUpdatingProfile} />
                        {profileErrors.email && <div className="form-error">{profileErrors.email}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Department</label>
                        <input className="form-input" name="department" type="text" value={profileData.department} onChange={handleProfileChange} placeholder="e.g., Computer Science" disabled={isUpdatingProfile} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">GUC ID</label>
                        <input className="form-input" name="gucId" type="text" value={profileData.gucId} onChange={handleProfileChange} placeholder="e.g., 00-0000" disabled={isUpdatingProfile} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Profile Picture</label>
                        <input className="form-input" name="avatarFile" type="file" onChange={handleProfileChange} disabled={isUpdatingProfile} />
                        {profileData.avatarFile && (
                          <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: '0.25rem' }}>Selected: {profileData.avatarFile.name}</div>
                        )}
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile} style={{ width: '100%' }}>
                      {isUpdatingProfile ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: 8 }}>Updating...</span>
                        </>
                      ) : 'Update Profile'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>Change Password</h3>

                  {passwordMessage && (
                    <div className={`alert ${passwordMessage.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                      {passwordMessage}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Current Password</label>
                      <input className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`} name="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Enter current password" disabled={isChangingPassword} />
                      {passwordErrors.currentPassword && <div className="form-error">{passwordErrors.currentPassword}</div>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`} name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Enter new password" disabled={isChangingPassword} />
                        {passwordErrors.newPassword && <div className="form-error">{passwordErrors.newPassword}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`} name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm new password" disabled={isChangingPassword} />
                        {passwordErrors.confirmPassword && <div className="form-error">{passwordErrors.confirmPassword}</div>}
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isChangingPassword} style={{ width: '100%' }}>
                      {isChangingPassword ? (
                        <>
                          <span className="spinner"></span>
                          <span style={{ marginLeft: 8 }}>Changing...</span>
                        </>
                      ) : 'Change Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--medium-gray)' }}>
              <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>Account</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="btn btn-outline" onClick={handleLogout} style={{ color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}>Logout</button>
                <span style={{ color: 'var(--text-light)', fontSize: 14 }}>Sign out of your account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorProfile;


