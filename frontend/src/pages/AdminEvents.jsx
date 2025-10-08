import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AdminEvents = () => {
  const { user } = useAuth();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');

  // Action states
  const [processingIds, setProcessingIds] = useState({}); // id -> boolean
  const [actionMessages, setActionMessages] = useState({}); // id -> message
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, event: null });

  // Placeholder events data
  const events = [
    {
      id: 'event-001',
      title: 'Tech Conference 2024',
      description: 'Annual technology conference featuring latest innovations',
      date: '2024-12-15T09:00:00Z',
      location: 'GUC Main Auditorium',
      organizer: 'Tech Club',
      organizerEmail: 'tech.club@guc.edu.eg',
      status: 'pending',
      createdAt: '2024-09-10T10:00:00Z',
      maxAttendees: 200,
      currentAttendees: 45
    },
    {
      id: 'event-002',
      title: 'Career Fair',
      description: 'Meet with top companies and explore career opportunities',
      date: '2024-11-20T10:00:00Z',
      location: 'Sports Complex',
      organizer: 'Career Services',
      organizerEmail: 'career@guc.edu.eg',
      status: 'approved',
      createdAt: '2024-09-05T14:30:00Z',
      maxAttendees: 500,
      currentAttendees: 120
    },
    {
      id: 'event-003',
      title: 'Cultural Night',
      description: 'Celebrate diversity with performances from different cultures',
      date: '2024-10-25T18:00:00Z',
      location: 'Student Center',
      organizer: 'Cultural Society',
      organizerEmail: 'cultural@guc.edu.eg',
      status: 'rejected',
      createdAt: '2024-09-12T16:45:00Z',
      maxAttendees: 150,
      currentAttendees: 0
    },
    {
      id: 'event-004',
      title: 'Workshop: Data Science',
      description: 'Hands-on workshop on data analysis and machine learning',
      date: '2024-11-05T14:00:00Z',
      location: 'Computer Lab 3',
      organizer: 'Data Science Club',
      organizerEmail: 'datascience@guc.edu.eg',
      status: 'pending',
      createdAt: '2024-09-15T11:20:00Z',
      maxAttendees: 30,
      currentAttendees: 8
    },
    {
      id: 'event-005',
      title: 'Sports Tournament',
      description: 'Inter-departmental sports competition',
      date: '2024-12-01T08:00:00Z',
      location: 'Sports Complex',
      organizer: 'Sports Committee',
      organizerEmail: 'sports@guc.edu.eg',
      status: 'approved',
      createdAt: '2024-09-08T09:15:00Z',
      maxAttendees: 100,
      currentAttendees: 67
    }
  ];

  // Get unique organizers for filter
  const organizers = useMemo(() => {
    const unique = [...new Set(events.map(e => e.organizer))];
    return unique.sort();
  }, [events]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q) ||
        event.organizer.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        switch (dateFilter) {
          case 'upcoming':
            return eventDate > now;
          case 'past':
            return eventDate < now;
          case 'today':
            return eventDate.toDateString() === now.toDateString();
          case 'this-week':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return eventDate >= now && eventDate <= weekFromNow;
          default:
            return true;
        }
      });
    }

    // Organizer filter
    if (organizerFilter !== 'all') {
      filtered = filtered.filter(event => event.organizer === organizerFilter);
    }

    return filtered;
  }, [events, searchQuery, statusFilter, dateFilter, organizerFilter]);

  const handleStatusChange = async (eventId, newStatus) => {
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    setActionMessages(prev => ({ ...prev, [eventId]: '' }));

    try {
      // TODO: Replace with backend call
      // Example: await axios.patch(`/api/admin/events/${eventId}/status`, { status: newStatus });
      await new Promise(res => setTimeout(res, 500));
      
      setActionMessages(prev => ({ ...prev, [eventId]: `Event ${newStatus} successfully.` }));
    } catch (error) {
      setActionMessages(prev => ({ ...prev, [eventId]: `Failed to ${newStatus} event.` }));
    } finally {
      setProcessingIds(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleDeleteClick = (event) => {
    setDeleteConfirm({ show: true, event });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.event) return;

    setProcessingIds(prev => ({ ...prev, [deleteConfirm.event.id]: true }));
    try {
      // TODO: Replace with backend call
      // Example: await axios.delete(`/api/admin/events/${deleteConfirm.event.id}`);
      await new Promise(res => setTimeout(res, 500));
      
      setDeleteConfirm({ show: false, event: null });
      setActionMessages(prev => ({ ...prev, [deleteConfirm.event.id]: 'Event deleted successfully.' }));
    } catch (error) {
      setActionMessages(prev => ({ ...prev, [deleteConfirm.event.id]: 'Failed to delete event.' }));
    } finally {
      setProcessingIds(prev => ({ ...prev, [deleteConfirm.event.id]: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, event: null });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--success-green)';
      case 'rejected': return 'var(--guc-red)';
      case 'pending': return 'var(--warning-yellow)';
      default: return 'var(--text-light)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✓';
      case 'rejected': return '✗';
      case 'pending': return '⏳';
      default: return '?';
    }
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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Events Management</h1>
            <p className="card-subtitle">View and manage all platform events</p>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            {/* Search and Filters */}
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <div style={{ padding: '1rem' }}>
                <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>Search & Filters</h3>
                
                {/* Search Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Search events by title, description, location, or organizer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <select
                      className="form-input"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="all">All Dates</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="today">Today</option>
                      <option value="this-week">This Week</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Organizer</label>
                    <select
                      className="form-input"
                      value={organizerFilter}
                      onChange={(e) => setOrganizerFilter(e.target.value)}
                    >
                      <option value="all">All Organizers</option>
                      {organizers.map(organizer => (
                        <option key={organizer} value={organizer}>{organizer}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredEvents.length === 0 ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>
                    No events match your search criteria.
                  </div>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                    <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                      {/* Event Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'grid', gap: '0.25rem', flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)', fontSize: '18px' }}>
                            {event.title}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                            {event.description}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                            📍 {event.location} • 👥 {event.currentAttendees}/{event.maxAttendees} attendees
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'grid', gap: '0.25rem' }}>
                          <div style={{ 
                            fontSize: '12px', 
                            color: getStatusColor(event.status),
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {getStatusIcon(event.status)} {event.status.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                            📅 {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                            👤 {event.organizer}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {event.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleStatusChange(event.id, 'approved')}
                              disabled={!!processingIds[event.id]}
                              style={{ fontSize: '12px' }}
                            >
                              {processingIds[event.id] ? 'Processing...' : '✓ Approve'}
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleStatusChange(event.id, 'rejected')}
                              disabled={!!processingIds[event.id]}
                              style={{ fontSize: '12px', color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                            >
                              {processingIds[event.id] ? 'Processing...' : '✗ Reject'}
                            </button>
                          </>
                        )}
                        
                        {event.status === 'approved' && (
                          <button
                            className="btn btn-outline"
                            onClick={() => handleStatusChange(event.id, 'rejected')}
                            disabled={!!processingIds[event.id]}
                            style={{ fontSize: '12px', color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                          >
                            {processingIds[event.id] ? 'Processing...' : '✗ Reject'}
                          </button>
                        )}

                        {event.status === 'rejected' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleStatusChange(event.id, 'approved')}
                            disabled={!!processingIds[event.id]}
                            style={{ fontSize: '12px' }}
                          >
                            {processingIds[event.id] ? 'Processing...' : '✓ Approve'}
                          </button>
                        )}

                        <button
                          className="btn btn-outline"
                          onClick={() => handleDeleteClick(event)}
                          disabled={!!processingIds[event.id]}
                          style={{ fontSize: '12px', color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                        >
                          🗑️ Delete
                        </button>

                        {actionMessages[event.id] && (
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '12px', 
                            color: actionMessages[event.id].includes('successfully') ? 'var(--success-green)' : 'var(--guc-red)' 
                          }}>
                            {actionMessages[event.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.event && (
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
              <h3 style={{ color: 'var(--guc-red)', margin: 0 }}>Confirm Event Deletion</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                Are you sure you want to delete the event <strong>"{deleteConfirm.event.title}"</strong>?
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '1rem' }}>
                This action cannot be undone and will remove all associated data.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleDeleteCancel}
                  disabled={!!processingIds[deleteConfirm.event.id]}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDeleteConfirm}
                  disabled={!!processingIds[deleteConfirm.event.id]}
                  style={{ backgroundColor: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                >
                  {processingIds[deleteConfirm.event.id] ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEvents;
