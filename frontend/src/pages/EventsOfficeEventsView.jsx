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
import axios from 'axios';

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
  const [professorNameFilter, setProfessorNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState('suggested'); // suggested, date-asc, date-desc
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [eventToArchive, setEventToArchive] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    eventName: '',
    eventType: '',
    startDate: '',
    endDate: ''
  });
  const [showSalesReportModal, setShowSalesReportModal] = useState(false);
  const [salesReportData, setSalesReportData] = useState(null);
  const [loadingSalesReport, setLoadingSalesReport] = useState(false);
  const [salesReportFilters, setSalesReportFilters] = useState({
    eventType: '',
    startDate: '',
    endDate: '',
    sortBy: ''
  });
  const [salesReportSortBy, setSalesReportSortBy] = useState('revenue-desc');
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratingsData, setRatingsData] = useState(null);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [selectedEventForRatings, setSelectedEventForRatings] = useState(null);
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState('bazaar');
  const [creating, setCreating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [sendingQRCodes, setSendingQRCodes] = useState({}); // eventId -> boolean
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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
          archived: ev.archived || false,
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

  // Reload archived events when modal opens
  useEffect(() => {
    if (showArchivedModal) {
      console.log('🔍 Modal opened, loading archived events...');
      loadArchivedEvents();
    }
  }, [showArchivedModal]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationPanelOpen && 
          !event.target.closest('[data-notification-panel]') && 
          !event.target.closest('[data-notification-icon]')) {
        setNotificationPanelOpen(false);
      }
    };

    if (notificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notificationPanelOpen]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const [notificationsRes, unreadCountRes] = await Promise.all([
        axios.get('http://localhost:5000/api/notifications?limit=50', { headers }).catch(err => {
          console.error('Error fetching notifications:', err);
          return { data: { success: false, data: { notifications: [] } } };
        }),
        axios.get('http://localhost:5000/api/notifications/unread-count', { headers }).catch(err => {
          console.error('Error fetching unread count:', err);
          return { data: { success: false, unreadCount: 0 } };
        })
      ]);
      
      let notificationsData = [];
      if (notificationsRes.data?.success && notificationsRes.data.data?.notifications) {
        notificationsData = notificationsRes.data.data.notifications;
      }
      
      setNotifications(notificationsData);
      const unreadCountValue = unreadCountRes.data?.success ? unreadCountRes.data.unreadCount : 0;
      setUnreadCount(unreadCountValue);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Get unique event names
  const availableEventNames = React.useMemo(() => {
    const names = new Set();
    events.forEach(event => {
      if (event.title && event.title.trim()) {
        names.add(event.title.trim());
      }
    });
    return Array.from(names).sort();
  }, [events]);

  // Get unique professors from workshops and conferences
  const availableProfessors = React.useMemo(() => {
    const profs = new Set();
    events.forEach(event => {
      if ((event.type === 'workshop' || event.type === 'conference') && event.creatorName) {
        profs.add(event.creatorName);
      }
    });
    return Array.from(profs).sort();
  }, [events]);

  // Get unique locations from all events
  const availableLocations = React.useMemo(() => {
    const locs = new Set();
    events.forEach(event => {
      if (event.location && event.location.trim()) {
        locs.add(event.location.trim());
      }
    });
    return Array.from(locs).sort();
  }, [events]);

  // Filter events based on type, professor name, location, and date
  // Events Office should see all events (including past ones), but we can filter by type
  const filteredEvents = events.filter(event => {
    // Skip invalid/empty events
    const title = (event.title || event.name || '').trim();
    if (!title) return false;
    if (!event.startDate) return false;
    
    // Validate startDate is a valid date
    const startDate = new Date(event.startDate);
    if (isNaN(startDate.getTime())) return false;
    
    // Events Office can see all events (past and future), so don't filter by date
    // Only filter out events with invalid end dates
    if (event.endDate) {
      const eventEndDate = new Date(event.endDate);
      if (isNaN(eventEndDate.getTime())) return false;
    }
    
    if (event.type === 'other') return false;
    
    // Filter by type
    const typeMatch = filter === 'all' || (event.type && event.type === filter);
    if (!typeMatch) return false;
    
    // Filter by professor name (for workshops and conferences)
    if (professorNameFilter.trim()) {
      const profFilter = professorNameFilter.trim().toLowerCase();
      const creatorName = (event.creatorName || event.professorName || '').toLowerCase();
      if (!creatorName.includes(profFilter)) return false;
    }
    
    // Filter by location
    if (locationFilter.trim()) {
      const location = (event.location || '').trim();
      if (location !== locationFilter.trim()) return false;
    }
    
    // Filter by date
    if (dateFilter.trim()) {
      const filterDate = new Date(dateFilter);
      if (!isNaN(filterDate.getTime())) {
        const eventDate = new Date(event.startDate);
        // Compare dates (ignore time)
        const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        if (eventDateOnly.getTime() !== filterDateOnly.getTime()) return false;
      }
    }
    
    return true;
  });
  
  // Sort events
  const sortedAndFilteredEvents = React.useMemo(() => {
    let sorted = [...filteredEvents];
    
    if (sortBy === 'date-asc') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA - dateB;
      });
    } else if (sortBy === 'date-desc') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB - dateA;
      });
    }
    // 'suggested' keeps original order
    
    return sorted;
  }, [filteredEvents, sortBy]);

  console.log('🔍 EventsOfficeEventsView - Filtered events:', {
    totalEvents: events.length,
    filteredCount: filteredEvents.length,
    sortedCount: sortedAndFilteredEvents.length,
    workshopEvents: filteredEvents.filter(e => e.type === 'workshop').length,
    workshopTitles: filteredEvents.filter(e => e.type === 'workshop').map(e => e.title),
    filter: filter
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

  const handleArchiveEvent = (event) => {
    if (!event) return;
    
    // Check if event has passed
    const now = new Date();
    const endDate = new Date(event.endDate);
    if (endDate > now) {
      alert('Cannot archive events that haven\'t ended yet');
      return;
    }

    setEventToArchive(event);
    setShowArchiveConfirmModal(true);
  };

  const confirmArchiveEvent = async () => {
    if (!eventToArchive) return;

    try {
      setProcessingIds(prev => ({ ...prev, [eventToArchive.id]: true }));
      setShowArchiveConfirmModal(false);
      
      const result = await eventsApiService.archiveEvent(eventToArchive.id);
      
      if (result.success) {
        console.log('✅ Event archived successfully');
        await loadEvents();
        // Always reload archived events to update the list
        console.log('🔄 Reloading archived events after archiving...');
        await loadArchivedEvents();
        console.log('✅ Archived events reloaded');
      } else {
        alert(`Error archiving event: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error archiving event: ${error.message}`);
    } finally {
      setProcessingIds(prev => ({ ...prev, [eventToArchive.id]: false }));
      setEventToArchive(null);
    }
  };

  const cancelArchiveEvent = () => {
    setShowArchiveConfirmModal(false);
    setEventToArchive(null);
  };

  const loadArchivedEvents = async () => {
    try {
      setLoadingArchived(true);
      console.log('🔍 Loading archived events...');
      const result = await eventsApiService.getArchivedEvents();
      console.log('🔍 Archived events API result:', result);
      
      if (result.success) {
        const rawEvents = result.data || [];
        console.log('🔍 Raw archived events:', rawEvents);
        console.log('🔍 Number of archived events:', rawEvents.length);
        console.log('🔍 Is array?', Array.isArray(rawEvents));
        
        // Ensure we have an array
        const eventsArray = Array.isArray(rawEvents) ? rawEvents : [];
        console.log('🔍 Events array length:', eventsArray.length);
        
        const mapped = eventsArray.map(ev => {
          const mappedEvent = {
            id: ev._id || ev.id,
            title: ev.title || ev.name || 'Untitled Event',
            type: ev.type || 'event',
            status: ev.status || 'approved',
            archived: ev.archived !== undefined ? ev.archived : false,
            location: ev.location || 'TBD',
            startDate: ev.startDate,
            endDate: ev.endDate,
            creatorName: ev.createdBy?.firstName && ev.createdBy?.lastName
              ? `${ev.createdBy.firstName} ${ev.createdBy.lastName}`
              : ev.createdBy?.email || 'Unknown'
          };
          console.log('🔍 Mapped event:', mappedEvent);
          return mappedEvent;
        });
        console.log('🔍 Final mapped archived events:', mapped);
        console.log('🔍 Setting archivedEvents state with', mapped.length, 'events');
        setArchivedEvents(mapped);
      } else {
        console.error('🔍 Failed to load archived events:', result.message);
        console.error('🔍 Error details:', result.error);
        setArchivedEvents([]);
      }
    } catch (error) {
      console.error('❌ Error loading archived events:', error);
      setArchivedEvents([]);
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleUnarchiveEvent = async (event) => {
    if (!event) return;

    if (!window.confirm(`Are you sure you want to unarchive "${event.title}"? This will make it visible to all users again.`)) {
      return;
    }

    try {
      setProcessingIds(prev => ({ ...prev, [event.id]: true }));
      const result = await eventsApiService.unarchiveEvent(event.id);
      
      if (result.success) {
        await loadArchivedEvents();
        await loadEvents();
      } else {
        alert(`Error unarchiving event: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error unarchiving event: ${error.message}`);
    } finally {
      setProcessingIds(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const loadAttendeesReport = async () => {
    try {
      setLoadingReport(true);
      const result = await adminApiService.getAttendeesReport(reportFilters);
      
      if (result.success) {
        setReportData(result.data);
      } else {
        alert(`Error loading report: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading attendees report:', error);
      alert(`Error loading report: ${error.message}`);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOpenReportModal = async () => {
    setShowReportModal(true);
    await loadAttendeesReport();
  };

  const handleOpenRatingsModal = async (event) => {
    setSelectedEventForRatings(event);
    setShowRatingsModal(true);
    setLoadingRatings(true);
    try {
      const result = await eventsApiService.getRatingsAndComments(event._id || event.id);
      if (result.success) {
        setRatingsData(result.data);
      } else {
        alert(result.message || 'Failed to load ratings and comments');
      }
    } catch (error) {
      console.error('Error loading ratings and comments:', error);
      alert('Failed to load ratings and comments');
    } finally {
      setLoadingRatings(false);
    }
  };

  const loadSalesReport = async () => {
    try {
      setLoadingSalesReport(true);
      const result = await adminApiService.getSalesReport(salesReportFilters);
      
      if (result.success) {
        setSalesReportData(result.data);
      } else {
        alert(`Error loading sales report: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
      alert(`Error loading sales report: ${error.message}`);
    } finally {
      setLoadingSalesReport(false);
    }
  };

  const handleOpenSalesReportModal = async () => {
    setShowSalesReportModal(true);
    await loadSalesReport();
  };

  const handleExportRegistrations = async (event) => {
    if (!event) return;

    // Don't allow export for conferences
    if (event.type === 'conference') {
      return;
    }

    // Don't allow export if no registrations
    if ((event.registeredCount || 0) === 0) {
      return;
    }

    try {
      setProcessingIds(prev => ({ ...prev, [`export-${event.id}`]: true }));
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/events/${event.id}/export-registrations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Don't show alert for "no registrations" error
        if (errorData.message && errorData.message.includes('No registrations found')) {
          return;
        }
        throw new Error(errorData.message || 'Failed to export registrations');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting registrations:', error);
      // Only show alert for actual errors, not "no registrations"
      if (!error.message || !error.message.includes('No registrations found')) {
        alert(`Error exporting registrations: ${error.message}`);
      }
    } finally {
      setProcessingIds(prev => {
        const newState = { ...prev };
        delete newState[`export-${event.id}`];
        return newState;
      });
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

  // Create handlers
  const handleBazaarCreate = async (formData) => {
    try {
      setCreating(true);
      await bazaarApi.create(formData);
      await loadEvents();
      setIsCreateModalOpen(false);
      setActiveCreateTab('bazaar');
    } catch (e) {
      console.error('Failed to create bazaar:', e);
      alert('Failed to create bazaar. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleTripCreate = async (formData) => {
    try {
      setCreating(true);
      await tripApi.create(formData);
      await loadEvents();
      setIsCreateModalOpen(false);
      setActiveCreateTab('trip');
    } catch (e) {
      console.error('Failed to create trip:', e);
      alert('Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleConferenceCreate = async (formData) => {
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/events/conference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        await loadEvents();
        setIsCreateModalOpen(false);
        setActiveCreateTab('conference');
      } else {
        alert(result.msg || 'Failed to create conference. Please try again.');
      }
    } catch (e) {
      console.error('Failed to create conference:', e);
      alert('Failed to create conference. Please try again.');
    } finally {
      setCreating(false);
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

  // Handle sending QR codes to vendors
  const handleSendQRCodes = async (eventId) => {
    try {
      setSendingQRCodes(prev => ({ ...prev, [eventId]: true }));
      const result = await eventsApiService.sendQRCodesToVendors(eventId);
      
      if (result.success) {
        setToast({
          show: true,
          message: result.data?.message || 'QR codes sent successfully to vendors',
          type: 'success'
        });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
      } else {
        setToast({
          show: true,
          message: result.message || 'Failed to send QR codes',
          type: 'error'
        });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 5000);
      }
    } catch (error) {
      console.error('Error sending QR codes:', error);
      setToast({
        show: true,
        message: 'An error occurred while sending QR codes',
        type: 'error'
      });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 5000);
    } finally {
      setSendingQRCodes(prev => {
        const newState = { ...prev };
        delete newState[eventId];
        return newState;
      });
    }
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
                to="/event-office/vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
                </p>
              </Link>

              <Link
                to="/event-office/loyalty-partners"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/loyalty-partners') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  card_giftcard
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-partners') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
                </p>
              </Link>

              <Link
                to="/event-office/workshops"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  school
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Professor Workshops
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Notification Icon */}
            <div 
              data-notification-icon
              onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
              style={{ 
                position: 'relative', 
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ 
                fontSize: '1.5rem', 
                color: '#1D3557'
              }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  backgroundColor: '#ef4444',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '1.25rem',
                  height: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  border: '2px solid #FFFFFF'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            
            {/* Notification Panel */}
            {notificationPanelOpen && (
              <div 
                data-notification-panel
                style={{
                  position: 'absolute',
                  top: '3.5rem',
                  right: '0',
                  width: '24rem',
                  maxHeight: '32rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e2e8f0',
                  zIndex: 1000,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1D3557',
                    margin: 0
                  }}>
                    Notifications
                  </h3>
                  <button
                    onClick={() => setNotificationPanelOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                      close
                    </span>
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {notifications && notifications.length > 0 ? (
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0
                    }}>
                      {notifications.map((notif, idx) => (
                        <li
                          key={notif._id || notif.id || `notif-${idx}`}
                          onClick={async () => {
                            const notifId = notif._id || notif.id;
                            if (!notif.isRead && notifId) {
                              try {
                                const token = localStorage.getItem('token');
                                await axios.put(
                                  `http://localhost:5000/api/notifications/${notifId}/read`,
                                  {},
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setNotifications(prev => prev.map(n => 
                                  (n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n
                                ));
                                setUnreadCount(prev => Math.max(0, prev - 1));
                              } catch (err) {
                                console.error('Error marking notification as read:', err);
                              }
                            }
                          }}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: !notif.isRead ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = !notif.isRead 
                              ? 'rgba(59, 130, 246, 0.1)' 
                              : 'rgba(0, 0, 0, 0.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = !notif.isRead 
                              ? 'rgba(59, 130, 246, 0.05)' 
                              : 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{
                              backgroundColor: !notif.isRead ? '#dbeafe' : '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '2.5rem',
                              height: '2.5rem',
                              borderRadius: '50%',
                              flexShrink: 0
                            }}>
                              <span className="material-symbols-outlined" style={{
                                fontSize: '1.25rem',
                                color: !notif.isRead ? '#3b82f6' : '#6b7280'
                              }}>
                                {notif.type === 'workshop_submission' ? 'school' : 
                                 notif.type === 'vendor_request' ? 'storefront' : 
                                 notif.type === 'event_announcement' ? 'event' : 'notifications'}
                              </span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: '0.875rem',
                                fontWeight: !notif.isRead ? '600' : '500',
                                color: '#111827',
                                margin: '0 0 0.25rem 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {notif.title || 'Notification'}
                              </p>
                              <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {notif.message || ''}
                              </p>
                              <p style={{
                                fontSize: '0.625rem',
                                color: '#9ca3af',
                                margin: '0.25rem 0 0 0'
                              }}>
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{
                      padding: '3rem 1rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}

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
          paddingLeft: '6rem',
          paddingRight: '6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          {/* Page Title Banner */}
          <div style={{
            position: 'relative',
            height: '140px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/events-banner.jpeg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)'
            }}></div>
            {/* Blue Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)'
            }}></div>
            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              height: '100%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem 2.5rem',
              color: '#FFFFFF'
            }}>
              <div>
                <h3 style={{
                  color: '#FFFFFF',
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}>
                  All Upcoming Events
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  margin: 0
                }}>
                  Create, view, manage, and track all scheduled university events.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#FFFFFF',
                  color: '#1D3557',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  height: 'fit-content'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFFFFF';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  add
                </span>
                Create
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Search Bar and Filters Row */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexGrow: 1, minWidth: '320px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '1.25rem',
                  pointerEvents: 'none'
                }}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by event name, professor name, location, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                      backgroundColor: '#FFFFFF',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={{
                  padding: '0.875rem 1.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                  e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                  e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              >
                Search
              </button>
              </div>
              
              {/* Filter, Sort, Archive, and Report Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Report Button */}
              <button
                onClick={handleOpenReportModal}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  assessment
                </span>
                Attendees Report
              </button>
              {/* Sales Report Button */}
              <button
                onClick={handleOpenSalesReportModal}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  attach_money
                </span>
                Sales Report
              </button>
              {/* Archive List Button */}
              <div style={{ position: 'relative' }} data-archive-dropdown>
                <button
                  onClick={async () => {
                    setShowArchivedModal(true);
                    // Always reload archived events when opening the modal
                    await loadArchivedEvents();
                  }}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                    archive
                  </span>
                  Archived Events
                </button>
              </div>
              {/* Filter & Sort Button */}
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: (filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested') ? '#1e40af' : '#f9fafb',
                  color: (filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested') ? '#FFFFFF' : '#6b7280',
                  border: (filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested') ? 'none' : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  boxShadow: (filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested') ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!(filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested')) {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested')) {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  filter_list
                </span>
                Filter & Sort
                {(filter !== 'all' || professorNameFilter || locationFilter || dateFilter || sortBy !== 'suggested') && (
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '9999px',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {[filter !== 'all' ? 1 : 0, professorNameFilter, locationFilter, dateFilter, sortBy !== 'suggested' ? 1 : 0].filter(f => f).length}
                  </span>
                )}
              </button>

              </div>
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
          ) : sortedAndFilteredEvents.length === 0 ? (
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
                  {sortedAndFilteredEvents.map(event => {
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

                              {/* View Ratings Button */}
                              <button
                                onClick={() => handleOpenRatingsModal(event)}
                                style={{
                                  padding: '0.5rem',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#f59e0b',
                                  cursor: 'pointer'
                                }}
                                title="View Ratings & Comments"
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#fef3c7';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                  comment
                                </span>
                              </button>

                              {/* Export Registrations Button - Only show for non-conference events */}
                              {event.type !== 'conference' && (
                                <button
                                  onClick={() => handleExportRegistrations(event)}
                                  disabled={!!processingIds[`export-${event.id}`] || (event.registeredCount || 0) === 0}
                                  style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: (event.registeredCount || 0) === 0 ? '#d1d5db' : '#10b981',
                                    cursor: (processingIds[`export-${event.id}`] || (event.registeredCount || 0) === 0) ? 'not-allowed' : 'pointer',
                                    opacity: (processingIds[`export-${event.id}`] || (event.registeredCount || 0) === 0) ? 0.5 : 1,
                                    filter: (event.registeredCount || 0) === 0 ? 'blur(0.5px)' : 'none'
                                  }}
                                  title={(event.registeredCount || 0) === 0 ? 'No registrations to export' : 'Export Registrations'}
                                  onMouseEnter={(e) => {
                                    if (!processingIds[`export-${event.id}`] && (event.registeredCount || 0) > 0) {
                                      e.target.style.backgroundColor = '#d1fae5';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!processingIds[`export-${event.id}`] && (event.registeredCount || 0) > 0) {
                                      e.target.style.backgroundColor = 'transparent';
                                    }
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                    {processingIds[`export-${event.id}`] ? 'hourglass_empty' : 'download'}
                                  </span>
                                </button>
                              )}

                              {/* Archive Button - Only show for past events that aren't archived */}
                              {(() => {
                                const now = new Date();
                                const endDate = new Date(event.endDate);
                                const isPastEvent = endDate < now;
                                const isArchiving = processingIds[event.id];
                                
                                if (isPastEvent && !event.archived) {
                                  return (
                                    <button
                                      onClick={() => handleArchiveEvent(event)}
                                      disabled={isArchiving}
                                      style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: '#8b5cf6',
                                        cursor: isArchiving ? 'not-allowed' : 'pointer',
                                        opacity: isArchiving ? 0.5 : 1
                                      }}
                                      title="Archive Event"
                                      onMouseEnter={(e) => {
                                        if (!isArchiving) {
                                          e.target.style.backgroundColor = '#f3e8ff';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isArchiving) {
                                          e.target.style.backgroundColor = 'transparent';
                                        }
                                      }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                        archive
                                      </span>
                                    </button>
                                  );
                                }
                                return null;
                              })()}

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

                                {/* Vendors (for bazaars and booths) - Only show accepted vendors */}
                                {(event.type === 'bazaar' || event.type === 'booth') && (() => {
                                  // Get only accepted vendors from vendor requests
                                  const acceptedVendors = vendorRequests[event.id] 
                                    ? vendorRequests[event.id].filter(r => r.status === 'accepted').map(r => r.vendor).filter(Boolean)
                                    : (event.vendors || []);
                                  
                                  // Deduplicate by vendor ID
                                  const uniqueVendors = [];
                                  const seenVendorIds = new Set();
                                  acceptedVendors.forEach(vendor => {
                                    const vendorId = vendor._id || vendor.id || vendor.email;
                                    if (vendorId && !seenVendorIds.has(vendorId)) {
                                      seenVendorIds.add(vendorId);
                                      uniqueVendors.push(vendor);
                                    }
                                  });
                                  
                                  return uniqueVendors.length > 0 ? (
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                          store
                                        </span>
                                        Participating Vendors ({uniqueVendors.length})
                                      </h4>
                                      {/* QR Code Button - Only show if there are accepted vendors */}
                                      <button
                                        onClick={() => handleSendQRCodes(event.id)}
                                        disabled={!!sendingQRCodes[event.id]}
                                        style={{
                                          padding: '0.5rem 1rem',
                                          borderRadius: '0.375rem',
                                          border: 'none',
                                          backgroundColor: sendingQRCodes[event.id] ? '#9ca3af' : '#3b82f6',
                                          color: '#FFFFFF',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: sendingQRCodes[event.id] ? 'not-allowed' : 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!sendingQRCodes[event.id]) {
                                            e.target.style.backgroundColor = '#2563eb';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!sendingQRCodes[event.id]) {
                                            e.target.style.backgroundColor = '#3b82f6';
                                          }
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                          qr_code_2
                                        </span>
                                        {sendingQRCodes[event.id] ? 'Sending...' : 'Send QR Codes'}
                                      </button>
                                    </div>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                      gap: '1rem'
                                    }}>
                                      {uniqueVendors.map((vendor, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            padding: '1rem',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#3b82f6' }}>
                                              store
                                            </span>
                                            <p style={{
                                              fontSize: '0.9375rem',
                                              fontWeight: '600',
                                              color: '#111827',
                                              margin: 0
                                            }}>
                                              {vendor.companyName || vendor.name || 'Vendor'}
                                            </p>
                                          </div>
                                          {vendor.email && (
                                            <p style={{
                                              fontSize: '0.8125rem',
                                              color: '#6b7280',
                                              margin: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.25rem'
                                            }}>
                                              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                email
                                              </span>
                                              {vendor.email}
                                            </p>
                                          )}
                                          {vendor.contactName && (
                                            <p style={{
                                              fontSize: '0.8125rem',
                                              color: '#6b7280',
                                              margin: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.25rem'
                                            }}>
                                              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                person
                                              </span>
                                              Contact: {vendor.contactName}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  ) : null;
                                })()}

                                {/* Vendor Participation Requests (for bazaars and booths) - Only show pending and rejected */}
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
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                        {vendorRequests[event.id]
                                          .filter(request => request.status !== 'accepted') // Only show pending and rejected
                                          .map((request) => {
                                          const vendor = request.vendor || {};
                                          const status = request.status || 'pending';
                                          const isProcessing = !!processingIds[request._id];
                                          
                                          return (
                                            <div
                                              key={request._id}
                                              style={{
                                                padding: '1.25rem',
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: '0.75rem',
                                                border: status === 'accepted' ? '2px solid #10b981' : '1px solid #e5e7eb',
                                                boxShadow: status === 'accepted' ? '0 1px 3px rgba(16, 185, 129, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                                transition: 'all 0.2s'
                                              }}
                                            >
                                              {/* Header with Vendor Info and Status */}
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                                                      store
                                                    </span>
                                                    <p style={{
                                                      fontSize: '0.9375rem',
                                                      fontWeight: '600',
                                                      color: '#111827',
                                                      margin: 0
                                                    }}>
                                                      {vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Vendor'}
                                                    </p>
                                                  </div>
                                                  {vendor.email && (
                                                    <p style={{
                                                      fontSize: '0.8125rem',
                                                      color: '#6b7280',
                                                      margin: '0 0 0.5rem 0',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '0.25rem'
                                                    }}>
                                                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                        email
                                                      </span>
                                                      {vendor.email}
                                                    </p>
                                                  )}
                                                </div>
                                                {/* Status Badge */}
                                                <div style={{
                                                  padding: '0.375rem 0.75rem',
                                                  borderRadius: '0.5rem',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '600',
                                                  backgroundColor: 
                                                    status === 'accepted' ? '#d1fae5' :
                                                    status === 'rejected' ? '#fee2e2' :
                                                    '#fef3c7',
                                                  color:
                                                    status === 'accepted' ? '#065f46' :
                                                    status === 'rejected' ? '#991b1b' :
                                                    '#92400e',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </div>
                                              </div>

                                              {/* Details Section */}
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {/* Attendees */}
                                                {request.attendees && request.attendees.length > 0 && (
                                                  <div style={{ 
                                                    padding: '0.75rem',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #e5e7eb'
                                                  }}>
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      fontWeight: '600',
                                                      color: '#374151',
                                                      margin: '0 0 0.5rem 0',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '0.25rem'
                                                    }}>
                                                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                        people
                                                      </span>
                                                      Attendees ({request.attendees.length})
                                                    </p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                      {request.attendees.map((attendee, idx) => (
                                                        <p key={idx} style={{
                                                          fontSize: '0.75rem',
                                                          color: '#6b7280',
                                                          margin: 0,
                                                          paddingLeft: '0.5rem'
                                                        }}>
                                                          • {attendee.name} <span style={{ color: '#9ca3af' }}>({attendee.email})</span>
                                                        </p>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Request Details Grid */}
                                                <div style={{ 
                                                  display: 'grid', 
                                                  gridTemplateColumns: 'repeat(2, 1fr)', 
                                                  gap: '0.5rem',
                                                  marginTop: request.attendees && request.attendees.length > 0 ? '0' : '0.5rem'
                                                }}>
                                                  {request.boothSize && (
                                                    <div style={{ 
                                                      padding: '0.5rem',
                                                      backgroundColor: '#f9fafb',
                                                      borderRadius: '0.375rem'
                                                    }}>
                                                      <p style={{ fontSize: '0.625rem', color: '#9ca3af', margin: '0 0 0.25rem 0', fontWeight: '500' }}>
                                                        Booth Size
                                                      </p>
                                                      <p style={{ fontSize: '0.75rem', color: '#111827', margin: 0, fontWeight: '500' }}>
                                                        {request.boothSize}
                                                      </p>
                                                    </div>
                                                  )}
                                                  {request.durationWeeks && (
                                                    <div style={{ 
                                                      padding: '0.5rem',
                                                      backgroundColor: '#f9fafb',
                                                      borderRadius: '0.375rem'
                                                    }}>
                                                      <p style={{ fontSize: '0.625rem', color: '#9ca3af', margin: '0 0 0.25rem 0', fontWeight: '500' }}>
                                                        Duration
                                                      </p>
                                                      <p style={{ fontSize: '0.75rem', color: '#111827', margin: 0, fontWeight: '500' }}>
                                                        {request.durationWeeks} week{request.durationWeeks !== 1 ? 's' : ''}
                                                      </p>
                                                    </div>
                                                  )}
                                                  {request.boothLocation && (
                                                    <div style={{ 
                                                      padding: '0.5rem',
                                                      backgroundColor: '#f9fafb',
                                                      borderRadius: '0.375rem',
                                                      gridColumn: 'span 2'
                                                    }}>
                                                      <p style={{ fontSize: '0.625rem', color: '#9ca3af', margin: '0 0 0.25rem 0', fontWeight: '500' }}>
                                                        Location
                                                      </p>
                                                      <p style={{ fontSize: '0.75rem', color: '#111827', margin: 0, fontWeight: '500' }}>
                                                        {request.boothLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Message */}
                                                {request.message && (
                                                  <div style={{ 
                                                    marginTop: '0.5rem',
                                                    padding: '0.75rem',
                                                    backgroundColor: '#fef3c7',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #fde68a'
                                                  }}>
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      fontWeight: '500',
                                                      color: '#92400e',
                                                      margin: '0 0 0.25rem 0'
                                                    }}>
                                                      Message:
                                                    </p>
                                                    <p style={{
                                                      fontSize: '0.75rem',
                                                      color: '#78350f',
                                                      margin: 0,
                                                      fontStyle: 'italic'
                                                    }}>
                                                      "{request.message}"
                                                    </p>
                                                  </div>
                                                )}

                                                {/* Request Date */}
                                                {request.createdAt && (
                                                  <p style={{
                                                    fontSize: '0.6875rem',
                                                    color: '#9ca3af',
                                                    margin: '0.5rem 0 0 0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                  }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>
                                                      schedule
                                                    </span>
                                                    Requested: {new Date(request.createdAt).toLocaleDateString('en-US', { 
                                                      year: 'numeric', 
                                                      month: 'short', 
                                                      day: 'numeric' 
                                                    })}
                                                  </p>
                                                )}
                                              </div>

                                              {/* Action Buttons (only show for pending) */}
                                              {status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                                  <button
                                                    onClick={() => handleVendorRequestStatus(request._id, 'accepted', event.id)}
                                                    disabled={isProcessing}
                                                    style={{
                                                      flex: 1,
                                                      padding: '0.625rem 1rem',
                                                      borderRadius: '0.5rem',
                                                      border: 'none',
                                                      backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
                                                      color: '#FFFFFF',
                                                      fontSize: '0.8125rem',
                                                      fontWeight: '500',
                                                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      gap: '0.5rem',
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
                                                      flex: 1,
                                                      padding: '0.625rem 1rem',
                                                      borderRadius: '0.5rem',
                                                      border: 'none',
                                                      backgroundColor: isProcessing ? '#9ca3af' : '#ef4444',
                                                      color: '#FFFFFF',
                                                      fontSize: '0.8125rem',
                                                      fontWeight: '500',
                                                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      gap: '0.5rem',
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

      {/* Create Event Modal */}
      {isCreateModalOpen && (
                          <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setIsCreateModalOpen(false);
          setActiveCreateTab('bazaar');
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
                <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1D3557',
                margin: 0
              }}>
                Create New Event
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setActiveCreateTab('bazaar');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              {[
                { id: 'bazaar', label: 'Bazaar' },
                { id: 'trip', label: 'Trip' },
                { id: 'conference', label: 'Conference' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCreateTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: activeCreateTab === tab.id ? '600' : '400',
                    color: activeCreateTab === tab.id ? '#1D3557' : '#6b7280',
                    borderBottom: activeCreateTab === tab.id ? '3px solid #1D3557' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (activeCreateTab !== tab.id) {
                      e.target.style.color = '#1D3557';
                  }
                }}
                onMouseLeave={(e) => {
                    if (activeCreateTab !== tab.id) {
                      e.target.style.color = '#6b7280';
                  }
                }}
              >
                  {tab.label}
              </button>
              ))}
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              {activeCreateTab === 'bazaar' && (
                <BazaarForm
                  onSubmit={handleBazaarCreate}
                  loading={creating}
                  submitLabel="Create Bazaar"
                  loadingLabel="Creating..."
                />
              )}
              {activeCreateTab === 'trip' && (
                <TripForm
                  onSubmit={handleTripCreate}
                  loading={creating}
                  submitLabel="Create Trip"
                  loadingLabel="Creating..."
                />
              )}
              {activeCreateTab === 'conference' && (
                <ConferenceForm
                  onSubmit={handleConferenceCreate}
                  loading={creating}
                  submitLabel="Create Conference"
                  loadingLabel="Creating..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirmModal && eventToArchive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            cancelArchiveEvent();
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#fef3c7'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '1.5rem',
                  color: '#f59e0b'
                }}>
                  warning
                </span>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#92400e',
                  margin: 0
                }}>
                  Archive Event
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '1.5rem'
            }}>
              <p style={{
                fontSize: '1rem',
                color: '#374151',
                margin: 0,
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                Are you sure you want to archive <strong>"{eventToArchive.title}"</strong>?
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.5'
              }}>
                This will hide the event from all users except Events Office. You can unarchive it later if needed.
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#f9fafb'
            }}>
              <button
                onClick={cancelArchiveEvent}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveEvent}
                disabled={processingIds[eventToArchive.id]}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#8b5cf6',
                  color: '#FFFFFF',
                  cursor: processingIds[eventToArchive.id] ? 'not-allowed' : 'pointer',
                  opacity: processingIds[eventToArchive.id] ? 0.6 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!processingIds[eventToArchive.id]) {
                    e.target.style.backgroundColor = '#7c3aed';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processingIds[eventToArchive.id]) {
                    e.target.style.backgroundColor = '#8b5cf6';
                  }
                }}
              >
                {processingIds[eventToArchive.id] ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirmModal && eventToArchive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            cancelArchiveEvent();
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#fef3c7'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '1.5rem',
                  color: '#f59e0b'
                }}>
                  warning
                </span>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#92400e',
                  margin: 0
                }}>
                  Archive Event
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '1.5rem'
            }}>
              <p style={{
                fontSize: '1rem',
                color: '#374151',
                margin: 0,
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                Are you sure you want to archive <strong>"{eventToArchive.title}"</strong>?
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.5'
              }}>
                This will hide the event from all users except Events Office. You can unarchive it later if needed.
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#f9fafb'
            }}>
              <button
                onClick={cancelArchiveEvent}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveEvent}
                disabled={processingIds[eventToArchive.id]}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#8b5cf6',
                  color: '#FFFFFF',
                  cursor: processingIds[eventToArchive.id] ? 'not-allowed' : 'pointer',
                  opacity: processingIds[eventToArchive.id] ? 0.6 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!processingIds[eventToArchive.id]) {
                    e.target.style.backgroundColor = '#7c3aed';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processingIds[eventToArchive.id]) {
                    e.target.style.backgroundColor = '#8b5cf6';
                  }
                }}
              >
                {processingIds[eventToArchive.id] ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archived Events Modal */}
      {showArchivedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowArchivedModal(false);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Archived Events
              </h2>
              <button
                onClick={() => setShowArchivedModal(false)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              {loadingArchived ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  Loading archived events...
                </div>
              ) : archivedEvents.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  No archived events found.
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Event Name
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Type
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          End Date
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Location
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                      {archivedEvents.map(event => {
                        const isProcessing = processingIds[event.id];
                        
                        return (
                          <tr key={event.id} style={{
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
                              {formatTableDate(event.endDate)}
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
                              textAlign: 'right'
                            }}>
                              <button
                                onClick={() => handleUnarchiveEvent(event)}
                                disabled={isProcessing}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  backgroundColor: '#8b5cf6',
                                  color: '#FFFFFF',
                                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                                  opacity: isProcessing ? 0.5 : 1,
                                  fontSize: '0.875rem',
                                  fontWeight: '500'
                                }}
                                title="Unarchive Event"
                                onMouseEnter={(e) => {
                                  if (!isProcessing) {
                                    e.target.style.backgroundColor = '#7c3aed';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isProcessing) {
                                    e.target.style.backgroundColor = '#8b5cf6';
                                  }
                                }}
                              >
                                {isProcessing ? 'Processing...' : 'Unarchive'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendees Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowReportModal(false);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '1400px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Event Attendees Report
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              {/* Filters */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Filter Report
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Event Name
                    </label>
                    <select
                      value={reportFilters.eventName}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, eventName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="">All Events</option>
                      {availableEventNames.map((name, index) => (
                        <option key={index} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Event Type
                    </label>
                    <select
                      value={reportFilters.eventType}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, eventType: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="">All Types</option>
                      <option value="bazaar">Bazaar</option>
                      <option value="trip">Trip</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                      <option value="booth">Booth</option>
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem'
                }}>
                  <button
                    onClick={loadAttendeesReport}
                    disabled={loadingReport}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: '#1e40af',
                      color: '#FFFFFF',
                      cursor: loadingReport ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      opacity: loadingReport ? 0.5 : 1
                    }}
                  >
                    {loadingReport ? 'Loading...' : 'Apply Filters'}
                  </button>
                  <button
                    onClick={() => {
                      setReportFilters({
                        eventName: '',
                        eventType: '',
                        startDate: '',
                        endDate: ''
                      });
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Report Data */}
              {loadingReport ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  Loading report...
                </div>
              ) : reportData && reportData.report ? (
                <div>
                  {/* Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#0369a1',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Total Events
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#0c4a6e'
                      }}>
                        {reportData.report.summary.totalEvents}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#166534',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Total Attendees
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#14532d'
                      }}>
                        {reportData.report.summary.totalAttendees}
                      </div>
                    </div>
                  </div>

                  {/* Events Table */}
                  {reportData.report.byEvent && reportData.report.byEvent.length > 0 ? (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Event Name
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Type
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Date
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Location
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Attendees
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Capacity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.report.byEvent.map((event, index) => (
                            <tr key={index} style={{
                              borderBottom: index < reportData.report.byEvent.length - 1 ? '1px solid #e5e7eb' : 'none'
                            }}>
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
                                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {event.location || 'N/A'}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827',
                                textAlign: 'center'
                              }}>
                                {event.actualAttendees || 0}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                textAlign: 'center'
                              }}>
                                {event.capacity || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      color: '#6b7280'
                    }}>
                      No events found matching the filters.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  No report data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales Report Modal */}
      {showSalesReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSalesReportModal(false);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '1400px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Sales Report
              </h2>
              <button
                onClick={() => setShowSalesReportModal(false)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              {/* Filters */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Filter & Sort Report
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Event Type
                    </label>
                    <select
                      value={salesReportFilters.eventType}
                      onChange={(e) => setSalesReportFilters(prev => ({ ...prev, eventType: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="">All Types</option>
                      <option value="bazaar">Bazaar</option>
                      <option value="trip">Trip</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                      <option value="booth">Booth</option>
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={salesReportFilters.startDate}
                      onChange={(e) => setSalesReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={salesReportFilters.endDate}
                      onChange={(e) => setSalesReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Sort By Revenue
                    </label>
                    <select
                      value={salesReportFilters.sortBy}
                      onChange={(e) => setSalesReportFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="">Default (Date)</option>
                      <option value="revenue-asc">Revenue: Least to Greatest</option>
                      <option value="revenue-desc">Revenue: Greatest to Least</option>
                    </select>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem'
                }}>
                  <button
                    onClick={loadSalesReport}
                    disabled={loadingSalesReport}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: '#1e40af',
                      color: '#FFFFFF',
                      cursor: loadingSalesReport ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      opacity: loadingSalesReport ? 0.5 : 1
                    }}
                  >
                    {loadingSalesReport ? 'Loading...' : 'Apply Filters'}
                  </button>
                  <button
                    onClick={() => {
                      setSalesReportFilters({
                        eventType: '',
                        startDate: '',
                        endDate: '',
                        sortBy: ''
                      });
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Report Data */}
              {loadingSalesReport ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  Loading sales report...
                </div>
              ) : salesReportData && salesReportData.report ? (
                <div>
                  {/* Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#0369a1',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Total Events
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#0c4a6e'
                      }}>
                        {salesReportData.report.summary.totalEvents}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#166534',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Total Revenue
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#14532d'
                      }}>
                        ${salesReportData.report.summary.totalRevenue.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#fef3c7',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #fde68a'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#92400e',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Total Payments
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#78350f'
                      }}>
                        {salesReportData.report.summary.totalPayments}
                      </div>
                    </div>
                  </div>

                  {/* Events Table */}
                  {salesReportData.report.byEvent && salesReportData.report.byEvent.length > 0 ? (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Event Name
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Type
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Date
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Price
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Revenue
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Refunds
                            </th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Payments
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesReportData.report.byEvent.map((event, index) => (
                            <tr key={index} style={{
                              borderBottom: index < salesReportData.report.byEvent.length - 1 ? '1px solid #e5e7eb' : 'none'
                            }}>
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
                                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                ${(event.price || 0).toFixed(2)}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#059669',
                                textAlign: 'center'
                              }}>
                                ${(event.revenue || 0).toFixed(2)}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#b91c1c',
                                textAlign: 'center'
                              }}>
                                -${(event.refundedAmount || 0).toFixed(2)}{event.refundCount ? ` (${event.refundCount})` : ''}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                textAlign: 'center'
                              }}>
                                {event.paymentCount || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      color: '#6b7280'
                    }}>
                      No events found matching the filters.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280'
                }}>
                  No sales data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ratings & Comments Modal */}
      {showRatingsModal && selectedEventForRatings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => {
          setShowRatingsModal(false);
          setSelectedEventForRatings(null);
          setRatingsData(null);
        }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#1D3557',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  Ratings & Comments
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: 0
                }}>
                  {selectedEventForRatings.title || selectedEventForRatings.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRatingsModal(false);
                  setSelectedEventForRatings(null);
                  setRatingsData(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1D3557';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              {loadingRatings ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  Loading ratings and comments...
                </div>
              ) : ratingsData ? (
                <>
                  {/* Ratings Summary */}
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2rem',
                      flexWrap: 'wrap'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem'
                        }}>
                          Average Rating
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1D3557'
                          }}>
                            {ratingsData.ratings?.average?.toFixed(1) || '0.0'}
                          </span>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '2rem',
                            color: '#fbbf24'
                          }}>
                            star
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem'
                        }}>
                          Total Ratings
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#1D3557'
                        }}>
                          {ratingsData.ratings?.count || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem'
                        }}>
                          Total Comments
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#1D3557'
                        }}>
                          {ratingsData.comments?.length || 0}
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    {ratingsData.ratings?.distribution && (
                      <div style={{
                        marginTop: '1.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.75rem'
                        }}>
                          Rating Distribution
                        </div>
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = ratingsData.ratings.distribution[rating] || 0;
                          const total = ratingsData.ratings.count || 1;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={rating} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              marginBottom: '0.5rem'
                            }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#374151',
                                minWidth: '3rem'
                              }}>
                                {rating} ⭐
                              </div>
                              <div style={{
                                flex: 1,
                                height: '0.5rem',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '0.25rem',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  backgroundColor: '#fbbf24',
                                  transition: 'width 0.3s ease'
                                }}></div>
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                minWidth: '3rem',
                                textAlign: 'right'
                              }}>
                                {count} ({percentage.toFixed(0)}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1D3557',
                      marginBottom: '1rem'
                    }}>
                      Comments ({ratingsData.comments?.length || 0})
                    </h3>
                    {ratingsData.comments && ratingsData.comments.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {ratingsData.comments.map((comment) => (
                          <div
                            key={comment._id}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start'
                            }}>
                              <div>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  marginBottom: '0.25rem'
                                }}>
                                  {comment.user?.firstName && comment.user?.lastName
                                    ? `${comment.user.firstName} ${comment.user.lastName}`
                                    : comment.user?.email || 'Anonymous'}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  {comment.user?.userType || 'User'} • {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Unknown date'}
                                </div>
                              </div>
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#374151',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {comment.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        No comments yet for this event.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  No ratings or comments data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Side Panel */}
      {showFilterPanel && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              transition: 'opacity 0.3s'
            }}
            onClick={() => setShowFilterPanel(false)}
          />
          
          {/* Side Panel */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            backgroundColor: '#FFFFFF',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            transform: showFilterPanel ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out',
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              backgroundColor: '#FFFFFF',
              zIndex: 10
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Filter & Sort
              </h4>
              <button
                onClick={() => setShowFilterPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  borderRadius: '0.375rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#111827';
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

            {/* Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
              {/* Sort By Section */}
              <div>
                <h5 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Sort By
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { value: 'suggested', label: 'Suggested' },
                    { value: 'date-asc', label: 'Date (Ascending)' },
                    { value: 'date-desc', label: 'Date (Descending)' }
                  ].map(option => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}
                    >
                      <input
                        type="radio"
                        name="sortBy"
                        value={option.value}
                        checked={sortBy === option.value}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                          width: '1rem',
                          height: '1rem',
                          cursor: 'pointer',
                          accentColor: '#1e40af'
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Type Section */}
              <div>
                <h5 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Event Type
                </h5>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    handleSearch();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1e40af')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                >
                  <option value="all">All Events</option>
                  <option value="bazaar">Bazaars</option>
                  <option value="trip">Trips</option>
                  <option value="workshop">Workshops</option>
                  <option value="conference">Conferences</option>
                  <option value="booth">Booths</option>
                </select>
              </div>

              {/* Professor Name Filter - Only show for workshop */}
              {filter === 'workshop' && (
                <div>
                  <h5 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0,
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Professor Name
                  </h5>
                  <select
                    value={professorNameFilter}
                    onChange={(e) => setProfessorNameFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1e40af';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <option value="">All Professors</option>
                    {availableProfessors.map(prof => (
                      <option key={prof} value={prof}>{prof}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location Filter */}
              <div>
                <h5 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Location
                </h5>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  <option value="">All Locations</option>
                  {availableLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <h5 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Date
                </h5>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1e40af';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Clear Filters Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setProfessorNameFilter('');
                    setLocationFilter('');
                    setDateFilter('');
                    setFilter('all');
                    setSortBy('suggested');
                    handleSearch();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#FFFFFF',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: '300px',
            maxWidth: '500px',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
            {toast.message}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default EventsOfficeEventsView;

