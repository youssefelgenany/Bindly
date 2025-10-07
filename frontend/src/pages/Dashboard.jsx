import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const getUserTypeDisplay = (userType) => {
    const types = {
      'Student': 'Student',
      'Staff': 'Staff Member',
      'TA': 'Teaching Assistant',
      'Professor': 'Professor',
      'Vendor': 'Vendor'
    };
    return types[userType] || userType;
  };

  const getWelcomeMessage = (userType) => {
    const messages = {
      'Student': 'Welcome to your student dashboard! Explore trips, bazaars, and more.',
      'Staff': 'Welcome to the staff portal. Manage events and activities.',
      'TA': 'Welcome to the TA dashboard. Help manage student activities.',
      'Professor': 'Welcome to the professor portal. Create and manage academic events.',
      'Vendor': 'Welcome to the vendor portal. Manage your business listings.'
    };
    return messages[userType] || 'Welcome to your dashboard!';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>
              Welcome, {user.firstName}!
            </h1>
            <p className="card-subtitle">
              {getWelcomeMessage(user.userType)}
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem',
            marginTop: '2rem'
          }}>
            {/* User Info Card */}
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                Account Information
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div>
                  <strong>Name:</strong> {user.firstName} {user.lastName}
                </div>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Account Type:</strong> {getUserTypeDisplay(user.userType)}
                </div>
                {user.gucId && (
                  <div>
                    <strong>GUC ID:</strong> {user.gucId}
                  </div>
                )}
                {user.companyName && (
                  <div>
                    <strong>Company:</strong> {user.companyName}
                  </div>
                )}
                <div>
                  <strong>Status:</strong> 
                  <span style={{ 
                    color: user.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)',
                    marginLeft: '0.5rem'
                  }}>
                    {user.isVerified ? '✓ Verified' : '⚠ Pending Verification'}
                  </span>
                </div>
                <div>
                  <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {user.userType === 'Student' && (
                  <>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      Browse Trips
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      View Bazaars
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      My Bookings
                    </button>
                  </>
                )}
                
                {['Staff', 'TA', 'Professor'].includes(user.userType) && (
                  <>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      Manage Trips
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      Manage Bazaars
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      View Reports
                    </button>
                  </>
                )}

                {user.userType === 'Vendor' && (
                  <>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      My Listings
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      Add New Listing
                    </button>
                    <button className="btn btn-outline" style={{ width: '100%' }}>
                      View Analytics
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
              Recent Activity
            </h3>
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>
                No recent activity to display. Start exploring Bindly!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
