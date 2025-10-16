import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';

const ProfessorAllEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [bazaars, setBazaars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [registeringIds, setRegisteringIds] = useState({});
  const [messages, setMessages] = useState({}); // id -> success/error message

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load both events and bazaars in parallel
      const [eventsResult, bazaarsResult] = await Promise.all([
        professorApiService.getAllEvents({ q: searchQuery, type: typeFilter === 'all' ? undefined : typeFilter }),
        professorApiService.getAllBazaars({ q: searchQuery })
      ]);
      
      if (eventsResult.success) {
        const eventsList = Array.isArray(eventsResult.data) ? eventsResult.data : (eventsResult.data.events || []);
        setEvents(eventsList);
      } else {
        setError(eventsResult.message);
      }
      
      if (bazaarsResult.success) {
        const bazaarsList = Array.isArray(bazaarsResult.data) ? bazaarsResult.data : [];
        setBazaars(bazaarsList);
      } else {
        setError(bazaarsResult.message || 'Failed to load bazaars');
      }
    } catch (e) {
      setError('Failed to load events and bazaars');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(evt =>
        (evt.title || '').toLowerCase().includes(q) ||
        (evt.description || '').toLowerCase().includes(q) ||
        (evt.location || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(evt => (evt.type || 'other') === typeFilter);
    }
    return filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [events, searchQuery, typeFilter]);

  const filteredBazaars = useMemo(() => {
    let filtered = bazaars;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(bazaar =>
        (bazaar.name || '').toLowerCase().includes(q) ||
        (bazaar.description || '').toLowerCase().includes(q) ||
        (bazaar.location || '').toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [bazaars, searchQuery]);

  const handleRegister = async (eventId, type = 'event') => {
    try {
      setRegisteringIds(prev => ({ ...prev, [eventId]: true }));
      setMessages(prev => ({ ...prev, [eventId]: '' }));
      
      const result = type === 'bazaar' 
        ? await professorApiService.registerForBazaar(eventId)
        : await professorApiService.registerForEvent(eventId);
        
      if (result.success) {
        setMessages(prev => ({ ...prev, [eventId]: 'Registered successfully' }));
      } else {
        setMessages(prev => ({ ...prev, [eventId]: result.message || 'Registration failed' }));
      }
    } catch (e) {
      setMessages(prev => ({ ...prev, [eventId]: 'Registration failed' }));
    } finally {
      setRegisteringIds(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value || '';
    }
  };

  const TypeBadge = ({ type }) => (
    <span style={{
      padding: '2px 8px',
      background: 'var(--light-gray)',
      border: '1px solid var(--medium-gray)',
      borderRadius: '999px',
      fontSize: 12,
      color: 'var(--text-light)'
    }}>{(type || 'other').toUpperCase()}</span>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>All Events & Bazaars</h1>
              <p className="card-subtitle">Browse and register for approved events and bazaars. Your own approved events show here too.</p>
            </div>
            <div style={{
              padding: '4px 10px',
              background: 'var(--light-gray)',
              border: '1px solid var(--medium-gray)',
              borderRadius: '999px',
              color: 'var(--text-light)',
              fontSize: 12
            }}>{filteredEvents.length + filteredBazaars.length} results</div>
          </div>

          <div className="card" style={{ background: 'var(--light-gray)', padding: '0.75rem', border: '1px solid var(--medium-gray)', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'center' }}>
              <input
                placeholder="Search by title, description, or location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
                <option value="all">All Types</option>
                <option value="seminar">Seminar</option>
                <option value="workshop">Workshop</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
              <button className="btn" onClick={loadEvents}>Refresh</button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          {loading ? (
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                padding: '1rem'
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: '6px', padding: '1rem' }}>
                    <div style={{ height: 16, background: 'var(--light-gray)', marginBottom: 8, borderRadius: 4 }} />
                    <div style={{ height: 12, background: 'var(--light-gray)', marginBottom: 6, borderRadius: 4, width: '60%' }} />
                    <div style={{ height: 12, background: 'var(--light-gray)', marginBottom: 12, borderRadius: 4, width: '40%' }} />
                    <div style={{ height: 36, background: 'var(--light-gray)', borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
                padding: '1rem'
              }}>
                {filteredEvents.length === 0 && filteredBazaars.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>
                    No events or bazaars found. Try adjusting filters.
                  </div>
                )}
                
                {/* Events Section */}
                {filteredEvents.map(evt => (
                  <div key={`event-${evt._id}`} style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal-black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</div>
                        <div style={{ color: 'var(--text-light)', fontSize: 13, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{formatDateTime(evt.startDate)}</span>
                          <span>•</span>
                          <span>{evt.location || 'TBA'}</span>
                          <span>•</span>
                          <TypeBadge type={evt.type} />
                          <span style={{ background: 'var(--guc-red)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: 10 }}>EVENT</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ color: 'var(--charcoal-black)', fontSize: 14, lineHeight: 1.4, maxHeight: 56, overflow: 'hidden' }}>
                      {evt.description || ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        Capacity: {evt.capacity || 'N/A'} • Registered: {evt.registeredCount || 0}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {new Date(evt.startDate) > new Date() && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRegister(evt._id, 'event')}
                            disabled={!!registeringIds[evt._id]}
                          >
                            {registeringIds[evt._id] ? 'Registering...' : 'Register'}
                          </button>
                        )}
                        {messages[evt._id] && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>{messages[evt._id]}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Bazaars Section */}
                {filteredBazaars.map(bazaar => (
                  <div key={`bazaar-${bazaar._id}`} style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal-black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bazaar.name}</div>
                        <div style={{ color: 'var(--text-light)', fontSize: 13, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{formatDateTime(bazaar.startDate)}</span>
                          <span>•</span>
                          <span>{bazaar.location || 'TBA'}</span>
                          <span>•</span>
                          <span style={{ background: 'var(--success-green)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: 10 }}>BAZAAR</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ color: 'var(--charcoal-black)', fontSize: 14, lineHeight: 1.4, maxHeight: 56, overflow: 'hidden' }}>
                      {bazaar.description || ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        Registration Deadline: {formatDateTime(bazaar.registrationDeadline)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {new Date(bazaar.startDate) > new Date() && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRegister(bazaar._id, 'bazaar')}
                            disabled={!!registeringIds[bazaar._id]}
                          >
                            {registeringIds[bazaar._id] ? 'Registering...' : 'Register'}
                          </button>
                        )}
                        {messages[bazaar._id] && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>{messages[bazaar._id]}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorAllEvents;


