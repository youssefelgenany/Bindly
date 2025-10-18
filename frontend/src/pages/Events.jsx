import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { eventsApiService } from '../api/eventsApi';
import { useAuth } from '../contexts/AuthContext';

const EVENT_TYPES = ['Workshop', 'Trip', 'Bazaar', 'Booth', 'Conference'];

const Events = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [whenFilter, setWhenFilter] = useState('upcoming');
  const [professorFilter, setProfessorFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  const loadEvents = useCallback(async () => {
    setLoading(true); 
    setError('');
    try {
      console.log('Loading events with params:', { searchQuery, typeFilter });
      const result = await eventsApiService.getAllEventsAuthenticated({
        q: searchQuery,
        type: typeFilter !== 'all' ? typeFilter.toLowerCase() : undefined,
      });
      console.log('Events API result:', result);
      if (result.success) {
        setEvents(result.data || []);
        console.log('Events loaded successfully:', result.data?.length || 0, 'events');
      } else {
        console.error('Events API error:', result.message);
        setError(result.message);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    }
    setLoading(false);
  }, [searchQuery, typeFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    // In case backend doesn't filter everything yet
    let list = events || [];
    
    // Search by event name or professor name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.professorName || '').toLowerCase().includes(q) ||
        (e.createdByName || '').toLowerCase().includes(q) ||
        (e.creatorName || '').toLowerCase().includes(q) ||
        (e.organizer || '').toLowerCase().includes(q)
      );
    }
    
    // Filter by professor name specifically
    if (professorFilter.trim()) {
      const prof = professorFilter.trim().toLowerCase();
      list = list.filter(e =>
        (e.professorName || '').toLowerCase().includes(prof) ||
        (e.createdByName || '').toLowerCase().includes(prof) ||
        (e.creatorName || '').toLowerCase().includes(prof) ||
        (e.organizer || '').toLowerCase().includes(prof)
      );
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      list = list.filter(e => (e.type || e.category) === typeFilter.toLowerCase());
    }
    
    // Filter by time period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (whenFilter === 'today') {
      list = list.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= today && eventDate < tomorrow;
      });
    } else if (whenFilter === 'this-week') {
      list = list.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= today && eventDate < nextWeek;
      });
    } else if (whenFilter === 'upcoming') {
      list = list.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= today;
      });
    } else if (whenFilter === 'past') {
      list = list.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate < today;
      });
    }
    // 'all' shows everything, no filtering needed
    
    // Sort by start date ascending
    return [...list].sort((a,b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date));
  }, [events, searchQuery, typeFilter, professorFilter, whenFilter]);

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Explore Events</h1>
          </div>

          {/* Search & Filters */}
          <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
            <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                  className="form-input"
                  placeholder="Search by event name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder="Search by professor name..."
                  value={professorFilter}
                  onChange={(e) => setProfessorFilter(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select className="form-input" value={typeFilter} onChange={(e)=> setTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    {EVENT_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Time Period</label>
                  <select className="form-input" value={whenFilter} onChange={(e)=> setWhenFilter(e.target.value)}>
                    <option value="upcoming">Upcoming</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="past">Past</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="form-group" style={{ alignSelf: 'end' }}>
                  <button className="btn btn-primary" onClick={loadEvents}>Refresh</button>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            {loading ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <div style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading events...</div>
                </div>
              </div>
            ) : error ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem', color: 'var(--guc-red)', textAlign: 'center' }}>{error}</div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>No events found.</div>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const id = ev._id || ev.id;
                const start = new Date(ev.startDate || ev.date);
                const end = ev.endDate ? new Date(ev.endDate) : null;
                const vendorSummary = Array.isArray(ev.vendors) && ev.vendors.length
                  ? `${ev.vendors.length} vendor${ev.vendors.length > 1 ? 's' : ''}`
                  : null;
                
                // Format vendor details
                const vendorDetails = Array.isArray(ev.vendors) && ev.vendors.length > 0
                  ? ev.vendors.map(v => v.name || v.companyName || 'Vendor').join(', ')
                  : null;
                
                return (
                  <div key={id} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                    <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'grid', gap: '0.5rem', flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--charcoal-black)', fontSize: 20 }}>{ev.title}</div>
                          <div style={{ color: 'var(--text-light)', fontSize: 14, lineHeight: '1.4' }}>
                            {ev.description}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                            📅 {start.toLocaleDateString()} • ⏰ {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {end && ` - ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            {ev.location && ` • 📍 ${ev.location}`}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                            👤 <strong>Organizer:</strong> {ev.creatorName || ev.professorName || ev.createdByName || ev.organizer || 'TBD'}
                          </div>
                          {ev.vendors && ev.vendors.length > 0 && (
                            <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                              🛍️ <strong>Participating Vendors ({ev.vendors.length}):</strong>
                              <div style={{ marginTop: '4px', display: 'grid', gap: '2px' }}>
                                {ev.vendors.map((vendor, idx) => (
                                  <div key={vendor._id || idx} style={{ 
                                    backgroundColor: 'var(--white)', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    border: '1px solid var(--medium-gray)'
                                  }}>
                                    <strong>{vendor.name}</strong>
                                    {vendor.contactName && vendor.contactName !== vendor.name && (
                                      <span> • Contact: {vendor.contactName}</span>
                                    )}
                                    {vendor.boothSize && (
                                      <span> • Booth: {vendor.boothSize}</span>
                                    )}
                                    {vendor.durationWeeks && (
                                      <span> • Duration: {vendor.durationWeeks} weeks</span>
                                    )}
                                    {vendor.boothLocation && (
                                      <span> • Location: {vendor.boothLocation}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {ev.agenda && (
                            <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                              📋 <strong>Agenda:</strong> {ev.agenda}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          <div style={{ 
                            fontSize: 12, 
                            color: 'var(--guc-red)', 
                            fontWeight: 600,
                            backgroundColor: 'var(--white)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            {ev.type || ev.category || 'Event'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            👥 {ev.registeredCount || 0}{ev.capacity ? `/${ev.capacity}` : ''} participants
                          </div>
                          {ev.price && (
                            <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                              💰 {ev.price}
                            </div>
                          )}
                        </div>
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
  );
};

export default Events;


