import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApiService } from '../api/eventsApi';
import { useAuth } from '../contexts/AuthContext';
import '../styles/EventsList.css';
import BazaarForm from '../components/BazaarForm';
import ConferenceForm from '../components/ConferenceForm';
import TripForm from '../components/TripForm';

const EventsList = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, bazaars, trips, conferences, workshops
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, rejected, pending
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBazaar, setEditingBazaar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isConferenceModalOpen, setIsConferenceModalOpen] = useState(false);
  const [editingConference, setEditingConference] = useState(null);
  const [conferenceSaving, setConferenceSaving] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripSaving, setTripSaving] = useState(false);
  const [processingIds, setProcessingIds] = useState({}); // For tracking processing states
  const [actionMessages, setActionMessages] = useState({}); // For showing action feedback

  useEffect(() => {
    loadEvents();
  }, []);

  // Reload from backend when filter changes so type=conference pulls only conferences
  useEffect(() => {
    if (!loading) {
      setLoading(true);
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadEvents = async () => {
    try {
      setError('');
      const result = await eventsApiService.getAllEventsAuthenticated({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      if (result.success) {
        console.log('🔍 Raw events data:', result.data);
        const mapped = (result.data || []).map(ev => ({
          id: ev._id || ev.id,
          name: ev.title || ev.name,
          title: ev.title || ev.name,
          type: ev.type,
          status: ev.status || 'approved', // Default to approved if no status
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          professorName: ev.creatorName || ev.professorName || ev.createdByName || ev.organizer,
          creatorFirstName: ev.creatorFirstName || ev.createdBy?.firstName,
          creatorLastName: ev.creatorLastName || ev.createdBy?.lastName
        }));
        console.log('🔍 Mapped events with status:', mapped);
        setEvents(mapped);
      } else {
        setEvents([]);
        const msg = result.message || (typeof result.error === 'string' ? result.error : 'Failed to fetch events');
        setError(msg);
        console.error('Failed to fetch events:', msg);
      }
    } catch (error) {
      setError(error?.message || 'Error loading events');
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = async () => {
    setLoading(true);
    setSearchQuery('');
    setFilter('all');
    try {
      const result = await eventsApiService.getAllEventsAuthenticated({});
      if (result.success) {
        const mapped = (result.data || []).map(ev => ({
          id: ev._id || ev.id,
          name: ev.title || ev.name,
          title: ev.title || ev.name,
          type: ev.type,
          status: ev.status || 'approved', // Default to approved if no status
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          professorName: ev.creatorName || ev.professorName || ev.createdByName || ev.organizer,
          creatorFirstName: ev.creatorFirstName || ev.createdBy?.firstName,
          creatorLastName: ev.creatorLastName || ev.createdBy?.lastName
        }));
        console.log('🔍 Mapped events with status:', mapped);
        setEvents(mapped);
      } else {
        setEvents([]);
        console.error('Failed to fetch events:', result.message || result.error);
      }
    } catch (e) {
      console.error('Error loading all events:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    // Type filter
    const typeMatch = filter === 'all' || event.type === filter;
    
    // Status filter (only for event office users)
    const statusMatch = statusFilter === 'all' || event.status === statusFilter;
    
    return typeMatch && statusMatch;
  });

  const openBazaarEdit = (eventItem) => {
    setEditingBazaar(eventItem);
    setIsEditModalOpen(true);
  };

  const closeBazaarEdit = () => {
    setIsEditModalOpen(false);
    setEditingBazaar(null);
  };

  const handleBazaarUpdate = async (formData) => {
    if (!editingBazaar?.id) return;
    try {
      setSaving(true);
      const { bazaarApi } = await import('../api/eventsApi');
      await bazaarApi.update(editingBazaar.id, formData);
      await loadEvents();
      closeBazaarEdit();
    } catch (e) {
      console.error('Failed to update bazaar:', e);
    } finally {
      setSaving(false);
    }
  };

  const openConferenceEdit = (eventItem) => {
    console.log('🔹 Frontend: Opening conference edit for event:', eventItem);
    setEditingConference(eventItem);
    setIsConferenceModalOpen(true);
  };

  const closeConferenceEdit = () => {
    setIsConferenceModalOpen(false);
    setEditingConference(null);
  };

  const handleConferenceUpdate = async (formData) => {
    if (!editingConference?.id) return;
    try {
      console.log('🔹 Frontend: Starting conference update for ID:', editingConference.id);
      console.log('🔹 Frontend: Form data:', formData);
      
      setConferenceSaving(true);
      
      // Call the events API to update the conference
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/events/${editingConference.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      console.log('🔹 Frontend: Conference update result:', result);
      
      if (response.ok) {
      await loadEvents();
      closeConferenceEdit();
        console.log('✅ Frontend: Conference update completed successfully');
      } else {
        console.error('❌ Frontend: Conference update failed:', result.msg || result.message);
        // You might want to show an error message to the user here
      }
    } catch (e) {
      console.error('❌ Frontend: Failed to update conference:', e);
      console.error('❌ Frontend: Error details:', e.response || e.message);
    } finally {
      setConferenceSaving(false);
    }
  };

  const openTripEdit = (eventItem) => {
    console.log('🔹 Frontend: Opening trip edit for event:', eventItem);
    setEditingTrip(eventItem);
    setIsTripModalOpen(true);
  };

  const closeTripEdit = () => {
    setIsTripModalOpen(false);
    setEditingTrip(null);
  };

  const handleTripUpdate = async (formData) => {
    if (!editingTrip?.id) return;
    try {
      console.log('🔹 Frontend: Starting trip update for ID:', editingTrip.id);
      console.log('🔹 Frontend: Form data:', formData);
      
      setTripSaving(true);
      const { tripApi } = await import('../api/eventsApi');
      
      console.log('🔹 Frontend: Calling tripApi.update...');
      const result = await tripApi.update(editingTrip.id, formData);
      console.log('🔹 Frontend: Trip update result:', result);
      
      await loadEvents();
      closeTripEdit();
      console.log('✅ Frontend: Trip update completed successfully');
    } catch (e) {
      console.error('❌ Frontend: Failed to update trip:', e);
      console.error('❌ Frontend: Error details:', e.response || e.message);
    } finally {
      setTripSaving(false);
    }
  };

  // Handle event status change (Accept/Reject)
  const handleEventStatusChange = async (eventId, newStatus) => {
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    setActionMessages(prev => ({ ...prev, [eventId]: '' }));

    try {
      const result = await eventsApiService.updateEventStatus(eventId, { status: newStatus });
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

  // Handle event deletion
  const handleEventDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    setActionMessages(prev => ({ ...prev, [eventId]: '' }));

    try {
      const result = await eventsApiService.deleteEvent(eventId);
      if (result.success) {
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

  if (loading) {
    return (
      <div className="events-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="events-page">
        <div className="events-header">
          <h1>Events Management</h1>
          <p>Manage all bazaars and trips</p>
          
          <div className="events-search">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by event or professor name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setLoading(true); loadEvents(); } }}
            />
            <button className="btn btn-primary" onClick={() => { setLoading(true); loadEvents(); }}>Search</button>
          </div>
          
          <div className="events-actions">
          <button className="btn btn-outline" onClick={handleViewAll}>
            View All Events
          </button>
          {!(user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
            <Link to="/create-bazaar" className="btn btn-primary">
              Create New Bazaar
            </Link>
          )}
          {!(user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
            <Link to="/create-trip" className="btn btn-primary">
              Create New Trip
            </Link>
          )}
        </div>

        <div className="events-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events
          </button>
          <button 
            className={`filter-btn ${filter === 'bazaar' ? 'active' : ''}`}
            onClick={() => setFilter('bazaar')}
          >
            Bazaars
          </button>
          <button 
            className={`filter-btn ${filter === 'trip' ? 'active' : ''}`}
            onClick={() => setFilter('trip')}
          >
            Trips
          </button>
          <button 
            className={`filter-btn ${filter === 'conference' ? 'active' : ''}`}
            onClick={() => setFilter('conference')}
          >
            Conferences
          </button>
          <button 
            className={`filter-btn ${filter === 'workshop' ? 'active' : ''}`}
            onClick={() => setFilter('workshop')}
          >
            Workshops
          </button>
        </div>

        {/* Status Filters - Only for Event Office users */}
        {(
          user?.userType === 'Event Office' ||
          user?.userType === 'Events Office' ||
          user?.userType === 'event_office' ||
          user?.role === 'event_office' ||
          user?.role === 'Event Office'
        ) && (
          <div className="events-filters" style={{ marginTop: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--charcoal-black)' }}>Filter by Status:</h4>
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Statuses
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
              style={{ backgroundColor: statusFilter === 'pending' ? 'var(--warning-yellow)' : '', color: statusFilter === 'pending' ? 'var(--charcoal-black)' : '' }}
            >
              ⏳ Pending
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
              style={{ backgroundColor: statusFilter === 'approved' ? 'var(--success-green)' : '', color: statusFilter === 'approved' ? 'white' : '' }}
            >
              ✓ Approved
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
              style={{ backgroundColor: statusFilter === 'rejected' ? 'var(--guc-red)' : '', color: statusFilter === 'rejected' ? 'white' : '' }}
            >
              ✗ Rejected
            </button>
          </div>
        )}
      </div>

      <div className="events-list">
        {error ? (
          <div className="no-events">
            <p style={{ color: 'var(--guc-red)' }}>{error}</p>
            <button className="btn btn-outline" onClick={loadEvents}>Retry</button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="no-events">
            <p>No events found. Create your first event!</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className="event-card">
              <div className="event-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3>{event.name}</h3>
                  {/* Status Badge - Only show for non-trip and non-bazaar events */}
                  {event.type !== 'trip' && event.type !== 'bazaar' && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: event.status === 'approved' ? 'var(--success-green)' : 
                                     event.status === 'rejected' ? 'var(--guc-red)' : 
                                     event.status === 'pending' ? 'var(--warning-yellow)' : 'var(--text-light)',
                      color: event.status === 'pending' ? 'var(--charcoal-black)' : 'white',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {event.status === 'approved' ? '✓ APPROVED' : 
                       event.status === 'rejected' ? '✗ REJECTED' : 
                       event.status === 'pending' ? '⏳ PENDING' : 'UNKNOWN'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p className="event-type">{event.type.toUpperCase()}</p>
                </div>
                <p className="event-location">📍 {event.location}</p>
                <p className="event-date">
                  🗓️ {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                </p>
                <p className="event-description">{event.description}</p>
                
                {event.type === 'workshop' && event.professorName && (
                  <div className="workshop-details">
                    <p>👨‍🏫 Professor: {event.professorName}</p>
                  </div>
                )}
                
                {event.type === 'trip' && (
                  <div className="trip-details">
                    <p>💰 Price: ${event.price}</p>
                    <p>👥 Capacity: {event.capacity} people</p>
                    {event.registrationDeadline && (
                      <p>⏰ Registration Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
                
                {event.type === 'bazaar' && event.registrationDeadline && (
                  <div className="bazaar-details">
                    <p>⏰ Registration Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              <div className="event-actions">
                {(
                  user?.userType === 'Event Office' ||
                  user?.userType === 'Events Office' ||
                  user?.userType === 'event_office' ||
                  user?.role === 'event_office' ||
                  user?.role === 'Event Office'
                ) ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Debug logging */}
                    {console.log('🔍 Event status for buttons:', event.id, event.status)}
                    {/* Status Management Buttons - Show Accept/Reject only for non-trip and non-bazaar events */}
                    {event.type !== 'trip' && event.type !== 'bazaar' && (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleEventStatusChange(event.id, 'approved')}
                          disabled={!!processingIds[event.id] || event.status === 'approved'}
                          style={{ 
                            fontSize: '12px',
                            opacity: event.status === 'approved' ? 0.6 : 1
                          }}
                        >
                          {processingIds[event.id] ? 'Processing...' : '✓ Accept'}
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleEventStatusChange(event.id, 'rejected')}
                          disabled={!!processingIds[event.id] || event.status === 'rejected'}
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--guc-red)', 
                            borderColor: 'var(--guc-red)',
                            opacity: event.status === 'rejected' ? 0.6 : 1
                          }}
                        >
                          {processingIds[event.id] ? 'Processing...' : '✗ Reject'}
                        </button>
                      </>
                    )}

                    {/* Edit Button */}
                    {event.type === 'bazaar' ? (
                      // Only show edit button if bazaar hasn't started yet
                      new Date(event.startDate) > new Date() ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => openBazaarEdit(event)}
                    >
                      Edit
                    </button>
                      ) : (
                        <span className="text-muted" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          Bazaar has started
                        </span>
                      )
                  ) : event.type === 'conference' ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => openConferenceEdit(event)}
                    >
                      Edit
                    </button>
                    ) : event.type === 'trip' ? (
                      // Only show edit button if trip hasn't started yet
                      new Date(event.startDate) > new Date() ? (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => openTripEdit(event)}
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-muted" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          Trip has started
                        </span>
                      )
                    ) : null}

                    {/* Delete Button */}
                    <button 
                      className="btn btn-outline"
                      onClick={() => handleEventDelete(event.id)}
                      disabled={!!processingIds[event.id]}
                      style={{ fontSize: '12px', color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                    >
                      {processingIds[event.id] ? 'Deleting...' : '🗑️ Delete'}
                    </button>

                    {/* Action Messages */}
                    {actionMessages[event.id] && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: actionMessages[event.id].includes('successfully') ? 'var(--success-green)' : 'var(--guc-red)',
                        marginLeft: '0.5rem'
                      }}>
                        {actionMessages[event.id]}
                      </span>
                    )}
                  </div>
                ) : (
                  // Other roles: keep existing behavior (bazaar or trip)
                  event.type === 'trip' ? (
                    // Only show edit link if trip hasn't started yet
                    new Date(event.startDate) > new Date() ? (
                      <Link 
                        to={`/edit-trip/${event.id}`}
                        className="btn btn-secondary"
                      >
                        Edit
                      </Link>
                    ) : (
                      <span className="text-muted" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        Trip has started
                      </span>
                    )
                  ) : (
                    // Handle bazaar and other event types for non-event office users
                    event.type === 'bazaar' ? (
                      // Only show edit link if bazaar hasn't started yet
                      new Date(event.startDate) > new Date() ? (
                        <Link 
                          to={`/edit-bazaar/${event.id}`}
                          className="btn btn-secondary"
                        >
                          Edit
                        </Link>
                      ) : (
                        <span className="text-muted" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          Bazaar has started
                        </span>
                      )
                    ) : (
                  <Link 
                    to={event.type === 'bazaar' ? `/edit-bazaar/${event.id}` : `/edit-trip/${event.id}`}
                    className="btn btn-secondary"
                  >
                    Edit
                  </Link>
                    )
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {isEditModalOpen && editingBazaar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card" style={{ width: 'min(560px, 90vw)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--white)', borderRadius: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1 }}>
              <h3 className="card-title">Edit Bazaar</h3>
              <button className="btn btn-outline" onClick={closeBazaarEdit}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <BazaarForm
                onSubmit={handleBazaarUpdate}
                loading={saving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  name: editingBazaar.name || '',
                  location: editingBazaar.location || '',
                  description: editingBazaar.description || '',
                  startDate: editingBazaar.startDate ? new Date(editingBazaar.startDate).toISOString().slice(0,16) : '',
                  endDate: editingBazaar.endDate ? new Date(editingBazaar.endDate).toISOString().slice(0,16) : '',
                  registrationDeadline: editingBazaar.registrationDeadline ? new Date(editingBazaar.registrationDeadline).toISOString().slice(0,16) : ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isConferenceModalOpen && editingConference && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card" style={{ width: 'min(560px, 90vw)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--white)', borderRadius: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1 }}>
              <h3 className="card-title">Edit Conference</h3>
              <button className="btn btn-outline" onClick={closeConferenceEdit}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {console.log('🔹 Frontend: Conference edit modal - editingConference data:', editingConference)}
              {console.log('🔹 Frontend: Conference edit modal - initialData being passed:', {
                title: editingConference.name || editingConference.title || '',
                description: editingConference.description || '',
                location: editingConference.location || '',
                agenda: editingConference.agenda || '',
                website: editingConference.website || '',
                budget: editingConference.budget || '',
                fundingSource: editingConference.fundingSource || 'GUC',
                extraResources: editingConference.extraResources || '',
                startDate: editingConference.startDate ? new Date(editingConference.startDate).toISOString().slice(0,16) : '',
                endDate: editingConference.endDate ? new Date(editingConference.endDate).toISOString().slice(0,16) : '',
                capacity: editingConference.capacity || ''
              })}
              <ConferenceForm
                onSubmit={handleConferenceUpdate}
                loading={conferenceSaving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  title: editingConference.name || editingConference.title || '',
                  description: editingConference.description || '',
                  location: editingConference.location || '',
                  agenda: editingConference.agenda || '',
                  website: editingConference.website || '',
                  budget: editingConference.budget || '',
                  fundingSource: editingConference.fundingSource || 'GUC',
                  extraResources: editingConference.extraResources || '',
                  startDate: editingConference.startDate ? new Date(editingConference.startDate).toISOString().slice(0,16) : '',
                  endDate: editingConference.endDate ? new Date(editingConference.endDate).toISOString().slice(0,16) : '',
                  capacity: editingConference.capacity || ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isTripModalOpen && editingTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card" style={{ width: 'min(560px, 90vw)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--white)', borderRadius: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1 }}>
              <h3 className="card-title">Edit Trip</h3>
              <button className="btn btn-outline" onClick={closeTripEdit}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <TripForm
                onSubmit={handleTripUpdate}
                loading={tripSaving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  name: editingTrip.name || editingTrip.title || '',
                  location: editingTrip.location || '',
                  price: editingTrip.price || '',
                  description: editingTrip.description || '',
                  startDate: editingTrip.startDate ? new Date(editingTrip.startDate).toISOString().slice(0,16) : '',
                  endDate: editingTrip.endDate ? new Date(editingTrip.endDate).toISOString().slice(0,16) : '',
                  capacity: editingTrip.capacity || '',
                  registrationDeadline: editingTrip.registrationDeadline ? new Date(editingTrip.registrationDeadline).toISOString().slice(0,16) : ''
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsList;

// Modal styles are derived from existing CSS utility classes; inline styles ensure no global CSS needed
// Inline edit modal rendering appended at end of component tree