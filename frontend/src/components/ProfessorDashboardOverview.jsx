import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';

const ProfessorDashboardOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEventsCreated: 0,
    upcomingEvents: 0,
    eventsParticipatingIn: 0,
    pendingApprovals: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  // Fetch real dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch stats and notifications in parallel
        const [statsResult, notificationsResult] = await Promise.all([
          professorApiService.getDashboardStats(),
          professorApiService.getDashboardNotifications()
        ]);

        if (statsResult.success) {
          setStats(statsResult.data.stats);
        } else {
          console.error('Failed to fetch stats:', statsResult.message);
          setError('Failed to load dashboard statistics');
        }

        if (notificationsResult.success) {
          setNotifications(notificationsResult.data.notifications);
        } else {
          console.error('Failed to fetch notifications:', notificationsResult.message);
          setError('Failed to load notifications');
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const priorityIcon = (p) => ({ success: '✅', warning: '⚠️', info: 'ℹ️', pending: '⏳' }[p] || '📢');
  const priorityColor = (p) => ({ success: 'var(--success-green)', warning: 'var(--warning-yellow)', info: 'var(--alert-blue)', pending: 'var(--text-light)' }[p] || 'var(--text-light)');

  const timeAgo = (iso) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    if (h < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: '2rem' }}>
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
        Event Overview
      </h3>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--guc-red)', marginBottom: '0.25rem' }}>{stats.totalEventsCreated}</div>
          <div style={{ color: 'var(--text-light)' }}>Total Events Created</div>
        </div>
        <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🚀</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--alert-blue)', marginBottom: '0.25rem' }}>{stats.upcomingEvents}</div>
          <div style={{ color: 'var(--text-light)' }}>Upcoming Events</div>
        </div>
        <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>👥</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--success-green)', marginBottom: '0.25rem' }}>{stats.eventsParticipatingIn}</div>
          <div style={{ color: 'var(--text-light)' }}>Events Participating In</div>
        </div>
        <div className="card" style={{ backgroundColor: 'var(--light-gray)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--warning-yellow)', marginBottom: '0.25rem' }}>{stats.pendingApprovals}</div>
          <div style={{ color: 'var(--text-light)' }}>Pending Approvals</div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ color: 'var(--charcoal-black)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Notifications</h4>
          <div style={{ fontSize: '14px', color: 'var(--text-light)', backgroundColor: 'var(--white)', padding: '0.25rem 0.75rem', borderRadius: '12px', border: '1px solid var(--medium-gray)' }}>
            {notifications.filter(n => !n.isRead).length} unread
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>No notifications right now.</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => !n.isRead && markAsRead(n.id)}
                   style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', padding: '1rem', backgroundColor: n.isRead ? 'var(--white)' : '#f8f9ff', borderRadius: '8px', border: `1px solid ${n.isRead ? 'var(--medium-gray)' : 'var(--alert-blue)'}`, cursor: 'pointer', opacity: n.isRead ? 0.85 : 1 }}>
                <div style={{ fontSize: '1.1rem', marginTop: '0.15rem' }}>{priorityIcon(n.priority)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: n.isRead ? 500 : 600, color: 'var(--charcoal-black)' }}>{n.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: '1rem', whiteSpace: 'nowrap' }}>{timeAgo(n.timestamp)}</div>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>{n.message}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColor(n.priority) }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'capitalize' }}>{n.priority}</span>
                  </div>
                </div>
                {!n.isRead && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--alert-blue)', marginTop: '0.5rem' }}></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboardOverview;


