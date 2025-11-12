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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
    
    // Exclude 'other' type events
    list = list.filter(e => e.type !== 'other');
    
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

  const handleEventClick = (event) => {
    console.log('🔍 Event clicked:', event.title);
    console.log('   Event type:', event.type);
    console.log('   Has vendorRequests:', !!event.vendorRequests);
    console.log('   vendorRequests length:', event.vendorRequests?.length || 0);
    console.log('   Has vendors:', !!event.vendors);
    console.log('   vendors length:', event.vendors?.length || 0);
    console.log('   Full event object:', event);
    
    setSelectedEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      'bazaar': '#F48FB1', // Light pink
      'booth': '#dc3545',
      'trip': '#007bff',
      'workshop': '#6f42c1',
      'conference': '#fd7e14'
    };
    return colors[type] || '#6c757d';
  };

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
                  <div 
                    key={id} 
                    className="card" 
                    style={{ 
                      backgroundColor: 'var(--light-gray)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ':hover': {
                        backgroundColor: '#f8f9fa',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => handleEventClick(ev)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--light-gray)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
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
                            <div style={{ 
                              color: 'var(--text-light)', 
                              fontSize: 13,
                              backgroundColor: ev.type === 'booth' ? '#f8f9fa' : 'transparent',
                              padding: ev.type === 'booth' ? '12px' : '0',
                              borderRadius: ev.type === 'booth' ? '8px' : '0',
                              border: ev.type === 'booth' ? '2px solid #e9ecef' : 'none',
                              marginTop: ev.type === 'booth' ? '8px' : '0'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                marginBottom: ev.type === 'booth' ? '8px' : '4px',
                                color: ev.type === 'booth' ? 'var(--guc-red)' : 'var(--text-light)',
                                fontWeight: ev.type === 'booth' ? '600' : 'normal'
                              }}>
                                🛍️ <strong>Participating Vendors ({ev.vendors.length})</strong>
                                {ev.type === 'booth' && (
                                  <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '11px', 
                                    backgroundColor: 'var(--guc-red)', 
                                    color: 'white', 
                                    padding: '2px 6px', 
                                    borderRadius: '12px' 
                                  }}>
                                    BOOTH EVENT
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gap: ev.type === 'booth' ? '8px' : '2px',
                                gridTemplateColumns: ev.type === 'booth' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr'
                              }}>
                                {ev.vendors && ev.vendors.length > 0 ? ev.vendors.map((vendor, idx) => (
                                  <div key={vendor._id || idx} style={{ 
                                    backgroundColor: ev.type === 'booth' ? 'var(--white)' : 'var(--white)', 
                                    padding: ev.type === 'booth' ? '12px' : '4px 8px', 
                                    borderRadius: ev.type === 'booth' ? '6px' : '4px',
                                    fontSize: ev.type === 'booth' ? '13px' : '12px',
                                    border: ev.type === 'booth' ? '1px solid #dee2e6' : '1px solid var(--medium-gray)',
                                    boxShadow: ev.type === 'booth' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: ev.type === 'booth' ? 'all 0.2s ease' : 'none'
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'flex-start',
                                      marginBottom: ev.type === 'booth' ? '6px' : '0'
                                    }}>
                                      <div>
                                        <strong style={{ 
                                          color: ev.type === 'booth' ? 'var(--charcoal-black)' : 'inherit',
                                          fontSize: ev.type === 'booth' ? '14px' : 'inherit'
                                        }}>
                                          {vendor.name}
                                        </strong>
                                        {vendor.contactName && vendor.contactName !== vendor.name && (
                                          <div style={{ 
                                            fontSize: ev.type === 'booth' ? '12px' : 'inherit',
                                            color: ev.type === 'booth' ? 'var(--text-light)' : 'inherit',
                                            marginTop: ev.type === 'booth' ? '2px' : '0'
                                          }}>
                                            Contact: {vendor.contactName}
                                          </div>
                                        )}
                                      </div>
                                      {ev.type === 'booth' && vendor.email && (
                                        <div style={{ 
                                          fontSize: '11px', 
                                          color: 'var(--guc-red)',
                                          fontWeight: '500'
                                        }}>
                                          📧 {vendor.email}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {ev.type === 'booth' && (
                                      <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                                        gap: '6px',
                                        marginTop: '8px',
                                        padding: '8px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '4px'
                                      }}>
                                        {vendor.boothSize && (
                                          <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>BOOTH SIZE</div>
                                            <div style={{ fontWeight: '600', color: 'var(--guc-red)' }}>{vendor.boothSize}</div>
                                          </div>
                                        )}
                                        {vendor.durationWeeks && (
                                          <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>DURATION</div>
                                            <div style={{ fontWeight: '600', color: 'var(--guc-red)' }}>{vendor.durationWeeks} weeks</div>
                                          </div>
                                        )}
                                        {vendor.boothLocation && (
                                          <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>LOCATION</div>
                                            <div style={{ fontWeight: '600', color: 'var(--guc-red)', fontSize: '11px' }}>
                                              {vendor.boothLocation.replace('-', ' ').toUpperCase()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {ev.type !== 'booth' && (
                                      <div>
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
                            color: ev.type === 'booth' ? 'white' : 'var(--guc-red)', 
                            fontWeight: 600,
                            backgroundColor: ev.type === 'booth' ? 'var(--guc-red)' : 'var(--white)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            border: ev.type === 'booth' ? '2px solid var(--guc-red)' : 'none',
                            boxShadow: ev.type === 'booth' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                          }}>
                            {ev.type === 'booth' ? '🏪 BOOTH EVENT' : (ev.type || ev.category || 'Event')}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            👥 {ev.registeredCount || 0}{ev.capacity ? `/${ev.capacity}` : ''} participants
                            {ev.type === 'booth' && ev.vendors && ev.vendors.length > 0 && (
                              <span style={{ 
                                marginLeft: '8px', 
                                color: 'var(--guc-red)', 
                                fontWeight: '600' 
                              }}>
                                • 🛍️ {ev.vendors.length} vendor{ev.vendors.length > 1 ? 's' : ''}
                              </span>
                            )}
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

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: 'var(--charcoal-black)' }}>{selectedEvent.title}</h2>
              <button 
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Event Type Badge */}
              <div style={{
                backgroundColor: getEventTypeColor(selectedEvent.type),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {selectedEvent.type.toUpperCase()}
              </div>

              {/* Event Details Grid */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Basic Event Info */}
                <div>
                  <h3 style={{ color: 'var(--guc-red)', marginBottom: '0.5rem' }}>📅 Event Details</h3>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600' }}>Start Date:</span>
                      <span>{formatDate(selectedEvent.startDate)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600' }}>End Date:</span>
                      <span>{formatDate(selectedEvent.endDate)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600' }}>Location:</span>
                      <span>{selectedEvent.location}</span>
                    </div>
                    {selectedEvent.registrationDeadline && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>Registration Deadline:</span>
                        <span>{formatDate(selectedEvent.registrationDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div>
                    <h3 style={{ color: 'var(--guc-red)', marginBottom: '0.5rem' }}>📝 Description</h3>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedEvent.description}</p>
                  </div>
                )}

                {/* Debug: Log selected event data */}
                {console.log('🔍 Modal - Selected Event:', selectedEvent)}
                {console.log('🔍 Modal - Event type:', selectedEvent.type)}
                {console.log('🔍 Modal - Has vendorRequests:', !!selectedEvent.vendorRequests)}
                {console.log('🔍 Modal - vendorRequests length:', selectedEvent.vendorRequests?.length || 0)}
                
                {/* Debug: Show when vendor requests are missing for booth events */}
                {selectedEvent.type === 'booth' && (!selectedEvent.vendorRequests || selectedEvent.vendorRequests.length === 0) && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{ color: '#856404', marginBottom: '0.5rem' }}>
                      🔍 Debug: No Vendor Requests Found
                    </h3>
                    <p style={{ margin: 0, color: '#856404' }}>
                      This booth event has no vendor requests or the vendorRequests property is missing.
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#856404' }}>
                      Has vendorRequests: {selectedEvent.vendorRequests ? 'Yes' : 'No'} | 
                      Length: {selectedEvent.vendorRequests?.length || 'undefined'} |
                      Has vendors: {selectedEvent.vendors ? 'Yes' : 'No'} |
                      Vendors length: {selectedEvent.vendors?.length || 'undefined'}
                    </p>
                  </div>
                )}

                {/* Vendor Requests for Booth Events - Detailed View */}
                {selectedEvent.type === 'booth' && selectedEvent.vendorRequests && selectedEvent.vendorRequests.length > 0 && (
                  <div>
                    <h3 style={{ color: 'var(--guc-red)', marginBottom: '0.5rem' }}>
                      🏪 Accepted Vendor Requests ({selectedEvent.vendorRequests.length})
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                      gap: '1rem' 
                    }}>
                      {selectedEvent.vendorRequests.map((vendorRequest, index) => (
                        <div key={vendorRequest._id || index} style={{
                          backgroundColor: '#f8f9fa',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {/* Vendor Request Header */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '1rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '1px solid #dee2e6'
                          }}>
                            <div>
                              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--charcoal-black)', fontSize: '16px' }}>
                                {vendorRequest.vendor.name || vendorRequest.vendor.companyName}
                              </h4>
                              <div style={{ 
                                fontSize: '11px', 
                                backgroundColor: '#28a745', 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                display: 'inline-block'
                              }}>
                                ✅ {vendorRequest.status.toUpperCase()}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                              Request #{vendorRequest._id.toString().slice(-6)}
                            </div>
                          </div>

                          {/* Vendor Contact Information */}
                          <div style={{ marginBottom: '1rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--guc-red)', fontSize: '14px' }}>
                              📞 Contact Information
                            </h5>
                            {vendorRequest.vendor.email && (
                              <p style={{ margin: '0 0 0.25rem 0', fontSize: '13px', color: 'var(--text-light)' }}>
                                📧 {vendorRequest.vendor.email}
                              </p>
                            )}
                            {vendorRequest.vendor.contactName && vendorRequest.vendor.contactName !== vendorRequest.vendor.name && (
                              <p style={{ margin: '0 0 0.25rem 0', fontSize: '13px', color: 'var(--text-light)' }}>
                                👤 Contact Person: {vendorRequest.vendor.contactName}
                              </p>
                            )}
                          </div>

                          {/* Booth Specifications */}
                          <div style={{ marginBottom: '1rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--guc-red)', fontSize: '14px' }}>
                              🏪 Booth Specifications
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                              {vendorRequest.boothSize && (
                                <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>BOOTH SIZE</div>
                                  <div style={{ fontWeight: '600', color: 'var(--guc-red)' }}>{vendorRequest.boothSize}</div>
                                </div>
                              )}
                              {vendorRequest.durationWeeks && (
                                <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>DURATION</div>
                                  <div style={{ fontWeight: '600', color: 'var(--guc-red)' }}>{vendorRequest.durationWeeks} weeks</div>
                                </div>
                              )}
                              {vendorRequest.boothLocation && (
                                <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px' }}>LOCATION</div>
                                  <div style={{ fontWeight: '600', color: 'var(--guc-red)', fontSize: '10px' }}>
                                    {vendorRequest.boothLocation.replace('-', ' ').toUpperCase()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Attendees */}
                          {vendorRequest.attendees && vendorRequest.attendees.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--guc-red)', fontSize: '14px' }}>
                                👥 Attendees ({vendorRequest.attendees.length})
                              </h5>
                              <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '12px' }}>
                                  {vendorRequest.attendees.map((attendee, idx) => (
                                    <li key={idx} style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                      <strong>{attendee.name}</strong> ({attendee.email})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Message */}
                          {vendorRequest.message && (
                            <div style={{ marginBottom: '1rem' }}>
                              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--guc-red)', fontSize: '14px' }}>
                                💬 Vendor Message
                              </h5>
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '0.75rem', 
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: 'var(--text-light)',
                                fontStyle: 'italic'
                              }}>
                                "{vendorRequest.message}"
                              </div>
                            </div>
                          )}

                          {/* Request Details */}
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--text-light)', 
                            borderTop: '1px solid #dee2e6',
                            paddingTop: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>Submitted: {new Date(vendorRequest.createdAt).toLocaleDateString()}</span>
                            <span>Event: {vendorRequest.eventName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: Regular vendor display for non-booth events */}
                {selectedEvent.type !== 'booth' && selectedEvent.vendors && selectedEvent.vendors.length > 0 && (
                  <div>
                    <h3 style={{ color: 'var(--guc-red)', marginBottom: '0.5rem' }}>
                      🛍️ Participating Vendors ({selectedEvent.vendors.length})
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                      gap: '1rem' 
                    }}>
                      {selectedEvent.vendors.map((vendor, index) => (
                        <div key={vendor._id || index} style={{
                          backgroundColor: '#f8f9fa',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--charcoal-black)' }}>
                            {vendor.name || vendor.companyName}
                          </h4>
                          {vendor.email && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '14px', color: 'var(--text-light)' }}>
                              📧 {vendor.email}
                            </p>
                          )}
                          {vendor.contactName && vendor.contactName !== vendor.name && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '14px', color: 'var(--text-light)' }}>
                              👤 Contact: {vendor.contactName}
                            </p>
                          )}
                          {vendor.boothSize && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '14px', color: 'var(--text-light)' }}>
                              📏 Booth Size: {vendor.boothSize}
                            </p>
                          )}
                          {vendor.durationWeeks && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '14px', color: 'var(--text-light)' }}>
                              ⏱️ Duration: {vendor.durationWeeks} weeks
                            </p>
                          )}
                          {vendor.boothLocation && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '14px', color: 'var(--text-light)' }}>
                              📍 Location: {vendor.boothLocation.replace('-', ' ').toUpperCase()}
                            </p>
                          )}
                          {vendor.attendees && vendor.attendees.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)' }}>
                                Attendees:
                              </p>
                              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '12px' }}>
                                {vendor.attendees.map((attendee, idx) => (
                                  <li key={idx} style={{ color: 'var(--text-light)' }}>
                                    {attendee.name} ({attendee.email})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                {(selectedEvent.agenda || selectedEvent.website || selectedEvent.faculty || selectedEvent.professors) && (
                  <div>
                    <h3 style={{ color: 'var(--guc-red)', marginBottom: '0.5rem' }}>📋 Additional Information</h3>
                    {selectedEvent.agenda && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>Agenda:</span>
                        <p style={{ margin: '0.25rem 0 0 0' }}>{selectedEvent.agenda}</p>
                      </div>
                    )}
                    {selectedEvent.website && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>Website:</span>
                        <a href={selectedEvent.website} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem' }}>
                          {selectedEvent.website}
                        </a>
                      </div>
                    )}
                    {selectedEvent.faculty && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>Faculty:</span>
                        <span style={{ marginLeft: '0.5rem' }}>{selectedEvent.faculty}</span>
                      </div>
                    )}
                    {selectedEvent.professors && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>Professors:</span>
                        <span style={{ marginLeft: '0.5rem' }}>{selectedEvent.professors}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;


