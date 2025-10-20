import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';
//test
const AdminEvents = () => {
  const { user } = useAuth();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Action states
  const [processingIds, setProcessingIds] = useState({}); // id -> boolean
  const [actionMessages, setActionMessages] = useState({}); // id -> message
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, event: null });

  // Events state - will be loaded from API
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading events with filters:', { q: searchQuery, status: statusFilter, type: typeFilter });
      const result = await adminApiService.getAllEvents({
        q: searchQuery,
        status: statusFilter,
        ...(typeFilter !== 'all' && { type: typeFilter })
      });
      console.log('Events API result:', result);
      if (result.success) {
        setEvents(result.data.events || []);
        console.log('Events loaded:', result.data.events);
      } else {
        setError(result.message);
        console.error('API error:', result.message);
      }
    } catch (err) {
      setError('Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  // Load events on component mount and when filters change
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);


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
      console.log('📅 Applying date filter:', dateFilter, 'Current time:', now);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        console.log('📅 Event date:', eventDate, 'Event title:', event.title);
        let matches = false;
        switch (dateFilter) {
          case 'upcoming':
            matches = eventDate > now;
            break;
          case 'past':
            matches = eventDate < now;
            break;
          case 'today':
            matches = eventDate.toDateString() === now.toDateString();
            break;
          case 'this-week':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            matches = eventDate >= now && eventDate <= weekFromNow;
            break;
          default:
            matches = true;
        }
        console.log('📅 Event matches filter:', matches);
        return matches;
      });
    }

    return filtered;
  }, [events, searchQuery, statusFilter, dateFilter]);

  const handleStatusChange = async (eventId, newStatus) => {
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    setActionMessages(prev => ({ ...prev, [eventId]: '' }));

    try {
      const result = await adminApiService.updateEventStatus(eventId, newStatus);
      if (result.success) {
        setActionMessages(prev => ({ ...prev, [eventId]: `Event ${newStatus} successfully.` }));
        // Reload events to get updated data
        await loadEvents();
      } else {
        setActionMessages(prev => ({ ...prev, [eventId]: result.message || `Failed to ${newStatus} event.` }));
      }
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

    const eventId = deleteConfirm.event._id || deleteConfirm.event.id;
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    try {
      const result = await adminApiService.deleteEvent(eventId);
      if (result.success) {
        setDeleteConfirm({ show: false, event: null });
        setActionMessages(prev => ({ ...prev, [eventId]: 'Event deleted successfully.' }));
        // Reload events to get updated data
        await loadEvents();
      } else {
        setActionMessages(prev => ({ ...prev, [eventId]: result.message || 'Failed to delete event.' }));
      }
    } catch (error) {
      setActionMessages(prev => ({ ...prev, [eventId]: 'Failed to delete event.' }));
    } finally {
      setProcessingIds(prev => ({ ...prev, [eventId]: false }));
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
                    <label className="form-label">Event Type</label>
                    <select
                      className="form-input"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="bazaar">Bazaar</option>
                      <option value="trip">Trip</option>
                      <option value="conference">Conference</option>
                      <option value="workshop">Workshop</option>
                      <option value="booth">Booth</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {loading ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <div style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading events...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--guc-red)', textAlign: 'center' }}>
                    {error}
                    <button 
                      onClick={loadEvents}
                      className="btn btn-outline"
                      style={{ marginLeft: '1rem', padding: '4px 8px' }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>
                    No events match your search criteria.
                  </div>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const eventId = event._id || event.id;
                  return (
                    <div key={eventId} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                        {/* Event Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.25rem', flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)', fontSize: '18px' }}>
                              {event.title}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: 'var(--guc-blue)', 
                              fontWeight: '600',
                              backgroundColor: 'var(--light-blue)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-block',
                              width: 'fit-content'
                            }}>
                              📋 {event.type?.toUpperCase() || 'UNKNOWN'}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                              {event.description}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                              📍 {event.location} • 👥 {event.registeredCount || 0}/{event.capacity} attendees
                            </div>
                            
                            {/* Participating Vendors for Workshops, Booths, and Bazaars */}
                            {(event.type === 'workshop' || event.type === 'booth' || event.type === 'bazaar') && event.vendors && event.vendors.length > 0 && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: 'var(--guc-blue)', 
                                  fontWeight: '600',
                                  marginBottom: '0.5rem'
                                }}>
                                  🏪 Participating Vendors ({event.vendors.length})
                                </div>
                                <div style={{ 
                                  display: 'grid', 
                                  gap: '0.5rem',
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  backgroundColor: 'rgba(0, 123, 255, 0.05)',
                                  padding: '0.5rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--light-blue)'
                                }}>
                                  {event.vendors.map((vendor, index) => (
                                    <div key={vendor.id || index} style={{
                                      backgroundColor: 'white',
                                      padding: '0.5rem',
                                      borderRadius: '6px',
                                      border: '1px solid var(--light-blue)',
                                      fontSize: '11px'
                                    }}>
                                      <div style={{ fontWeight: '600', color: 'var(--charcoal-black)', marginBottom: '0.25rem' }}>
                                        {vendor.companyName || vendor.contactName}
                                      </div>
                                      <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                        📧 {vendor.email}
                                      </div>
                                      {vendor.phone && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          📞 {vendor.phone}
                                        </div>
                                      )}
                                      {vendor.contactName && vendor.contactName !== vendor.companyName && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          👤 Contact: {vendor.contactName}
                                        </div>
                                      )}
                                      {vendor.boothSize && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          📏 {event.type === 'bazaar' ? 'Booth Size' : 'Booth Size'}: {vendor.boothSize}
                                        </div>
                                      )}
                                      {vendor.durationWeeks && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          ⏱️ Duration: {vendor.durationWeeks} week{vendor.durationWeeks !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                      {vendor.boothLocation && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          📍 {event.type === 'bazaar' ? 'Booth Location' : 'Location'}: {vendor.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </div>
                                      )}
                                      {vendor.attendees && vendor.attendees.length > 0 && (
                                        <div style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                          👥 Attendees: {vendor.attendees.length}
                                          <div style={{ marginLeft: '0.5rem', fontSize: '10px' }}>
                                            {vendor.attendees.map((attendee, idx) => (
                                              <div key={idx}>• {attendee.name} ({attendee.email})</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {vendor.message && (
                                        <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '10px' }}>
                                          💬 "{vendor.message}"
                                        </div>
                                      )}
                                      <div style={{ color: 'var(--text-light)', fontSize: '10px', marginTop: '0.25rem' }}>
                                        📅 Applied: {new Date(vendor.joinedAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
                            📅 {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                            👤 {event.createdBy?.firstName} {event.createdBy?.lastName} ({event.createdBy?.email})
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleDeleteClick(event)}
                          disabled={!!processingIds[eventId]}
                          style={{ fontSize: '12px', color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                        >
                          🗑️ Delete
                        </button>

                        {actionMessages[eventId] && (
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '12px', 
                            color: actionMessages[eventId].includes('successfully') ? 'var(--success-green)' : 'var(--guc-red)' 
                          }}>
                            {actionMessages[eventId]}
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
