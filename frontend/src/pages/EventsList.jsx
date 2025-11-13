import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApiService } from '../api/eventsApi';
import { useAuth } from '../contexts/AuthContext';
import '../styles/EventsList.css';
import BazaarForm from '../components/BazaarForm';
import ConferenceForm from '../components/ConferenceForm';
import TripForm from '../components/TripForm';
import WorkshopEditRequestModal from '../components/WorkshopEditRequestModal';

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
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [workshopSaving, setWorkshopSaving] = useState(false);
  const [processingIds, setProcessingIds] = useState({}); // For tracking processing states
  const [actionMessages, setActionMessages] = useState({}); // For showing action feedback
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded rows

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
          type: ev.type || 'event',
          status: ev.status || 'approved',
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
          creatorLastName: ev.creatorLastName || ev.createdBy?.lastName,
          vendors: ev.vendors || [],
          registeredCount: ev.registeredCount || 0,
          faculty: ev.faculty,
          professors: ev.professors,
          bannerFile: ev.bannerFile
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
    // Exclude 'other' type events
    if (event.type === 'other') return false;
    
    // Type filter
    const typeMatch = filter === 'all' || (event.type && event.type === filter);
    
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

  // Toggle row expansion
  const toggleRowExpansion = (eventId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Helper functions to determine if actions are allowed
  const canEditEvent = (event) => {
    if (event.type === 'bazaar') {
      return new Date(event.startDate) > new Date();
    }
    if (event.type === 'trip') {
      return new Date(event.startDate) > new Date();
    }
    if (event.type === 'conference') {
      return true; // Can always edit conferences
    }
    if (event.type === 'workshop') {
      return event.status !== 'approved'; // Can only edit if not already accepted
    }
    return false;
  };

  const canDeleteEvent = (event) => {
    return (event.registeredCount || 0) === 0; // Can only delete if no registrations
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    if (event.capacity && event.registeredCount >= event.capacity) {
      return { label: 'Full', color: 'red' };
    }
    if (now >= startDate && now <= endDate) {
      return { label: 'Active', color: 'green' };
    }
    if (now < startDate) {
      return { label: 'Upcoming', color: 'blue' };
    }
    return { label: 'Past', color: 'gray' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading events...</p>
        </div>
      </div>
    );
  }

  const isEventsOffice = user?.userType === 'Event Office' || 
                         user?.userType === 'Events Office' || 
                         user?.userType === 'event_office' || 
                         user?.role === 'event_office' || 
                         user?.role === 'Event Office';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f6f7f8',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <h1 style={{
              color: '#111827',
              fontSize: '1.875rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0
            }}>
              All Upcoming Events
            </h1>
          </div>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            fontWeight: '400',
            margin: 0
          }}>
            View, manage, and track all scheduled university events.
          </p>
        </header>

        {/* Filters Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{ display: 'flex', width: '100%', height: '3rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRight: 'none',
                    backgroundColor: '#f9fafb',
                    borderTopLeftRadius: '0.5rem',
                    borderBottomLeftRadius: '0.5rem'
                  }}>
                    <span className="material-symbols-outlined" style={{ 
                      fontSize: '1.5rem',
                      color: '#9ca3af'
                    }}>
                      search
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Event Name/Professor"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setLoading(true); loadEvents(); } }}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderLeft: 'none',
                      borderTopRightRadius: '0.5rem',
                      borderBottomRightRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '3rem' }}>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="workshop">Workshops</option>
                  <option value="trip">Trips</option>
                  <option value="bazaar">Bazaars</option>
                  <option value="booth">Booths</option>
                  <option value="conference">Conferences</option>
                </select>
              </label>
            </div>

            {/* Apply Filters Button */}
            <button
              onClick={() => { setLoading(true); loadEvents(); }}
              style={{
                height: '3rem',
                padding: '0 1.5rem',
                backgroundColor: '#137fec',
                color: '#FFFFFF',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0f6fd6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#137fec'}
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Events Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          overflowX: 'auto'
        }}>
          {error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={loadEvents}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#137fec',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#6b7280' }}>No events found.</p>
            </div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left' }}>
              <thead style={{ borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Event Name
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Type
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Date
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Location
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: 'center'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: 'right'
                  }}>
                    Actions
                  </th>
                  <th style={{ padding: '1rem 1.5rem', width: '48px' }}></th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                {filteredEvents.map(event => {
                  const statusInfo = getEventStatus(event);
                  const canEdit = canEditEvent(event);
                  const canDelete = canDeleteEvent(event);
                  const isExpanded = expandedRows.has(event.id);
                  const statusColors = {
                    blue: { bg: '#dbeafe', text: '#1e40af' },
                    green: { bg: '#d1fae5', text: '#065f46' },
                    red: { bg: '#fee2e2', text: '#991b1b' },
                    gray: { bg: '#f3f4f6', text: '#4b5563' }
                  };
                  const statusStyle = statusColors[statusInfo.color] || statusColors.gray;

                  return (
                    <React.Fragment key={event.id}>
                      <tr style={{
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {event.name || event.title}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {formatDate(event.startDate)}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {event.location}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text
                          }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          textAlign: 'right'
                        }}>
                          {isEventsOffice && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              {/* Workshop Accept/Reject buttons */}
                              {event.type === 'workshop' && event.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleEventStatusChange(event.id, 'approved')}
                                    disabled={!!processingIds[event.id]}
                                    style={{
                                      padding: '0.5rem',
                                      borderRadius: '0.5rem',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      color: canEdit ? '#137fec' : '#d1d5db',
                                      cursor: canEdit ? 'pointer' : 'not-allowed',
                                      opacity: canEdit ? 1 : 0.5
                                    }}
                                    title={canEdit ? 'Accept Workshop' : 'Workshop already accepted'}
                                    onMouseEnter={(e) => {
                                      if (canEdit) {
                                        e.target.style.backgroundColor = '#f3f4f6';
                                        e.target.style.color = '#137fec';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (canEdit) {
                                        e.target.style.backgroundColor = 'transparent';
                                        e.target.style.color = '#137fec';
                                      }
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                      check_circle
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleEventStatusChange(event.id, 'rejected')}
                                    disabled={!!processingIds[event.id]}
                                    style={{
                                      padding: '0.5rem',
                                      borderRadius: '0.5rem',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      color: '#ef4444',
                                      cursor: 'pointer'
                                    }}
                                    title="Reject Workshop"
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#fee2e2';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                      cancel
                                    </span>
                                  </button>
                                </>
                              )}
                              
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  if (event.type === 'bazaar') openBazaarEdit(event);
                                  else if (event.type === 'conference') openConferenceEdit(event);
                                  else if (event.type === 'trip') openTripEdit(event);
                                  else if (event.type === 'workshop') {
                                    setEditingWorkshop(event);
                                    setIsWorkshopModalOpen(true);
                                  }
                                }}
                                disabled={!canEdit}
                                style={{
                                  padding: '0.5rem',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: canEdit ? '#6b7280' : '#d1d5db',
                                  cursor: canEdit ? 'pointer' : 'not-allowed',
                                  opacity: canEdit ? 1 : 0.5
                                }}
                                title={canEdit ? 'Edit Event' : (event.type === 'bazaar' || event.type === 'trip' ? 'Cannot edit: event has started' : event.type === 'workshop' ? 'Cannot edit: workshop already accepted' : 'Cannot edit')}
                                onMouseEnter={(e) => {
                                  if (canEdit) {
                                    e.target.style.backgroundColor = '#f3f4f6';
                                    e.target.style.color = '#137fec';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (canEdit) {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#6b7280';
                                  }
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                  edit
                                </span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleEventDelete(event.id)}
                                disabled={!canDelete || !!processingIds[event.id]}
                                style={{
                                  padding: '0.5rem',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: canDelete ? '#ef4444' : '#fbbf24',
                                  cursor: canDelete ? 'pointer' : 'not-allowed',
                                  opacity: canDelete ? 1 : 0.5
                                }}
                                title={canDelete ? 'Delete Event' : 'Cannot delete: registrations exist'}
                                onMouseEnter={(e) => {
                                  if (canDelete) {
                                    e.target.style.backgroundColor = '#fee2e2';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (canDelete) {
                                    e.target.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                  delete
                                </span>
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          textAlign: 'right'
                        }}>
                          <button
                            onClick={() => toggleRowExpansion(event.id)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#6b7280',
                              cursor: 'pointer',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f3f4f6';
                              e.target.style.color = '#137fec';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = '#6b7280';
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                              expand_more
                            </span>
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                          <td colSpan="7" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                              {/* Event Description */}
                              {event.description && (
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                                    Description
                                  </h4>
                                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                    {event.description}
                                  </p>
                                </div>
                              )}

                              {/* Event Details Grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1rem'
                              }}>
                                {/* Start Date */}
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                    Start Date & Time
                                  </h4>
                                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                    {event.startDate ? new Date(event.startDate).toLocaleString() : 'N/A'}
                                  </p>
                                </div>

                                {/* End Date */}
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                    End Date & Time
                                  </h4>
                                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                    {event.endDate ? new Date(event.endDate).toLocaleString() : 'N/A'}
                                  </p>
                                </div>

                                {/* Registration Deadline */}
                                {event.registrationDeadline && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Registration Deadline
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {new Date(event.registrationDeadline).toLocaleString()}
                                    </p>
                                  </div>
                                )}

                                {/* Capacity */}
                                {event.capacity && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Capacity
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.registeredCount || 0} / {event.capacity} registered
                                    </p>
                                  </div>
                                )}

                                {/* Price (for trips) */}
                                {event.type === 'trip' && event.price && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Price
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.price} EGP
                                    </p>
                                  </div>
                                )}

                                {/* Professor (for workshops) */}
                                {event.type === 'workshop' && (event.professorName || event.professors) && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Professor
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.professorName || event.professors}
                                    </p>
                                  </div>
                                )}

                                {/* Faculty (for workshops) */}
                                {event.type === 'workshop' && event.faculty && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Faculty
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.faculty}
                                    </p>
                                  </div>
                                )}

                                {/* Budget (for conferences) */}
                                {event.type === 'conference' && event.budget && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Budget
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.budget} EGP
                                    </p>
                                  </div>
                                )}

                                {/* Funding Source (for conferences) */}
                                {event.type === 'conference' && event.fundingSource && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Funding Source
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                      {event.fundingSource}
                                    </p>
                                  </div>
                                )}

                                {/* Website (for conferences) */}
                                {event.type === 'conference' && event.website && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                      Website
                                    </h4>
                                    <a
                                      href={event.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '0.875rem',
                                        color: '#137fec',
                                        textDecoration: 'none'
                                      }}
                                    >
                                      {event.website}
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Agenda (for conferences) */}
                              {event.type === 'conference' && event.agenda && (
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                                    Agenda
                                  </h4>
                                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {event.agenda}
                                  </p>
                                </div>
                              )}

                              {/* Vendors (for bazaars and booths) */}
                              {(event.type === 'bazaar' || event.type === 'booth') && event.vendors && event.vendors.length > 0 && (
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                                    Participating Vendors
                                  </h4>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '0.75rem'
                                  }}>
                                    {event.vendors.map((vendor, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: '0.75rem',
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '0.5rem',
                                          border: '1px solid #e5e7eb'
                                        }}
                                      >
                                        <p style={{
                                          fontSize: '0.875rem',
                                          fontWeight: '500',
                                          color: '#111827',
                                          margin: '0 0 0.25rem 0'
                                        }}>
                                          {vendor.companyName || vendor.name || 'Vendor'}
                                        </p>
                                        {vendor.email && (
                                          <p style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: 0
                                          }}>
                                            {vendor.email}
                                          </p>
                                        )}
                                        {vendor.contactName && (
                                          <p style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: 0
                                          }}>
                                            Contact: {vendor.contactName}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bazaar Details */}
                              {event.type === 'bazaar' && (
                                <div>
                                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                                    Bazaar Details
                                  </h4>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem'
                                  }}>
                                    {event.registrationDeadline && (
                                      <div>
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                                          Registration Deadline
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                                          {new Date(event.registrationDeadline).toLocaleString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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

      {isWorkshopModalOpen && editingWorkshop && (
        <WorkshopEditRequestModal
          open={isWorkshopModalOpen}
          workshop={editingWorkshop}
          onClose={() => { setIsWorkshopModalOpen(false); setEditingWorkshop(null); }}
          onSubmitted={async (data) => {
            // refresh list and close modal
            setIsWorkshopModalOpen(false);
            setEditingWorkshop(null);
            await loadEvents();
          }}
        />
      )}
    </div>
  );
};

export default EventsList;

// Modal styles are derived from existing CSS utility classes; inline styles ensure no global CSS needed
// Inline edit modal rendering appended at end of component tree