import React, { useState, useEffect } from 'react';
import { eventsApiService } from '../api/eventsApi';
import { bazaarApi } from '../api/bazaarApi';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import { useAuth } from '../contexts/AuthContext';
import '../styles/StudentEventsView.css';

const StudentEventsView = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadEvents();
  }, [filter]);

  // Auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        setLoading(true);
        loadEvents();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadEvents = async () => {
    try {
      setError('');
      console.log('🔍 Frontend search query:', searchQuery);
      const result = await eventsApiService.getStudentEvents({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      
      if (result.success) {
        console.log('🔍 Student events data:', result.data);
        const mapped = (result.data || []).map(ev => ({
          id: ev._id || ev.id,
          title: ev.title,
          type: ev.type,
          status: ev.status || 'approved',
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
  };

  const handleSearch = () => {
    setLoading(true);
    loadEvents();
  };

  const handleRegisterClick = (event) => {
    setRegistrationEvent(event);
    setShowRegistrationForm(true);
  };

  const handleEditClick = (event) => {
    setEditEvent(event);
    setShowEditForm(true);
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
          {event.status === 'approved' ? '✅ Approved' : event.status}
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

      {(event.type === 'bazaar' || event.type === 'trip' || event.type === 'conference') && (user?.userType === 'Event Office' || user?.userType === 'Events Office' || user?.userType === 'event_office' || user?.role === 'event_office' || user?.role === 'Event Office') && (
        <div className="edit-section">
          <button 
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(event);
            }}
          >
            ✏️ Edit {event.type === 'bazaar' ? 'Bazaar' : event.type === 'trip' ? 'Trip' : 'Conference'}
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
              Status: {event.status || 'pending'}
            </span>
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
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {editEvent.type === 'bazaar' ? 'Bazaar' : editEvent.type === 'trip' ? 'Trip' : 'Conference'}</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowEditForm(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="edit-form">
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input 
                    type="text" 
                    id="title" 
                    defaultValue={editEvent.title}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea 
                    id="description" 
                    defaultValue={editEvent.description}
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Location:</label>
                  <input 
                    type="text" 
                    id="location" 
                    defaultValue={editEvent.location}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date:</label>
                  <input 
                    type="datetime-local" 
                    id="startDate" 
                    defaultValue={editEvent.startDate ? new Date(editEvent.startDate).toISOString().slice(0, 16) : ''}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date:</label>
                  <input 
                    type="datetime-local" 
                    id="endDate" 
                    defaultValue={editEvent.endDate ? new Date(editEvent.endDate).toISOString().slice(0, 16) : ''}
                    className="form-input"
                  />
                </div>
                {editEvent.type === 'trip' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="capacity">Capacity:</label>
                      <input 
                        type="number" 
                        id="capacity" 
                        defaultValue={editEvent.capacity}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price">Price:</label>
                      <input 
                        type="number" 
                        id="price" 
                        step="0.01"
                        defaultValue={editEvent.price}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="registrationDeadline">Registration Deadline:</label>
                      <input 
                        type="datetime-local" 
                        id="registrationDeadline" 
                        defaultValue={editEvent.registrationDeadline ? new Date(editEvent.registrationDeadline).toISOString().slice(0, 16) : ''}
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                {editEvent.type === 'conference' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="capacity">Capacity:</label>
                      <input 
                        type="number" 
                        id="capacity" 
                        defaultValue={editEvent.capacity}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price">Price:</label>
                      <input 
                        type="number" 
                        id="price" 
                        step="0.01"
                        defaultValue={editEvent.price}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="registrationDeadline">Registration Deadline:</label>
                      <input 
                        type="datetime-local" 
                        id="registrationDeadline" 
                        defaultValue={editEvent.registrationDeadline ? new Date(editEvent.registrationDeadline).toISOString().slice(0, 16) : ''}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="website">Website:</label>
                      <input 
                        type="url" 
                        id="website" 
                        defaultValue={editEvent.website}
                        className="form-input"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="agenda">Agenda:</label>
                      <textarea 
                        id="agenda" 
                        defaultValue={editEvent.agenda}
                        className="form-textarea"
                        rows="4"
                        placeholder="Conference agenda and schedule"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="budget">Budget:</label>
                      <input 
                        type="number" 
                        id="budget" 
                        step="0.01"
                        defaultValue={editEvent.budget}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="fundingSource">Funding Source:</label>
                      <input 
                        type="text" 
                        id="fundingSource" 
                        defaultValue={editEvent.fundingSource}
                        className="form-input"
                        placeholder="e.g., University, Grant, Sponsors"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="extraResources">Extra Resources:</label>
                      <textarea 
                        id="extraResources" 
                        defaultValue={editEvent.extraResources}
                        className="form-textarea"
                        rows="3"
                        placeholder="Additional resources or requirements"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="faculty">Faculty:</label>
                      <input 
                        type="text" 
                        id="faculty" 
                        defaultValue={editEvent.faculty}
                        className="form-input"
                        placeholder="Faculty members involved"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="professors">Professors:</label>
                      <input 
                        type="text" 
                        id="professors" 
                        defaultValue={editEvent.professors}
                        className="form-input"
                        placeholder="Professor names"
                      />
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowEditForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement save functionality
                      alert('Save functionality will be implemented');
                    }}
                  >
                    Save Changes
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
