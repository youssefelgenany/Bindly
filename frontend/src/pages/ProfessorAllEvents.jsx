import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { professorApiService } from '../api/professorApi';

const ProfessorAllEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [registeringIds, setRegisteringIds] = useState({});
  const [messages, setMessages] = useState({}); // id -> success/error message
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRegisteredOnly, setShowRegisteredOnly] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(() => new Set());

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load events from events collection only
      const eventsResult = await professorApiService.getAllEvents({ q: searchQuery, name: searchQuery, type: typeFilter === 'all' ? undefined : typeFilter, status: 'all' });
      
      if (eventsResult.success) {
        const eventsList = Array.isArray(eventsResult.data) ? eventsResult.data : (eventsResult.data.events || []);
        setEvents(eventsList);
      } else {
        setError(eventsResult.message);
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

  const loadMyRegistrations = useCallback(async () => {
    try {
      const res = await professorApiService.getMyRegistrations();
      if (res.success) {
        // API returns array or { registrations }
        const regs = Array.isArray(res.data) ? res.data : (res.data.registrations || []);
        setMyRegistrations(regs);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // Keep a fast lookup of registered event IDs
  useEffect(() => {
    const ids = new Set(
      (myRegistrations || [])
        .map(r => {
          const ev = r.event;
          if (!ev) return null;
          if (typeof ev === 'string') return ev;
          return ev._id ? String(ev._id) : null;
        })
        .filter(Boolean)
    );
    setRegisteredIds(ids);
  }, [myRegistrations]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (showRegisteredOnly) {
      const registeredEventIds = new Set(
        (myRegistrations || [])
          .map(r => {
            const ev = r.event;
            if (!ev) return null;
            if (typeof ev === 'string') return ev;
            return ev._id ? String(ev._id) : null;
          })
          .filter(Boolean)
      );
      filtered = filtered.filter(evt => registeredEventIds.has(String(evt._id)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(evt =>
        (evt.title || evt.name || '').toLowerCase().includes(q) ||
        (evt.description || '').toLowerCase().includes(q) ||
        (evt.location || '').toLowerCase().includes(q) ||
        // match creator's first/last name
        (() => {
          const by = evt.createdBy || {};
          const full = (evt.creatorName || `${by.firstName || ''} ${by.lastName || ''}`).trim().toLowerCase();
          return full && full.includes(q);
        })()
      );
    }
    if (typeFilter !== 'all') {
      const typeMap = {
        workshops: 'workshop',
        trips: 'trip',
        bazaars: 'bazaar',
        booths: 'booth',
        confrence: 'conference',
        conference: 'conference'
      };
      const mapped = typeMap[typeFilter] || typeFilter;
      filtered = filtered.filter(evt => (evt.type || 'other') === mapped);
    }
    return filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [events, searchQuery, typeFilter, showRegisteredOnly, myRegistrations]);

  // No separate bazaars list; bazaars come from events collection via type 'bazaar'

  const handleRegister = async (eventId, type = 'event') => {
    try {
      setRegisteringIds(prev => ({ ...prev, [eventId]: true }));
      setMessages(prev => ({ ...prev, [eventId]: '' }));
      
      let result;
      if (type === 'bazaar') {
        result = await professorApiService.registerForBazaar(eventId);
      } else {
        // Minimal payload for professor registration
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const payload = {
          firstName: storedUser.firstName,
          lastName: storedUser.lastName,
          email: storedUser.email,
          gucId: storedUser.gucId,
        };
        result = await professorApiService.registerForEvent(eventId, payload);
      }
        
      if (result.success) {
        setMessages(prev => ({ ...prev, [eventId]: 'Registered successfully' }));
        // Mark as registered locally so button updates immediately
        setRegisteredIds(prev => new Set(prev).add(String(eventId)));
        // Best effort refresh of registrations (non-blocking)
        loadMyRegistrations();
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

  const openDetails = async (evt) => {
    try {
      setDetailsEvent(evt);
      setParticipants([]);
      if (evt.type === 'bazaar' || evt.type === 'booth') {
        setDetailsLoading(true);
        const type = evt.type;
        const url = `/api/vendor/participants?type=${encodeURIComponent(type)}&id=${encodeURIComponent(evt._id)}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
        const data = await res.json().catch(() => ({}));
        if (data && data.success && Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      }
    } catch (_) {
      // no-op
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsEvent(null);
    setParticipants([]);
  };

  return (
    <>
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
            }}>{filteredEvents.length} results</div>
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
                <option value="workshops">Workshops</option>
                <option value="trips">Trips</option>
                <option value="bazaars">Bazaars</option>
                <option value="booths">Booths</option>
                <option value="conference">Conference</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn ${!showRegisteredOnly ? 'btn-primary' : ''}`}
                  onClick={() => setShowRegisteredOnly(false)}
                >
                  All events
                </button>
                <button
                  className={`btn ${showRegisteredOnly ? 'btn-primary' : ''}`}
                  onClick={() => {
                    setShowRegisteredOnly(true);
                    if (myRegistrations.length === 0) {
                      loadMyRegistrations();
                    }
                  }}
                >
                  Registered events
                </button>
              </div>
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
                {filteredEvents.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>
                    No events found. Try adjusting filters.
                  </div>
                )}
                
                {/* Events Section (includes bazaars via type 'bazaar') */}
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
                          {(evt.createdBy || evt.creatorName) && (
                            <>
                              <span>•</span>
                              <span>
                                By <span style={{ color: 'var(--guc-red)', fontWeight: 600 }}>{(evt.creatorName || `${evt.createdBy.firstName || ''} ${evt.createdBy.lastName || ''}`.trim())}</span> ({evt.creatorRole || evt.createdBy?.userType || 'User'})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Description hidden in list; shown in details modal only */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        Capacity: {evt.capacity || 'N/A'} • Registered: {evt.registeredCount || 0}
                      </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn" onClick={() => openDetails(evt)}>View details</button>
                      {(evt.type === 'workshop' || evt.type === 'trip') && new Date(evt.startDate) > new Date() && (
                        registeredIds.has(String(evt._id)) ? (
                          <button className="btn" disabled>
                            Registered
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRegister(evt._id, 'event')}
                            disabled={!!registeringIds[evt._id]}
                          >
                            {registeringIds[evt._id] ? 'Registering...' : 'Register'}
                          </button>
                        )
                      )}
                      {messages[evt._id] && (
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{messages[evt._id]}</div>
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
    {detailsEvent && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeDetails}>
        <div className="card" style={{ width: 'min(760px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>{detailsEvent.title}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-light)', fontSize: 13 }}>
                <TypeBadge type={detailsEvent.type} />
                <span>{formatDateTime(detailsEvent.startDate)} - {formatDateTime(detailsEvent.endDate)}</span>
                <span>•</span>
                <span>{detailsEvent.location || 'TBA'}</span>
              </div>
            </div>
            <button className="btn" onClick={closeDetails}>Close</button>
          </div>
          <div className="card" style={{ background: 'var(--light-gray)' }}>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ color: 'var(--charcoal-black)' }}>{detailsEvent.description || 'No description'}</div>
              {(detailsEvent.createdBy || detailsEvent.creatorName) && (
                <div className="input" style={{ padding: 8 }}>
                  Created by: <span style={{ color: 'var(--guc-red)', fontWeight: 600 }}>{(detailsEvent.creatorName || `${detailsEvent.createdBy.firstName || ''} ${detailsEvent.createdBy.lastName || ''}`.trim())}</span> ({detailsEvent.creatorRole || detailsEvent.createdBy?.userType || 'User'})
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                <div className="input" style={{ padding: 8 }}>Capacity: {detailsEvent.capacity || 'N/A'}</div>
                <div className="input" style={{ padding: 8 }}>Registered: {detailsEvent.registeredCount || 0}</div>
                {detailsEvent.website && (<div className="input" style={{ padding: 8 }}>Website: {detailsEvent.website}</div>)}
                {detailsEvent.agenda && (<div className="input" style={{ padding: 8 }}>Agenda: {detailsEvent.agenda}</div>)}
                {detailsEvent.budget && (<div className="input" style={{ padding: 8 }}>Budget: {detailsEvent.budget}</div>)}
                {detailsEvent.fundingSource && (<div className="input" style={{ padding: 8 }}>Funding: {detailsEvent.fundingSource}</div>)}
              </div>
              {(detailsEvent.type === 'bazaar' || detailsEvent.type === 'booth') && (
                <div>
                  <h3 className="card-title" style={{ fontSize: 16 }}>Participating Vendors</h3>
                  {detailsLoading ? (
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>Loading vendors...</div>
                  ) : participants.length === 0 ? (
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>No accepted vendors yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {participants.map(p => (
                        <div key={p.id} className="input" style={{ padding: 8 }}>
                          <div style={{ fontWeight: 600 }}>{p.companyName || 'Vendor'}</div>
                          {p.email && (<div style={{ fontSize: 12, color: 'var(--text-light)' }}>{p.email}</div>)}
                          {p.boothSize && (<div style={{ fontSize: 12 }}>Booth size: {p.boothSize}</div>)}
                          {Array.isArray(p.attendees) && p.attendees.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Attendees:</div>
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {p.attendees.map((a, i) => (<li key={i} style={{ fontSize: 12 }}>{a.name} ({a.email})</li>))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ProfessorAllEvents;




