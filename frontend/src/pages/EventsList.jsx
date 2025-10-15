import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApiService } from '../api/eventsApi';
import '../styles/EventsList.css';

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, bazaars, trips

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      // This will need to be updated when your team adds the backend
      // For now, we'll use mock data
      const mockEvents = [
        {
          id: 1,
          name: 'Spring Bazaar',
          type: 'bazaar',
          location: 'Main Campus',
          startDate: '2024-12-15T10:00:00',
          endDate: '2024-12-15T18:00:00',
          description: 'Annual spring bazaar with food and games'
        },
        {
          id: 2, 
          name: 'Mountain Trip',
          type: 'trip',
          location: 'Sinai',
          price: 150,
          capacity: 30,
          startDate: '2024-12-20T08:00:00',
          endDate: '2024-12-22T20:00:00',
          description: 'Weekend mountain hiking trip'
        }
      ];
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

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
        
        <div className="events-actions">
          <Link to="/create-bazaar" className="btn btn-primary">
            Create New Bazaar
          </Link>
          <Link to="/create-trip" className="btn btn-primary">
            Create New Trip
          </Link>
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
        </div>
      </div>

      <div className="events-list">
        {filteredEvents.length === 0 ? (
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
                
                {event.type === 'trip' && (
                  <div className="trip-details">
                    <p>💰 Price: ${event.price}</p>
                    <p>👥 Capacity: {event.capacity} people</p>
                  </div>
                )}
              </div>
              
              <div className="event-actions">
                <Link 
                  to={event.type === 'bazaar' ? `/edit-bazaar/${event.id}` : `/edit-trip/${event.id}`}
                  className="btn btn-secondary"
                >
                  Edit
                </Link>
                <button className="btn btn-outline">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsList;