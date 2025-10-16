import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { eventsApiService } from '../api/eventsApi';

const EVENT_TYPES = ['Workshop', 'Trip', 'Bazaar', 'Booth', 'Seminar', 'Club Event', 'Academic Talk'];

const Events = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [whenFilter, setWhenFilter] = useState('upcoming');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  const loadEvents = useCallback(async () => {
    setLoading(true); setError('');
    const result = await eventsApiService.getPublicEvents({
      q: searchQuery,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      when: whenFilter,
    });
    if (result.success) {
      setEvents(result.data.events || []);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [searchQuery, typeFilter, whenFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    // In case backend doesn’t filter everything yet
    let list = events || [];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.professorName || '').toLowerCase().includes(q) ||
        (e.createdByName || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(e => (e.type || e.category) === typeFilter);
    }
    // Sort by start date ascending
    return [...list].sort((a,b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date));
  }, [events, searchQuery, typeFilter]);

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
              <input
                className="form-input"
                placeholder="Search by event or professor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={typeFilter} onChange={(e)=> setTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    {EVENT_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">When</label>
                  <select className="form-input" value={whenFilter} onChange={(e)=> setWhenFilter(e.target.value)}>
                    <option value="upcoming">Upcoming</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="past">Past</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="form-group" style={{ alignSelf: 'end' }}>
                  <button className="btn btn-primary" onClick={loadEvents}>Search</button>
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
                const vendorSummary = Array.isArray(ev.vendors) && ev.vendors.length
                  ? `${ev.vendors.length} vendor${ev.vendors.length > 1 ? 's' : ''}`
                  : null;
                return (
                  <div key={id} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                    <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'grid', gap: '0.25rem', flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--charcoal-black)', fontSize: 18 }}>{ev.title}</div>
                          <div style={{ color: 'var(--text-light)', fontSize: 14 }}>
                            {ev.description}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: 12 }}>
                            📅 {start.toLocaleDateString()} • ⏰ {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • 📍 {ev.location}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: 12 }}>
                            👤 {ev.professorName || ev.createdByName || ev.organizer}
                            {vendorSummary ? ` • 🛍️ ${vendorSummary}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{ev.type || ev.category}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>👥 {ev.registeredCount || 0}{ev.capacity ? `/${ev.capacity}` : ''}</div>
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


