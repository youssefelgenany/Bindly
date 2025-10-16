import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApiService } from '../api/eventsApi';
import { useAuth } from '../contexts/AuthContext';
import '../styles/EventsList.css';
import BazaarForm from '../components/BazaarForm';
import ConferenceForm from '../components/ConferenceForm';

const EventsList = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, bazaars, trips, conferences, workshops
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBazaar, setEditingBazaar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isConferenceModalOpen, setIsConferenceModalOpen] = useState(false);
  const [editingConference, setEditingConference] = useState(null);
  const [conferenceSaving, setConferenceSaving] = useState(false);

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
        const mapped = (result.data || []).map(ev => ({
          id: ev._id || ev.id,
          name: ev.title || ev.name,
          type: ev.type,
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          professorName: ev.creatorName || ev.professorName || ev.createdByName || ev.organizer,
          creatorFirstName: ev.creatorFirstName || ev.createdBy?.firstName,
          creatorLastName: ev.creatorLastName || ev.createdBy?.lastName
        }));
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
          type: ev.type,
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          professorName: ev.creatorName || ev.professorName || ev.createdByName || ev.organizer,
          creatorFirstName: ev.creatorFirstName || ev.createdBy?.firstName,
          creatorLastName: ev.creatorLastName || ev.createdBy?.lastName
        }));
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
    if (filter === 'all') return true;
    return event.type === filter;
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
      setConferenceSaving(true);
      // Use events API to update conference
      const result = await eventsApiService.getAllEventsAuthenticated({});
      // For now, we'll simulate the update - you may need to add a specific conference update API
      console.log('Conference update data:', formData);
      await loadEvents();
      closeConferenceEdit();
    } catch (e) {
      console.error('Failed to update conference:', e);
    } finally {
      setConferenceSaving(false);
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
                <h3>{event.name}</h3>
                <p className="event-type">{event.type.toUpperCase()}</p>
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
                  event.type === 'bazaar' ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => openBazaarEdit(event)}
                    >
                      Edit
                    </button>
                  ) : event.type === 'conference' ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => openConferenceEdit(event)}
                    >
                      Edit
                    </button>
                  ) : null
                ) : (
                  // Other roles: keep existing behavior (bazaar or trip)
                  <Link 
                    to={event.type === 'bazaar' ? `/edit-bazaar/${event.id}` : `/edit-trip/${event.id}`}
                    className="btn btn-secondary"
                  >
                    Edit
                  </Link>
                )}
                <button className="btn btn-outline" onClick={async () => {
                  if (!window.confirm('Delete this event?')) return;
                  try {
                    const res = await eventsApiService.deleteEvent(event.id);
                    if (!res.success) {
                      alert(res.message || 'Failed to delete event');
                    }
                    await loadEvents();
                  } catch (e) {
                    console.error('Delete failed', e);
                    alert('Delete failed');
                  }
                }}>
                  Delete
                </button>
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
              <ConferenceForm
                onSubmit={handleConferenceUpdate}
                loading={conferenceSaving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  title: editingConference.name || editingConference.title || '',
                  location: editingConference.location || '',
                  agenda: editingConference.agenda || '',
                  website: editingConference.website || '',
                  budget: editingConference.budget || '',
                  fundingSource: editingConference.fundingSource || '',
                  startDate: editingConference.startDate ? new Date(editingConference.startDate).toISOString().slice(0,16) : '',
                  endDate: editingConference.endDate ? new Date(editingConference.endDate).toISOString().slice(0,16) : ''
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