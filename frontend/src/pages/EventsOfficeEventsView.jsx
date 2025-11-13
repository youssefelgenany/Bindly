import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService, bazaarApi, tripApi } from '../api/eventsApi';
import { adminApiService } from '../api/adminApi';
import { vendorRequestApi } from '../api/vendorRequestApi';
import BazaarForm from '../components/BazaarForm';
import ConferenceForm from '../components/ConferenceForm';
import TripForm from '../components/TripForm';
import WorkshopEditRequestModal from '../components/WorkshopEditRequestModal';

const EventsOfficeEventsView = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
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
  const [processingIds, setProcessingIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [vendorRequests, setVendorRequests] = useState({}); // eventId -> array of requests
  const [loadingVendorRequests, setLoadingVendorRequests] = useState({}); // eventId -> boolean

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      console.log('🔍 Loading events with params:', { searchQuery, filter });
      
      const result = await eventsApiService.getAllEventsAuthenticated({
        q: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
        type: filter !== 'all' ? filter : undefined
      });
      
      console.log('🔍 API Result from getAllEventsAuthenticated:', result);
      
      if (result.success) {
        // Handle both array and object with events property
        let rawEvents = result.data || [];
        if (!Array.isArray(rawEvents) && rawEvents.events) {
          rawEvents = rawEvents.events;
        }
        if (!Array.isArray(rawEvents) && Array.isArray(result.data)) {
          rawEvents = result.data;
        }
        
        console.log('🔍 Raw events from API:', rawEvents);
        console.log('🔍 Number of events:', rawEvents.length);
        console.log('🔍 Events type:', typeof rawEvents, Array.isArray(rawEvents));
        
        if (!Array.isArray(rawEvents)) {
          console.error('🔍 Events is not an array:', rawEvents);
          setEvents([]);
          setError('Invalid response format from server');
          return;
        }
        
        const mapped = rawEvents.map(ev => ({
          id: ev._id || ev.id,
          title: ev.title || ev.name,
          type: ev.type,
          status: ev.status || 'approved',
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          registrationDeadline: ev.registrationDeadline,
          description: ev.description,
          capacity: ev.capacity,
          price: ev.price,
          registeredCount: ev.registeredCount || 0,
          agenda: ev.agenda,
          website: ev.website,
          budget: ev.budget,
          fundingSource: ev.fundingSource,
          extraResources: ev.extraResources,
          faculty: ev.faculty,
          professors: ev.professors,
          bannerFile: ev.bannerFile,
          creatorName: ev.creatorName || ev.professorName || ev.createdByName || (ev.createdBy ? `${ev.createdBy.firstName || ''} ${ev.createdBy.lastName || ''}`.trim() : null),
          creatorRole: ev.creatorRole || (ev.createdBy ? ev.createdBy.userType : null),
          creatorEmail: ev.createdBy?.email || ev.creatorEmail || null,
          vendors: ev.vendors || [],
          vendorRequests: ev.vendorRequests || []
        }));
        
        console.log('🔍 Mapped events:', mapped);
        
        const filtered = mapped.filter(ev => {
          // Filter out invalid/empty events
          // Must have a valid title or name (not empty string)
          const title = (ev.title || ev.name || '').trim();
          if (!title) {
            console.log('🔍 Filtered out event: missing or empty title/name', ev.id);
            return false;
          }
          
          // Must have a valid start date
          if (!ev.startDate) {
            console.log('🔍 Filtered out event: missing startDate', title, ev.id);
            return false;
          }
          
          // Validate that startDate is a valid date
          const startDate = new Date(ev.startDate);
          if (isNaN(startDate.getTime())) {
            console.log('🔍 Filtered out event: invalid startDate', title, ev.id, ev.startDate);
            return false;
          }
          
          // Filter out unwanted event types
          const type = (ev.type || '').toLowerCase().trim();
          if (!type || type === 'standalonebooth' || type === 'standalone booth' || type === 'other') {
            console.log('🔍 Filtered out event:', title, 'type:', ev.type || 'empty');
            return false;
          }
          
          // Filter out test/dummy events created by test users
          // Test users have emails containing '.test@'
          if (ev.creatorEmail && ev.creatorEmail.includes('.test@')) {
            console.log('🔍 Filtered out test event:', title, 'created by:', ev.creatorEmail);
            return false;
          }
          
          // Also filter out common test event titles
          const testEventTitles = [
            'Tech Innovation Booth',
            'Student Entrepreneurship Hub',
            'Health & Wellness Expo',
            'Campus Food Truck Spot',
            'Environmental Sustainability Showcase',
            'Creative Arts & Design Gallery',
            'Food & Beverage Festival',
            'Python Programming Workshop',
            'Machine Learning Fundamentals',
            'Web Development Bootcamp',
            'Database Design Workshop',
            'Spring Bazaar',
            'Summer Festival Bazaar',
            'Winter Market Bazaar',
            'Alexandria Day Trip',
            'Sinai Desert Adventure',
            'Luxor Historical Tour',
            'AI and Machine Learning Conference',
            'Sustainable Development Conference',
            'Pending Workshop',
            'Cancelled Event',
            'Standalone Booth'
          ];
          
          const titleLower = title.toLowerCase();
          if (testEventTitles.some(testTitle => titleLower.includes(testTitle.toLowerCase()))) {
            console.log('🔍 Filtered out test event by title:', title);
            return false;
          }
          
          return true;
        });
        
        console.log('🔍 Final filtered events:', filtered);
        console.log('🔍 Final count:', filtered.length);
        
        // Sort events: upcoming events first (nearest first), then past events (most recent past first)
        const now = new Date();
        const upcomingEvents = filtered.filter(ev => {
          const startDate = new Date(ev.startDate);
          return startDate >= now;
        }).sort((a, b) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateA - dateB; // Ascending: nearest first
        });
        
        const pastEvents = filtered.filter(ev => {
          const startDate = new Date(ev.startDate);
          return startDate < now;
        }).sort((a, b) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateB - dateA; // Descending: most recent past first
        });
        
        const sortedEvents = [...upcomingEvents, ...pastEvents];
        console.log('🔍 Sorted events - Upcoming:', upcomingEvents.length, 'Past:', pastEvents.length);
        setEvents(sortedEvents);
      } else {
        console.error('🔍 API call failed:', result);
        setEvents([]);
        const msg = result.message || (typeof result.error === 'string' ? result.error : 'Failed to fetch events');
        setError(msg);
      }
    } catch (error) {
      console.error('🔍 Error loading events:', error);
      setError(error?.message || 'Error loading events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    loadEvents();
  }, [filter, loadEvents]);

  // Filter events based on type
  const filteredEvents = events.filter(event => {
    // Skip invalid/empty events
    const title = (event.title || event.name || '').trim();
    if (!title) return false;
    if (!event.startDate) return false;
    
    // Validate startDate is a valid date
    const startDate = new Date(event.startDate);
    if (isNaN(startDate.getTime())) return false;
    
    if (event.type === 'other') return false;
    
    const typeMatch = filter === 'all' || (event.type && event.type === filter);
    return typeMatch;
  });

  const handleSearch = () => {
    loadEvents();
  };

  const handleDeleteEvent = (event) => {
    if (!event) return;
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    setDeletingEventId(eventToDelete.id);
    setDeleting(true);
    setShowDeleteModal(false);
    
    try {
      const result = await eventsApiService.deleteEvent(eventToDelete.id);
      
      if (result.success) {
        await loadEvents();
        // Success is handled by reloading the list
      } else {
        alert(`Error deleting ${eventToDelete.type}: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error deleting ${eventToDelete.type}: ${error.message}`);
    } finally {
      setDeleting(false);
      setDeletingEventId(null);
      setEventToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
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
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1', // Light pink
      trip: '#2196F3',
      sports: '#FF9800',
      seminar: '#9C27B0',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      standalonebooth: '#3F51B5',
      other: '#757575'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  // Toggle row expansion

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

  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle event status change (Accept/Reject for workshops)
  const handleEventStatusChange = async (eventId, newStatus) => {
    setProcessingIds(prev => ({ ...prev, [eventId]: true }));
    try {
      const result = await eventsApiService.updateEventStatus(eventId, { status: newStatus });
      if (result.success) {
        await loadEvents();
      }
    } catch (error) {
      console.error('Error updating event status:', error);
    } finally {
      setProcessingIds(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Edit handlers
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
      if (response.ok) {
        await loadEvents();
        closeConferenceEdit();
      }
    } catch (e) {
      console.error('Failed to update conference:', e);
    } finally {
      setConferenceSaving(false);
    }
  };

  const openTripEdit = (eventItem) => {
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
      setTripSaving(true);
      await tripApi.update(editingTrip.id, formData);
      await loadEvents();
      closeTripEdit();
    } catch (e) {
      console.error('Failed to update trip:', e);
    } finally {
      setTripSaving(false);
    }
  };

  // Load vendor requests for an event
  const loadVendorRequests = useCallback(async (eventId, eventType) => {
    if (!eventId || (eventType !== 'bazaar' && eventType !== 'booth')) return;
    
    try {
      setLoadingVendorRequests(prev => ({ ...prev, [eventId]: true }));
      const result = await vendorRequestApi.getByEvent(eventId, eventType);
      
      if (result.success) {
        setVendorRequests(prev => ({
          ...prev,
          [eventId]: result.requests || []
        }));
      } else {
        console.error('Failed to load vendor requests:', result.message);
        setVendorRequests(prev => ({
          ...prev,
          [eventId]: []
        }));
      }
    } catch (error) {
      console.error('Error loading vendor requests:', error);
      setVendorRequests(prev => ({
        ...prev,
        [eventId]: []
      }));
    } finally {
      setLoadingVendorRequests(prev => ({ ...prev, [eventId]: false }));
    }
  }, []);

  // Handle vendor request status update
  const handleVendorRequestStatus = async (requestId, status, eventId) => {
    try {
      setProcessingIds(prev => ({ ...prev, [requestId]: true }));
      const result = await vendorRequestApi.updateStatus(requestId, status);
      
      if (result.success) {
        // Reload vendor requests for this event
        const event = events.find(e => e.id === eventId);
        if (event) {
          await loadVendorRequests(eventId, event.type);
        }
        // Also reload events to update vendor lists
        await loadEvents();
      } else {
        alert(result.message || 'Failed to update vendor request status');
      }
    } catch (error) {
      console.error('Error updating vendor request status:', error);
      alert('An error occurred while updating vendor request status');
    } finally {
      setProcessingIds(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  };

  // Toggle row expansion and load vendor requests if needed
  const toggleRowExpansion = (eventId, eventType) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
      // Load vendor requests when expanding
      if (eventType === 'bazaar' || eventType === 'booth') {
        loadVendorRequests(eventId, eventType);
      }
    }
    setExpandedRows(newExpanded);
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Events Office';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f8f6f6'
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: sidebarOpen ? '16rem' : '0',
        flexShrink: 0,
        backgroundColor: '#1D3557',
        padding: sidebarOpen ? '1.5rem' : '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'width 0.3s ease, padding 0.3s ease'
      }}>
        {/* Top Section - Logo and Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Logo and Branding */}
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#457B9D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Events Office
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  University Portal
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {sidebarOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/event-office"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
                  dashboard
                </span>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/event-office/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/create-bazaar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-bazaar') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-bazaar')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-bazaar')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/create-bazaar') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-bazaar') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Bazaars
                </p>
              </Link>

              <Link
                to="/create-trip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-trip') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-trip')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-trip')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  flight_takeoff
                </span>
                <p style={{
                  color: isActiveRoute('/create-trip') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-trip') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Trips
                </p>
              </Link>

              <Link
                to="/create-conference"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-conference') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-conference')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-conference')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  groups
                </span>
                <p style={{
                  color: isActiveRoute('/create-conference') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/create-conference') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Conferences
                </p>
              </Link>

              <Link
                to="/event-office/platform-booth-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/event-office/platform-booth-requests') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    Platform Booths
                  </p>
                )}
              </Link>

              <Link
                to="/create-gym-session"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/create-gym-session') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/create-gym-session')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/create-gym-session')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  fitness_center
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/create-gym-session') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/create-gym-session') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    Create Gym Session
                  </p>
                )}
              </Link>

              <Link
                to="/gym-schedule"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/gym-schedule') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  calendar_month
                </span>
                {sidebarOpen && (
                  <p style={{
                    color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                    lineHeight: 'normal',
                    margin: 0
                  }}>
                    View Gym Sessions
                  </p>
                )}
              </Link>
            </nav>
          )}
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'rgba(241, 250, 238, 0.7)', fontSize: '1.25rem' }}>
              logout
            </span>
            {sidebarOpen && (
              <p style={{
                color: 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Logout
              </p>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2.5rem',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557'
              }}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0
            }}>
              Bindly
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1D3557',
                margin: 0
              }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: 0
              }}>
                Events Office
              </p>
            </div>
            {user?.profilePicturePath ? (
              <img
                src={`http://localhost:5000${user.profilePicturePath}`}
                alt="User profile"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#1D3557',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #1D3557'
          }}>
            <h3 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              All Upcoming Events
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              fontWeight: '400',
              margin: '0.25rem 0 0 0'
            }}>
              View, manage, and track all scheduled university events.
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
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
                      onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
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
                onClick={handleSearch}
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

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #1e40af',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'inline-block'
              }} className="spinner"></div>
              <p style={{ margin: 0, color: '#6b7280' }}>Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <p style={{ color: '#6b7280' }}>No events found.</p>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflowX: 'auto'
            }}>
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
                            {event.title}
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
                            {formatTableDate(event.startDate)}
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
                                onClick={() => handleDeleteEvent(event)}
                                disabled={!canDelete || (deleting && deletingEventId === event.id)}
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
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right'
                          }}>
                            <button
                              onClick={() => toggleRowExpansion(event.id, event.type)}
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
                                  {event.type === 'workshop' && (event.creatorName || event.professors) && (
                                    <div>
                                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                        Professor
                                      </h4>
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        {event.creatorName || event.professors}
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

                                {/* Vendor Participation Requests (for bazaars and booths) */}
                                {(event.type === 'bazaar' || event.type === 'booth') && (
                                  <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                                      Vendor Participation Requests
                                    </h4>
                                    {loadingVendorRequests[event.id] ? (
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        Loading vendor requests...
                                      </p>
                                    ) : vendorRequests[event.id] && vendorRequests[event.id].length > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {vendorRequests[event.id].map((request) => {
                                          const vendor = request.vendor || {};
                                          const status = request.status || 'pending';
                                          const isProcessing = !!processingIds[request._id];
                                          
                                          return (
                                            <div
                                              key={request._id}
                                              style={{
                                                padding: '1rem',
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #e5e7eb',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem'
                                              }}
                                            >
                                              {/* Vendor Info */}
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                  <p style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#111827',
                                                    margin: '0 0 0.25rem 0'
                                                  }}>
                                                    {vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Vendor'}
                                                  </p>
                                                  {vendor.email && (
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#6b7280',
                                                      margin: '0 0 0.5rem 0'
                                                    }}>
                                                      {vendor.email}
                                                    </p>
                                                  )}
                                                  
                                                  {/* Attendees */}
                                                  {request.attendees && request.attendees.length > 0 && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                      <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        color: '#374151',
                                                        margin: '0 0 0.25rem 0'
                                                      }}>
                                                        Attendees:
                                                      </p>
                                                      {request.attendees.map((attendee, idx) => (
                                                        <p key={idx} style={{
                                                          fontSize: '0.75rem',
                                                          color: '#6b7280',
                                                          margin: '0 0 0.25rem 0',
                                                          paddingLeft: '0.5rem'
                                                        }}>
                                                          • {attendee.name} ({attendee.email})
                                                        </p>
                                                      ))}
                                                    </div>
                                                  )}

                                                  {/* Booth Size */}
                                                  {request.boothSize && (
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#6b7280',
                                                      margin: '0.25rem 0 0 0'
                                                    }}>
                                                      Booth Size: {request.boothSize}
                                                    </p>
                                                  )}

                                                  {/* Duration (for booths) */}
                                                  {request.durationWeeks && (
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#6b7280',
                                                      margin: '0.25rem 0 0 0'
                                                    }}>
                                                      Duration: {request.durationWeeks} week{request.durationWeeks !== 1 ? 's' : ''}
                                                    </p>
                                                  )}

                                                  {/* Booth Location */}
                                                  {request.boothLocation && (
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#6b7280',
                                                      margin: '0.25rem 0 0 0'
                                                    }}>
                                                      Location: {request.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </p>
                                                  )}

                                                  {/* Message */}
                                                  {request.message && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                      <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        color: '#374151',
                                                        margin: '0 0 0.25rem 0'
                                                      }}>
                                                        Message:
                                                      </p>
                                                      <p style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280',
                                                        margin: 0,
                                                        fontStyle: 'italic',
                                                        paddingLeft: '0.5rem'
                                                      }}>
                                                        "{request.message}"
                                                      </p>
                                                    </div>
                                                  )}

                                                  {/* Request Date */}
                                                  {request.createdAt && (
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#9ca3af',
                                                      margin: '0.5rem 0 0 0'
                                                    }}>
                                                      Requested: {new Date(request.createdAt).toLocaleDateString()}
                                                    </p>
                                                  )}
                                                </div>

                                                {/* Status Badge and Actions */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                  {/* Status Badge */}
                                                  <div style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    backgroundColor: 
                                                      status === 'accepted' ? '#d1fae5' :
                                                      status === 'rejected' ? '#fee2e2' :
                                                      '#fef3c7',
                                                    color:
                                                      status === 'accepted' ? '#065f46' :
                                                      status === 'rejected' ? '#991b1b' :
                                                      '#92400e'
                                                  }}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                  </div>

                                                  {/* Action Buttons (only show for pending) */}
                                                  {status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                      <button
                                                        onClick={() => handleVendorRequestStatus(request._id, 'accepted', event.id)}
                                                        disabled={isProcessing}
                                                        style={{
                                                          padding: '0.5rem 1rem',
                                                          borderRadius: '0.375rem',
                                                          border: 'none',
                                                          backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
                                                          color: '#FFFFFF',
                                                          fontSize: '0.75rem',
                                                          fontWeight: '500',
                                                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: '0.25rem',
                                                          transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                          if (!isProcessing) {
                                                            e.target.style.backgroundColor = '#059669';
                                                          }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          if (!isProcessing) {
                                                            e.target.style.backgroundColor = '#10b981';
                                                          }
                                                        }}
                                                      >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                                          check
                                                        </span>
                                                        Accept
                                                      </button>
                                                      <button
                                                        onClick={() => handleVendorRequestStatus(request._id, 'rejected', event.id)}
                                                        disabled={isProcessing}
                                                        style={{
                                                          padding: '0.5rem 1rem',
                                                          borderRadius: '0.375rem',
                                                          border: 'none',
                                                          backgroundColor: isProcessing ? '#9ca3af' : '#ef4444',
                                                          color: '#FFFFFF',
                                                          fontSize: '0.75rem',
                                                          fontWeight: '500',
                                                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: '0.25rem',
                                                          transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                          if (!isProcessing) {
                                                            e.target.style.backgroundColor = '#dc2626';
                                                          }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          if (!isProcessing) {
                                                            e.target.style.backgroundColor = '#ef4444';
                                                          }
                                                        }}
                                                      >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                                          close
                                                        </span>
                                                        Reject
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        No vendor participation requests for this event.
                                      </p>
                                    )}
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
            </div>
          )}
        </div>
      </main>

      {/* Edit Modals */}
      {isEditModalOpen && editingBazaar && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 3000, 
          padding: '1rem' 
        }}>
          <div style={{ 
            width: 'min(600px, 90vw)', 
            maxHeight: '85vh', 
            overflowY: 'auto', 
            background: '#FFFFFF', 
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky', 
              top: 0, 
              background: '#FFFFFF', 
              zIndex: 1 
            }}>
              <h3 style={{ 
                color: '#1D3557', 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                margin: 0 
              }}>
                Edit Bazaar
              </h3>
              <button 
                onClick={closeBazaarEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <BazaarForm
                onSubmit={handleBazaarUpdate}
                loading={saving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  name: editingBazaar.title || '',
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
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 3000, 
          padding: '1rem' 
        }}>
          <div style={{ 
            width: 'min(600px, 90vw)', 
            maxHeight: '85vh', 
            overflowY: 'auto', 
            background: '#FFFFFF', 
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky', 
              top: 0, 
              background: '#FFFFFF', 
              zIndex: 1 
            }}>
              <h3 style={{ 
                color: '#1D3557', 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                margin: 0 
              }}>
                Edit Conference
              </h3>
              <button 
                onClick={closeConferenceEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <ConferenceForm
                onSubmit={handleConferenceUpdate}
                loading={conferenceSaving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  title: editingConference.title || '',
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
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 3000, 
          padding: '1rem' 
        }}>
          <div style={{ 
            width: 'min(600px, 90vw)', 
            maxHeight: '85vh', 
            overflowY: 'auto', 
            background: '#FFFFFF', 
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky', 
              top: 0, 
              background: '#FFFFFF', 
              zIndex: 1 
            }}>
              <h3 style={{ 
                color: '#1D3557', 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                margin: 0 
              }}>
                Edit Trip
              </h3>
              <button 
                onClick={closeTripEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <TripForm
                onSubmit={handleTripUpdate}
                loading={tripSaving}
                submitLabel="Save Changes"
                loadingLabel="Saving..."
                initialData={{
                  name: editingTrip.title || '',
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
            setIsWorkshopModalOpen(false);
            setEditingWorkshop(null);
            await loadEvents();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Warning Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: '#fef2f2',
              marginBottom: '1.5rem',
              margin: '0 auto 1.5rem'
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '2rem',
                color: '#ef4444'
              }}>
                warning
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              Delete Event
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong style={{ color: '#111827' }}>"{eventToDelete.title || eventToDelete.name}"</strong>?
            </p>

            <p style={{
              fontSize: '0.875rem',
              color: '#ef4444',
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              This action cannot be undone.
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelDelete}
                disabled={deleting}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  background: '#FFFFFF',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.target.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.target.style.background = '#FFFFFF';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#ef4444',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.target.style.background = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.target.style.background = '#ef4444';
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventsOfficeEventsView;

