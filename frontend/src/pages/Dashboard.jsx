import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ProfessorDashboard from '../components/ProfessorDashboard';
import StudentDashboard from '../components/StudentDashboard';
import StaffDashboard from '../components/StaffDashboard';
import TADashboard from '../components/TADashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect Event Office users to their dedicated dashboard
  useEffect(() => {
    const isEventsOffice = user && (
      user.userType === 'Event Office' ||
      user.userType === 'Events Office' ||
      user.userType === 'event_office' ||
      user.role === 'event_office' ||
      user.role === 'Event Office'
    );
    if (isEventsOffice) {
      navigate('/event-office');
    }
  }, [user, navigate]);

  const getUserTypeDisplay = (userType) => {
    const types = {
      'Student': 'Student',
      'Staff': 'Staff Member',
      'TA': 'Teaching Assistant',
      'Professor': 'Professor',
      'Vendor': 'Vendor',
      'Admin': 'Admin',
      'Event Office': 'Event Office'
    };
    return types[userType] || userType;
  };

  const getWelcomeMessage = (userType) => {
    const messages = {
      'Student': 'Welcome to your student dashboard! Explore trips, bazaars, and more.',
      'Staff': 'Welcome to the staff portal. Manage events and activities.',
      'TA': 'Welcome to the TA dashboard. Help manage student activities.',
      'Professor': 'Welcome to the professor portal. Create and manage academic events.',
      'Vendor': 'Welcome to the vendor portal. Manage your business listings.',
      'Admin': 'Welcome to the admin dashboard! Monitor and manage the platform.',
      'Event Office': 'Welcome to the event office dashboard! Manage events and activities.'
    };
    return messages[userType] || 'Welcome to your dashboard!';
  };

  const [statsData, setStatsData] = useState({ totalUsers: 0, totalVendors: 0, totalEvents: 0, pendingApprovals: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!(user?.userType === 'admin' || user?.userType === 'Admin')) return;
      try {
        setLoadingAdmin(true);
        setAdminError('');
        const token = localStorage.getItem('token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        const [statsRes, activityRes] = await Promise.all([
          axios.get('http://localhost:5000/api/dashboard/admin/stats', { headers: authHeaders }),
          axios.get('http://localhost:5000/api/dashboard/admin/activity', { headers: authHeaders })
        ]);
        if (statsRes.data?.success) setStatsData(statsRes.data.stats || {});
        if (activityRes.data?.success) {
          const activities = (activityRes.data.activities || []).map(a => ({
            ...a,
            icon: a.type === 'registration' ? '👤' : a.type === 'event' ? '📅' : 'ℹ️'
          }));
          setRecentActivity(activities);
        }
      } catch (e) {
        console.error('Dashboard load error:', e?.response?.status, e?.response?.data || e.message);
        const msg = e?.response?.data?.message || 'Failed to load dashboard data';
        setAdminError(msg);
      } finally {
        setLoadingAdmin(false);
      }
    };
    fetchAdminData();
  }, [user]);

  const isAdmin = user?.role === 'admin' || user?.userType === 'admin' || user?.userType === 'Admin';
  const isStudent = user?.userType === 'Student' || user?.userType === 'student';
  const isStaff = user?.userType === 'Staff';
  const isTA = user?.userType === 'TA';
  const isProfessor = user?.userType === 'Professor';

  // Show Admin Dashboard for admins
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Show Student Dashboard for students
  if (isStudent) {
    return <StudentDashboard />;
  }

  // Show Staff Dashboard for staff
  if (isStaff) {
    return <StaffDashboard />;
  }

  // Show TA Dashboard for TAs
  if (isTA) {
    return <TADashboard />;
  }

  // Show Professor Dashboard for professors
  if (isProfessor) {
    return <ProfessorDashboard />;
  }

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


          {/* Admin Dashboard Overview */}
          {isAdmin && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                Platform Overview
              </h3>
              {adminError && (
                <div className="alert alert-error">{adminError}</div>
              )}
              {loadingAdmin && (
                <div style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Loading...</div>
              )}
              
              {/* Stats Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--guc-red)', marginBottom: '0.25rem' }}>
                    {statsData.totalUsers.toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>Total Users</div>
                </div>

                <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏪</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--guc-red)', marginBottom: '0.25rem' }}>
                    {statsData.totalVendors}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>Total Vendors</div>
                </div>

                <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--guc-red)', marginBottom: '0.25rem' }}>
                    {statsData.totalEvents}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>Total Events</div>
                </div>

                <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning-yellow)', marginBottom: '0.25rem' }}>
                    {statsData.pendingApprovals}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>Pending Approvals</div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                    Recent Activity
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {recentActivity.map((activity) => (
                      <div key={activity.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--white)',
                        borderRadius: '6px',
                        border: '1px solid var(--medium-gray)'
                      }}>
                        <div style={{ fontSize: '1.2rem' }}>{activity.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: 'var(--charcoal-black)' }}>
                            {activity.user}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                            {activity.action}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          

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

          {/* Recent Activity for non-admin users */}
          {!isAdmin && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
