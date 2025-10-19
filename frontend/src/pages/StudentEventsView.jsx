import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApiService } from '../api/eventsApi';
import { bazaarApi, tripApi } from '../api/eventManagementApi';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import { useAuth } from '../contexts/AuthContext';
import '../styles/StudentEventsView.css';

const StudentEventsView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      console.log('🔍 Frontend search query:', searchQuery);
      console.log('🔍 Frontend filter:', filter);
      console.log('🔍 User type:', user?.userType);
      const result = await eventsApiService.getStudentEvents({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      
      if (result.success) {
        console.log('🔍 Student events data:', result.data);
        console.log('🔍 Number of events received:', result.data?.length);
        console.log('🔍 Workshop events:', result.data?.filter(ev => ev.type === 'workshop'));
        const mapped = (result.data || []).map(ev => ({
          id: ev._id || ev.id,
          title: ev.title,
          type: ev.type,
          status: ev.status || 'pending',
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          registeredCount: ev.registeredCount,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          faculty: ev.faculty,
          professors: ev.professors,
          bannerFile: ev.bannerFile,
          creatorName: ev.creatorName,
          creatorRole: ev.creatorRole,
          vendors: ev.vendors || []
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
  }, [searchQuery, filter]);

  useEffect(() => {
    loadEvents();
  }, [filter, loadEvents]);

  const handleSearch = () => {
    setLoading(true);
    loadEvents();
  };

  const handleRegisterClick = (event) => {
    setRegistrationEvent(event);
    setShowRegistrationForm(true);
  };

  const handleEditClick = (event) => {
    // Open edit modal for bazaar, trip, and conference
    if (event.type === 'bazaar' || event.type === 'trip' || event.type === 'conference') {
      setEditEvent(event);
      
      // Use different field names based on event type
      if (event.type === 'conference') {
        setEditFormData({
          title: event.title || '',  // Use 'title' for conferences
          location: event.location || '',
          description: event.description || '',
          startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
          endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
          capacity: event.capacity || '',
          price: event.price || '',
          agenda: event.agenda || '',
          website: event.website || '',
          budget: event.budget || '',
          fundingSource: event.fundingSource || 'GUC',
          extraResources: event.extraResources || ''
        });
      } else {
        // For bazaars and trips, use 'name' field
        setEditFormData({
          name: event.title || '',
          location: event.location || '',
          description: event.description || '',
          startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
          endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
          capacity: event.capacity || '',
          price: event.price || ''
        });
      }
      
      setShowEditForm(true);
    } else if (event.type === 'booth') {
      // For booths, show alert that booth editing is not yet implemented
      alert('Booth editing functionality is not yet implemented');
    }
  };

  const handleStatusUpdate = async (eventId, newStatus) => {
    try {
      setLoading(true);
      const result = await eventsApiService.updateEventStatus(eventId, { status: newStatus });
      
      if (result.success) {
        // Refresh the events list to show updated status
        await loadEvents();
        alert(`Workshop ${newStatus} successfully!`);
      } else {
        alert(`Failed to ${newStatus} workshop: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating workshop status:', error);
      alert(`Error updating workshop status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = (registrationData) => {
    console.log('Registration successful:', registrationData);
    // You could show a success message or refresh the events list
  };

  const handleCloseRegistrationForm = () => {
    setShowRegistrationForm(false);
    setRegistrationEvent(null);
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (!editEvent) return;

    setSaving(true);
    try {
      let result;
      if (editEvent.type === 'bazaar') {
        result = await bazaarApi.update(editEvent.id, editFormData);
      } else if (editEvent.type === 'trip') {
        // For trips, use the trip API
        result = await tripApi.update(editEvent.id, editFormData);
      } else if (editEvent.type === 'conference') {
        // For conferences, we'll use the events API
        result = await eventsApiService.updateEvent(editEvent.id, editFormData);
      }

      if (result.success || result.message?.includes('successfully') || result.msg?.includes('successfully')) {
        alert(`${editEvent.type.charAt(0).toUpperCase() + editEvent.type.slice(1)} updated successfully!`);
        setShowEditForm(false);
        setEditEvent(null);
        setEditFormData({});
        // Refresh the events list
        await loadEvents();
      } else {
        alert(`Error updating ${editEvent.type}: ${result.message || result.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert(`Error updating ${editEvent.type}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditEvent(null);
    setEditFormData({});
  };

  const handleDeleteEvent = async (event) => {
    if (!event) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await eventsApiService.deleteEvent(event.id);
      
      if (result.success) {
        alert(`${event.type.charAt(0).toUpperCase() + event.type.slice(1)} deleted successfully!`);
        // Refresh the events list
        await loadEvents();
      } else {
        alert(`Error deleting ${event.type}: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Error deleting ${event.type}: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilEvent = (dateString) => {
    if (!dateString) return null;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null; // Event already passed
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#4CAF50',
      trip: '#2196F3',
      sports: '#FF9800',
      seminar: '#9C27B0',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      other: '#757575'
    };
    return colors[type] || colors.other;
  };

  const EventCard = ({ event }) => (
    <div className="event-card" onClick={() => setSelectedEvent(event)}>
      <div className="event-header">
        <div className="event-type-badge" style={{ backgroundColor: getEventTypeColor(event.type) }}>
          {event.type.toUpperCase()}
        </div>
        <div className="event-status">
          {event.status === 'approved' ? '✅ Approved' : 
           event.status === 'rejected' ? '❌ Rejected' : 
           event.status === 'pending' ? '⏳ Pending' : 
           event.status || '⏳ Pending'}
        </div>
      </div>
      
      <div className="event-countdown">
        <span className="countdown-text">{getDaysUntilEvent(event.startDate)}</span>
      </div>
      
      <h3 className="event-title">{event.title}</h3>
      
      <div className="event-details">
        <div className="detail-item">
          <span className="detail-label">📅 Date:</span>
          <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">📍 Location:</span>
          <span>{event.location}</span>
        </div>
        {event.registrationDeadline && (
          <div className="detail-item">
            <span className="detail-label">⏰ Registration Deadline:</span>
            <span>{formatDate(event.registrationDeadline)}</span>
          </div>
        )}
        {event.price && (
          <div className="detail-item">
            <span className="detail-label">💰 Price:</span>
            <span>${event.price}</span>
          </div>
        )}
        {event.capacity && (
          <div className="detail-item">
            <span className="detail-label">👥 Capacity:</span>
            <span>{event.registeredCount || 0}/{event.capacity}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="event-description">{event.description}</p>
      )}

      {event.type === 'bazaar' && event.vendors && event.vendors.length > 0 && (
        <div className="vendors-preview">
          <span className="vendors-count">🏪 {event.vendors.length} vendor{event.vendors.length !== 1 ? 's' : ''} participating</span>
        </div>
      )}

      {event.type === 'booth' && event.extraResources && (
        <div className="booth-details">
          {(() => {
            try {
              const boothData = JSON.parse(event.extraResources);
              return (
                <div className="booth-info">
                  {boothData.boothSize && <span className="booth-detail">📏 Size: {boothData.boothSize}</span>}
                  {boothData.durationWeeks && <span className="booth-detail">⏱️ Duration: {boothData.durationWeeks} weeks</span>}
                  {boothData.boothLocation && <span className="booth-detail">📍 Location: {boothData.boothLocation}</span>}
                  {boothData.attendees && boothData.attendees.length > 0 && (
                    <span className="booth-detail">👥 Attendees: {boothData.attendees.length} registered</span>
                  )}
                </div>
              );
            } catch (e) {
              return null;
            }
          })()}
        </div>
      )}

      {event.type === 'booth' && event.vendors && event.vendors.length > 0 && (
        <div className="vendors-preview">
          <span className="vendors-count">🏪 {event.vendors.length} vendor{event.vendors.length !== 1 ? 's' : ''} participating</span>
        </div>
      )}

      {event.creatorName && (
        <div className="event-creator">
          <span className="detail-label">👤 Organized by:</span>
          <span className="creator-name">{event.creatorName}</span>
          <span className="creator-role">({event.creatorRole})</span>
        </div>
      )}

      {(event.type === 'workshop' || event.type === 'trip') && !(user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
        <div className="registration-section">
          <button 
            className="register-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleRegisterClick(event);
            }}
          >
            📝 Register for {event.type === 'workshop' ? 'Workshop' : 'Trip'}
          </button>
        </div>
      )}

      {(event.type === 'bazaar' || event.type === 'trip' || event.type === 'conference' || event.type === 'booth') && (user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
        <div className="edit-section">
          <button 
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(event);
            }}
          >
            ✏️ Edit {event.type === 'bazaar' ? 'Bazaar' : event.type === 'trip' ? 'Trip' : event.type === 'conference' ? 'Conference' : 'Booth'}
          </button>
          <button 
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEvent(event);
            }}
            disabled={deleting}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
              marginLeft: '8px'
            }}
          >
            {deleting ? '🗑️ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      )}

      {event.type === 'workshop' && (user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
        <div className="status-section">
          <div className="status-buttons">
            <button 
              className="accept-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusUpdate(event.id, 'approved');
              }}
              disabled={event.status === 'approved'}
            >
              ✅ Accept
            </button>
            <button 
              className="reject-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusUpdate(event.id, 'rejected');
              }}
              disabled={event.status === 'rejected'}
            >
              ❌ Reject
            </button>
          </div>
          <div className="current-status">
            <span className={`status-badge ${event.status}`}>
              Status: {event.status === 'approved' ? '✅ Approved' : 
                      event.status === 'rejected' ? '❌ Rejected' : 
                      event.status === 'pending' ? '⏳ Pending' : 
                      event.status || '⏳ Pending'}
            </span>
          </div>
          <div className="delete-section" style={{ marginTop: '8px' }}>
            <button 
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEvent(event);
              }}
              disabled={deleting}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1,
                fontSize: '12px'
              }}
            >
              {deleting ? '🗑️ Deleting...' : '🗑️ Delete Workshop'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const EventModal = ({ event, onClose }) => {
    if (!event) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{event.title}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="event-type-badge" style={{ backgroundColor: getEventTypeColor(event.type) }}>
              {event.type.toUpperCase()}
            </div>
            
            <div className="event-countdown-modal">
              <span className="countdown-text">{getDaysUntilEvent(event.startDate)}</span>
            </div>
            
            <div className="event-info-grid">
              <div className="info-section">
                <h3>📅 Event Details</h3>
                <div className="detail-item">
                  <span className="detail-label">Start Date:</span>
                  <span>{formatDate(event.startDate)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">End Date:</span>
                  <span>{formatDate(event.endDate)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span>{event.location}</span>
                </div>
                {event.registrationDeadline && (
                  <div className="detail-item">
                    <span className="detail-label">Registration Deadline:</span>
                    <span>{formatDate(event.registrationDeadline)}</span>
                  </div>
                )}
              </div>

              {(event.price || event.capacity) && (
                <div className="info-section">
                  <h3>💰 Registration Info</h3>
                  {event.price && (
                    <div className="detail-item">
                      <span className="detail-label">Price:</span>
                      <span>${event.price}</span>
                    </div>
                  )}
                  {event.capacity && (
                    <div className="detail-item">
                      <span className="detail-label">Capacity:</span>
                      <span>{event.registeredCount || 0}/{event.capacity}</span>
                    </div>
                  )}
                </div>
              )}

              {event.creatorName && (
                <div className="info-section">
                  <h3>👤 Organizer</h3>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span>{event.creatorName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Role:</span>
                    <span>{event.creatorRole}</span>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="info-section">
                <h3>📝 Description</h3>
                <p className="event-description">{event.description}</p>
              </div>
            )}

            {event.type === 'bazaar' && event.vendors && event.vendors.length > 0 && (
              <div className="info-section">
                <h3>🏪 Participating Vendors</h3>
                <div className="vendors-grid">
                  {event.vendors.map((vendor, index) => (
                    <div key={vendor.id || index} className="vendor-card">
                      <h4>{vendor.companyName}</h4>
                      {vendor.email && <p className="vendor-email">{vendor.email}</p>}
                      {vendor.boothSize && <p className="vendor-booth">Booth Size: {vendor.boothSize}</p>}
                      {vendor.attendees && vendor.attendees.length > 0 && (
                        <div className="vendor-attendees">
                          <p className="attendees-label">Attendees:</p>
                          <ul>
                            {vendor.attendees.map((attendee, idx) => (
                              <li key={idx}>{attendee.name} ({attendee.email})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.type === 'booth' && event.vendors && event.vendors.length > 0 && (
              <div className="info-section">
                <h3>🏪 Participating Vendors</h3>
                <div className="vendors-grid">
                  {event.vendors.map((vendor, index) => (
                    <div key={vendor.id || index} className="vendor-card">
                      <h4>{vendor.companyName || vendor.name}</h4>
                      {vendor.email && <p className="vendor-email">{vendor.email}</p>}
                      {vendor.contactName && vendor.contactName !== vendor.companyName && (
                        <p className="vendor-contact">Contact: {vendor.contactName}</p>
                      )}
                      {vendor.boothSize && <p className="vendor-booth">Booth Size: {vendor.boothSize}</p>}
                      {vendor.durationWeeks && <p className="vendor-duration">Duration: {vendor.durationWeeks} weeks</p>}
                      {vendor.boothLocation && <p className="vendor-location">Location: {vendor.boothLocation}</p>}
                      {vendor.attendees && vendor.attendees.length > 0 && (
                        <div className="vendor-attendees">
                          <p className="attendees-label">Attendees:</p>
                          <ul>
                            {vendor.attendees.map((attendee, idx) => (
                              <li key={idx}>{attendee.name} ({attendee.email})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(event.agenda || event.website || event.faculty || event.professors) && (
              <div className="info-section">
                <h3>📋 Additional Information</h3>
                {event.agenda && (
                  <div className="detail-item">
                    <span className="detail-label">Agenda:</span>
                    <p>{event.agenda}</p>
                  </div>
                )}
                {event.website && (
                  <div className="detail-item">
                    <span className="detail-label">Website:</span>
                    <a href={event.website} target="_blank" rel="noopener noreferrer">{event.website}</a>
                  </div>
                )}
                {event.faculty && (
                  <div className="detail-item">
                    <span className="detail-label">Faculty:</span>
                    <span>{event.faculty}</span>
                  </div>
                )}
                {event.professors && (
                  <div className="detail-item">
                    <span className="detail-label">Professors:</span>
                    <span>{event.professors}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="student-events-container">
        <div className="loading">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="student-events-container">
      <div className="page-header">
        <h1>📅 Upcoming Events</h1>
        <p>View all upcoming events and participating vendors for bazaars</p>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by event name, professor name, location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍 Search</button>
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setLoading(true);
                loadEvents();
              }}
              className="clear-search-btn"
            >
              ✕ Clear
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Events
          </button>
          <button 
            className={filter === 'bazaar' ? 'active' : ''} 
            onClick={() => setFilter('bazaar')}
          >
            Bazaars
          </button>
          <button 
            className={filter === 'trip' ? 'active' : ''} 
            onClick={() => setFilter('trip')}
          >
            Trips
          </button>
          <button 
            className={filter === 'workshop' ? 'active' : ''} 
            onClick={() => setFilter('workshop')}
          >
            Workshops
          </button>
          <button 
            className={filter === 'conference' ? 'active' : ''} 
            onClick={() => setFilter('conference')}
          >
            Conferences
          </button>
          <button 
            className={filter === 'booth' ? 'active' : ''} 
            onClick={() => setFilter('booth')}
          >
            Booths
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="search-results-info">
          <p>Found {events.length} upcoming event{events.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
            {filter !== 'all' && ` in ${filter} category`}
          </p>
        </div>
      )}

      <div className="events-grid">
        {events.length === 0 ? (
          <div className="no-events">
            <p>No upcoming events found matching your criteria.</p>
            <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '10px' }}>
              Only events that haven't started yet are shown.
            </p>
            <button onClick={() => { setSearchQuery(''); setFilter('all'); setLoading(true); loadEvents(); }}>
              Show All Upcoming Events
            </button>
          </div>
        ) : (
          events.map(event => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* Registration Form Modal */}
      {showRegistrationForm && registrationEvent && (
        <div className="modal-overlay" onClick={handleCloseRegistrationForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <StudentRegistrationForm
              event={registrationEvent}
              onClose={handleCloseRegistrationForm}
              onSuccess={handleRegistrationSuccess}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && editEvent && (
        <div className="modal-overlay" onClick={handleCloseEditForm}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {editEvent.type === 'bazaar' ? 'Bazaar' : editEvent.type === 'trip' ? 'Trip' : 'Conference'}</h2>
              <button 
                className="close-btn" 
                onClick={handleCloseEditForm}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="edit-form" onSubmit={handleEditFormSubmit}>
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input 
                    type="text" 
                    id="title" 
                    value={editFormData.title || editFormData.name || ''}
                    onChange={(e) => handleEditFormChange(editEvent.type === 'conference' ? 'title' : 'name', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea 
                    id="description" 
                    value={editFormData.description}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Location:</label>
                  <input 
                    type="text" 
                    id="location" 
                    value={editFormData.location}
                    onChange={(e) => handleEditFormChange('location', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date:</label>
                  <input 
                    type="datetime-local" 
                    id="startDate" 
                    value={editFormData.startDate}
                    onChange={(e) => handleEditFormChange('startDate', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date:</label>
                  <input 
                    type="datetime-local" 
                    id="endDate" 
                    value={editFormData.endDate}
                    onChange={(e) => handleEditFormChange('endDate', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registrationDeadline">Registration Deadline:</label>
                  <input 
                    type="datetime-local" 
                    id="registrationDeadline" 
                    value={editFormData.registrationDeadline}
                    onChange={(e) => handleEditFormChange('registrationDeadline', e.target.value)}
                    className="form-input"
                  />
                </div>
                {(editEvent.type === 'trip' || editEvent.type === 'conference') && (
                  <>
                    <div className="form-group">
                      <label htmlFor="capacity">Capacity:</label>
                      <input 
                        type="number" 
                        id="capacity" 
                        value={editFormData.capacity}
                        onChange={(e) => handleEditFormChange('capacity', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price">Price:</label>
                      <input 
                        type="number" 
                        id="price" 
                        step="0.01"
                        value={editFormData.price}
                        onChange={(e) => handleEditFormChange('price', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                {/* Additional fields for conferences */}
                {editEvent.type === 'conference' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="agenda">Agenda:</label>
                      <textarea 
                        id="agenda" 
                        value={editFormData.agenda || ''}
                        onChange={(e) => handleEditFormChange('agenda', e.target.value)}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="website">Website:</label>
                      <input 
                        type="url" 
                        id="website" 
                        value={editFormData.website || ''}
                        onChange={(e) => handleEditFormChange('website', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="budget">Budget:</label>
                      <input 
                        type="number" 
                        id="budget" 
                        step="0.01"
                        value={editFormData.budget || ''}
                        onChange={(e) => handleEditFormChange('budget', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="fundingSource">Funding Source:</label>
                      <select 
                        id="fundingSource" 
                        value={editFormData.fundingSource || 'GUC'}
                        onChange={(e) => handleEditFormChange('fundingSource', e.target.value)}
                        className="form-input"
                      >
                        <option value="GUC">GUC</option>
                        <option value="External">External</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="extraResources">Extra Resources:</label>
                      <textarea 
                        id="extraResources" 
                        value={editFormData.extraResources || ''}
                        onChange={(e) => handleEditFormChange('extraResources', e.target.value)}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCloseEditForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEventsView;