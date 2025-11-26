import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import professorApiService from '../api/professorApi';
import { notificationApiService } from '../api/notificationApi';

const MyWorkshops = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    workshopName: '',
    location: 'GUC Cairo',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    shortDescription: '',
    fullAgenda: '',
    facultyResponsible: 'MET',
    professorsParticipating: '',
    requiredBudget: '',
    fundingSource: 'GUC',
    extraRequiredResources: '',
    capacity: ''
  });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedWorkshopForParticipants, setSelectedWorkshopForParticipants] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [workshopStatus, setWorkshopStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    // Exact match
    if (currentPath === path) return true;
    // For dashboard, check if it's exactly /dashboard (not /dashboard/something)
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    // For other routes, check if current path starts with the route path
    return currentPath.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
      if (showNotificationsDropdown && !event.target.closest('[data-notifications-dropdown]')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown, showNotificationsDropdown]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const [notificationsResult, countResult] = await Promise.all([
        notificationApiService.getUserNotifications({ limit: 20, unreadOnly: false }),
        notificationApiService.getUnreadCount()
      ]);
      
      if (notificationsResult.success && notificationsResult.data?.data) {
        setNotifications(notificationsResult.data.data.notifications || notificationsResult.data.data || []);
      }
      
      if (countResult.success) {
        setUnreadCount(countResult.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Load notifications on mount and poll for updates
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    // Listen for real-time notifications and update UI immediately
    const onNewNotification = (e) => {
      try {
        const notif = e.detail;
        if (!notif) return;
        setNotifications(prev => [notif, ...(prev || [])]);
        setUnreadCount(prev => (prev || 0) + 1);
      } catch (err) {
        console.error('Error handling new_notification event:', err);
      }
    };
    window.addEventListener('new_notification', onNewNotification);
    return () => {
      clearInterval(interval);
      window.removeEventListener('new_notification', onNewNotification);
    };
  }, [loadNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationApiService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev => prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationApiService.markAllAsRead();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Format notification date
  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadWorkshops = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Load both workshops and status in parallel
      const [workshopsResult, statusResult] = await Promise.all([
        professorApiService.getMyWorkshops(),
        professorApiService.getMyWorkshopsStatus()
      ]);

      if (workshopsResult.success) {
        let workshopsData = Array.isArray(workshopsResult.data) ? workshopsResult.data : [];
        
        // Merge status data if available
        if (statusResult.success && statusResult.data && statusResult.data.workshops) {
          setWorkshopStatus(statusResult.data);
          const statusMap = new Map();
          statusResult.data.workshops.forEach(status => {
            statusMap.set(status.id, status);
          });
          
          workshopsData = workshopsData.map(workshop => {
            const status = statusMap.get(workshop._id || workshop.id);
            if (status) {
              return {
                ...workshop,
                editRequests: status.editRequests,
                rejectionReason: status.rejectionReason,
                hasEditRequests: status.hasEditRequests,
                hasRejectionReason: status.hasRejectionReason,
                submittedAt: status.submittedAt,
                lastUpdated: status.lastUpdated
              };
            }
            return workshop;
          });
        }
        
        setWorkshops(workshopsData);
      } else {
        setError(workshopsResult.message || 'Failed to load workshops');
        setWorkshops([]);
      }
    } catch (err) {
      console.error('Error loading workshops:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setWorkshops([]);
    } finally {
      setLoading(false);
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWorkshops();
    }
  }, [user, loadWorkshops]);


  useEffect(() => {
    if (location.pathname === '/professor/my-workshops' && user) {
      loadWorkshops();
      // Check if create=true is in URL params
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('create') === 'true') {
        setShowCreateForm(true);
        // Clean up URL
        window.history.replaceState({}, '', '/professor/my-workshops');
      }
    }
  }, [location.pathname, location.search, user, loadWorkshops]);

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

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#059669',
      rejected: '#dc2626',
      needs_edits: '#d97706'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      needs_edits: 'Needs Edits'
    };
    return labels[status?.toLowerCase()] || status;
  };

  const formatTableDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleRowExpansion = (workshopId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workshopId)) {
        newSet.delete(workshopId);
      } else {
        newSet.add(workshopId);
      }
      return newSet;
    });
  };

  const handleEditClick = (workshop) => {
    // Format dates for the form
    const startDate = workshop.startDate ? new Date(workshop.startDate).toISOString().split('T')[0] : '';
    const endDate = workshop.endDate ? new Date(workshop.endDate).toISOString().split('T')[0] : '';
    
    // Format registration deadline as datetime-local (YYYY-MM-DDTHH:mm)
    let registrationDeadline = '';
    if (workshop.registrationDeadline) {
      const deadlineDate = new Date(workshop.registrationDeadline);
      const year = deadlineDate.getFullYear();
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
      const day = String(deadlineDate.getDate()).padStart(2, '0');
      const hours = String(deadlineDate.getHours()).padStart(2, '0');
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
      registrationDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Format times
    const startTime = workshop.startTime || '';
    const endTime = workshop.endTime || '';

    setEditFormData({
      id: workshop._id,
      workshopName: workshop.workshopName || '',
      location: workshop.location || 'GUC Cairo',
      startDate: startDate,
      endDate: endDate,
      startTime: startTime,
      endTime: endTime,
      registrationDeadline: registrationDeadline,
      shortDescription: workshop.shortDescription || '',
      fullAgenda: workshop.fullAgenda || '',
      facultyResponsible: workshop.facultyResponsible || 'MET',
      professorsParticipating: Array.isArray(workshop.professorsParticipating) 
        ? workshop.professorsParticipating.join(', ') 
        : workshop.professorsParticipating || '',
      requiredBudget: workshop.requiredBudget || '',
      fundingSource: workshop.fundingSource || 'GUC',
      extraRequiredResources: workshop.extraRequiredResources || '',
      capacity: workshop.capacity || ''
    });
    setSelectedWorkshop(workshop);
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate required fields
      if (!editFormData.workshopName || !editFormData.startDate || !editFormData.endDate || 
          !editFormData.startTime || !editFormData.endTime || !editFormData.registrationDeadline ||
          !editFormData.shortDescription || !editFormData.fullAgenda || !editFormData.facultyResponsible ||
          !editFormData.professorsParticipating || !editFormData.requiredBudget || !editFormData.fundingSource ||
          !editFormData.capacity) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      // Format professors participating as array
      const professorsArray = editFormData.professorsParticipating
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (professorsArray.length === 0) {
        setError('Please provide at least one participating professor');
        setSaving(false);
        return;
      }

      // Validate dates
      const startDateTime = new Date(`${editFormData.startDate}T${editFormData.startTime}`);
      const endDateTime = new Date(`${editFormData.endDate}T${editFormData.endTime}`);
      const registrationDeadlineDate = new Date(editFormData.registrationDeadline);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || isNaN(registrationDeadlineDate.getTime())) {
        setError('Invalid date or time format');
        setSaving(false);
        return;
      }

      if (endDateTime <= startDateTime) {
        setError('End date and time must be after start date and time');
        setSaving(false);
        return;
      }

      if (registrationDeadlineDate >= startDateTime) {
        setError('Registration deadline must be before the workshop start date');
        setSaving(false);
        return;
      }

      // Validate capacity and budget
      const capacity = parseInt(editFormData.capacity);
      const budget = parseFloat(editFormData.requiredBudget);

      if (isNaN(capacity) || capacity <= 0) {
        setError('Capacity must be a positive number');
        setSaving(false);
        return;
      }

      if (isNaN(budget) || budget < 0) {
        setError('Required budget must be a valid number');
        setSaving(false);
        return;
      }

      // Validate short description length
      if (editFormData.shortDescription.trim().length > 200) {
        setError('Short description must be 200 characters or less');
        setSaving(false);
        return;
      }

      // Prepare data for submission
      const submitData = {
        workshopName: editFormData.workshopName.trim(),
        location: editFormData.location,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        registrationDeadline: registrationDeadlineDate.toISOString(),
        shortDescription: editFormData.shortDescription.trim(),
        fullAgenda: editFormData.fullAgenda.trim(),
        facultyResponsible: editFormData.facultyResponsible,
        professorsParticipating: professorsArray,
        requiredBudget: budget,
        fundingSource: editFormData.fundingSource,
        extraRequiredResources: editFormData.extraRequiredResources?.trim() || undefined,
        capacity: capacity
      };

      console.log('Submitting workshop update:', submitData);
      const result = await professorApiService.updateWorkshop(editFormData.id, submitData);
      console.log('Update result:', result);
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedWorkshop(null);
        setError('');
        // Reload workshops and status to reflect cleared edit requests
        await loadWorkshops();
      } else {
        setError(result.message || result.error?.message || 'Failed to update workshop');
      }
    } catch (err) {
      console.error('Error updating workshop:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setCreateSuccess(false);

    // Validate required fields
    const requiredFields = [
      'workshopName', 'location', 'startDate', 'endDate', 'startTime', 
      'endTime', 'registrationDeadline', 'shortDescription', 'fullAgenda',
      'facultyResponsible', 'professorsParticipating', 'requiredBudget',
      'fundingSource', 'capacity'
    ];

    const missingFields = requiredFields.filter(field => !createFormData[field] || createFormData[field].toString().trim() === '');
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setCreating(false);
      return;
    }

    // Validate short description length
    if (createFormData.shortDescription.length > 200) {
      setError('Short description must be 200 characters or less');
      setCreating(false);
      return;
    }

    // Validate dates
    const startDate = new Date(`${createFormData.startDate}T${createFormData.startTime}`);
    const endDate = new Date(`${createFormData.endDate}T${createFormData.endTime}`);
    const registrationDeadline = new Date(createFormData.registrationDeadline);

    if (endDate <= startDate) {
      setError('End date and time must be after start date and time');
      setCreating(false);
      return;
    }

    if (registrationDeadline >= startDate) {
      setError('Registration deadline must be before the workshop start date');
      setCreating(false);
      return;
    }

    // Validate capacity and budget
    if (parseInt(createFormData.capacity) <= 0) {
      setError('Capacity must be greater than 0');
      setCreating(false);
      return;
    }

    if (parseFloat(createFormData.requiredBudget) < 0) {
      setError('Required budget cannot be negative');
      setCreating(false);
      return;
    }

    try {
      // Format professors participating as array
      const professorsArray = createFormData.professorsParticipating
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (professorsArray.length === 0) {
        setError('Please provide at least one participating professor');
        setCreating(false);
        return;
      }

      // Prepare data for submission
      const submitData = {
        workshopName: createFormData.workshopName.trim(),
        location: createFormData.location,
        startDate: new Date(`${createFormData.startDate}T${createFormData.startTime}`).toISOString(),
        endDate: new Date(`${createFormData.endDate}T${createFormData.endTime}`).toISOString(),
        startTime: createFormData.startTime,
        endTime: createFormData.endTime,
        registrationDeadline: new Date(createFormData.registrationDeadline).toISOString(),
        shortDescription: createFormData.shortDescription.trim(),
        fullAgenda: createFormData.fullAgenda.trim(),
        facultyResponsible: createFormData.facultyResponsible,
        professorsParticipating: professorsArray,
        requiredBudget: parseFloat(createFormData.requiredBudget),
        fundingSource: createFormData.fundingSource,
        extraRequiredResources: createFormData.extraRequiredResources.trim() || undefined,
        capacity: parseInt(createFormData.capacity)
      };

      console.log('Submitting workshop data:', submitData);
      const result = await professorApiService.createWorkshop(submitData);
      
      if (result.success) {
        setCreateSuccess(true);
        setError('');
        // Reset form
        setCreateFormData({
          workshopName: '',
          location: 'GUC Cairo',
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          registrationDeadline: '',
          shortDescription: '',
          fullAgenda: '',
          facultyResponsible: 'MET',
          professorsParticipating: '',
          requiredBudget: '',
          fundingSource: 'GUC',
          extraRequiredResources: '',
          capacity: ''
        });
        // Reload workshops
        await loadWorkshops();
        // Hide form after 2 seconds
        setTimeout(() => {
          setShowCreateForm(false);
          setCreateSuccess(false);
        }, 2000);
      } else {
        setError(result.message || 'Failed to create workshop');
      }
    } catch (err) {
      console.error('Error creating workshop:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getEventTypeImage = (type) => {
    const imageMap = {
      workshop: '/assets/images/workshop.jpg',
      conference: '/assets/images/conference.jpg',
      bazaar: '/assets/images/bazaar.jpg',
      trip: '/assets/images/trip.jpg',
      booth: '/assets/images/booth.jpg'
    };
    return imageMap[type?.toLowerCase()] || null;
  };

  const getEventTypeColor = (type) => {
    const colorMap = {
      workshop: '#8b5cf6',
      conference: '#3b82f6',
      bazaar: '#f59e0b',
      trip: '#10b981',
      booth: '#ec4899'
    };
    return colorMap[type?.toLowerCase()] || '#6b7280';
  };

  const handleViewParticipants = async (workshop) => {
    setSelectedWorkshopForParticipants(workshop);
    setShowParticipantsModal(true);
    setLoadingParticipants(true);
    setParticipants([]);

    try {
      console.log('📋 Loading participants for workshop:', workshop._id, workshop.title);
      const result = await professorApiService.getEventRegistrations(workshop._id);
      console.log('📋 Participants API response:', result);
      
      if (result.success && result.data && result.data.registrations) {
        console.log('✅ Found participants:', result.data.registrations.length);
        setParticipants(result.data.registrations);
      } else if (result.success && Array.isArray(result.data)) {
        // Handle case where registrations are returned directly as array
        console.log('✅ Found participants (array format):', result.data.length);
        setParticipants(result.data);
      } else {
        console.log('⚠️ No participants found or unexpected response format');
        setParticipants([]);
      }
    } catch (err) {
      console.error('❌ Error loading participants:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const getRemainingSpots = (workshop) => {
    const capacity = workshop.capacity || 0;
    const registered = workshop.registeredCount || 0;
    return Math.max(0, capacity - registered);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
    }}>
      {/* Header/Navbar */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2.5rem',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0,
              cursor: 'pointer'
            }}>
              Bindly
            </h2>
          </Link>
          </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          {/* Notifications Bell */}
          <div style={{ position: 'relative' }} data-notifications-dropdown>
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowLogoutDropdown(false);
                if (!showNotificationsDropdown) {
                  loadNotifications();
                }
              }}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '1.5rem',
                color: '#1D3557'
              }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  backgroundColor: '#ef4444',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '1.125rem',
                  height: '1.125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  border: '2px solid #FFFFFF'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 1001,
                width: '360px',
                maxHeight: '500px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
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
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        padding: '0.25rem 0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.textDecoration = 'none';
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{
                  overflowY: 'auto',
                  maxHeight: '400px'
                }}>
                  {loadingNotifications ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                          if ((notification.type === 'event_announcement' || notification.type === 'new_event') && notification.metadata?.eventId) {
                            navigate(`/professor/all-events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            (notification.type === 'event_reminder' || 
                             notification.type === 'workshop_reminder' || 
                             notification.type === 'trip_reminder' ||
                             notification.type === 'gym_session_reminder') && 
                            (notification.metadata?.eventId || notification.metadata?.workshopId || notification.metadata?.tripId || notification.metadata?.gymSessionId)
                          ) {
                            // Navigate to My Events for reminders
                            navigate(`/professor/events`);
                            setShowNotificationsDropdown(false);
                          } else if (
                            notification.type === 'new_loyalty_partner' || 
                            notification.type === 'loyalty_partner_added' ||
                            (notification.type === 'system' && notification.metadata?.vendorId)
                          ) {
                            // Navigate to Loyalty Partners page
                            navigate(`/professor/loyalty-vendors`);
                            setShowNotificationsDropdown(false);
                          }
                        }}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          backgroundColor: notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
                              : '#eff6ff',
                          borderLeft: notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder') && !notification.isRead
                            ? '3px solid #ef4444'
                            : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#f9fafb' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fee2e2'
                              : '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.isRead 
                            ? '#FFFFFF' 
                            : (notification.priority === 'high' && (notification.type === 'event_reminder' || notification.type === 'workshop_reminder' || notification.type === 'trip_reminder' || notification.type === 'gym_session_reminder'))
                              ? '#fef2f2'
                              : '#eff6ff';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '0.875rem',
                              fontWeight: notification.isRead ? '400' : '600',
                              color: '#1D3557',
                              margin: 0,
                              marginBottom: '0.25rem'
                            }}>
                              {notification.title || notification.message}
                            </p>
                            {notification.message && notification.message !== notification.title && (
                              <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                margin: 0
                              }}>
                                {notification.message}
                              </p>
                            )}
                            <p style={{
                              fontSize: '0.625rem',
                              color: '#9ca3af',
                              margin: '0.5rem 0 0 0'
                            }}>
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              borderRadius: '50%',
                              backgroundColor: '#1e40af',
                              flexShrink: 0,
                              marginTop: '0.25rem'
                            }} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
                Professor
              </p>
            </div>
          <div 
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
          >
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
              </div>
            )}
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '150px'
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    logout
                  </span>
                  Logout
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

      {/* Horizontal Menu Bar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/professor/all-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/all-events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Events
          </Link>
          <Link
            to="/professor/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Events
          </Link>
          <Link
            to="/professor/my-workshops"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/my-workshops') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/my-workshops') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/my-workshops') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Workshops
          </Link>
          <Link
            to="/professor/favorites"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/favorites') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/favorites') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/favorites') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Favorites
          </Link>
          <Link
            to="/gym-schedule"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym-schedule') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym-schedule') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym-schedule') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            View Gym Sessions
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f6f7f8'
      }}>
        {/* Content Wrapper with Margins */}
        <div style={{
          flex: 1,
          padding: '2rem 0',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          <div style={{
            marginLeft: '4rem',
            marginRight: '4rem'
          }}>
            {/* Content - Split Screen Layout */}
            <div style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              backgroundColor: '#f6f7f8'
            }}>
          {/* Left Side - Workshops List */}
          <div style={{
            flex: showCreateForm ? 1 : 1,
          padding: '2rem',
          overflowY: 'auto',
            borderRight: showCreateForm ? '1px solid #e2e8f0' : 'none'
        }}>
          {/* Banner Header */}
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
              backgroundImage: 'url(/assets/images/workshop.jpg)',
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
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '2rem 2.5rem',
              color: '#FFFFFF'
            }}>
              <h3 style={{
                color: '#FFFFFF',
                fontSize: '1.75rem',
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                My Workshops
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.875rem',
                fontWeight: '400',
                margin: 0
              }}>
                View and manage your workshop submissions.
              </p>
            </div>
          </div>

          {/* Summary Section */}
          {!showCreateForm && workshopStatus && workshopStatus.summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Pending</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                  {workshopStatus.summary.pending || 0}
                </div>
              </div>
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Approved</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                  {workshopStatus.summary.approved || 0}
                </div>
              </div>
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Needs Edits</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                  {workshopStatus.summary.needsEdits || 0}
                </div>
              </div>
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Rejected</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                  {workshopStatus.summary.rejected || 0}
                </div>
              </div>
              {workshopStatus.summary.withEditRequests > 0 && (
                <div style={{
                  backgroundColor: '#FEF3C7',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #FCD34D',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>With Edit Requests</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>
                    {workshopStatus.summary.withEditRequests || 0}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Workshop Button - Below Banner */}
          {!showCreateForm && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  add_circle
                </span>
                Create Workshop
              </button>
            </div>
          )}

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
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px'
            }}>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading workshops...</p>
            </div>
          ) : workshops.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              textAlign: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#9ca3af', marginBottom: '1rem' }}>
                work_off
              </span>
              <h3 style={{ color: '#374151', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No Workshops Found
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                You haven't created any workshops yet.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1e40af',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e40af';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  add_circle
                </span>
                Create Your First Workshop
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem'
            }}>
                  {workshops.map((workshop) => {
                    const statusColors = {
                      pending: { bg: '#fef3c7', text: '#92400e' },
                      approved: { bg: '#d1fae5', text: '#065f46' },
                      rejected: { bg: '#fee2e2', text: '#991b1b' },
                      needs_edits: { bg: '#fed7aa', text: '#ea580c' }
                    };
                    const statusStyle = statusColors[workshop.status?.toLowerCase()] || statusColors.pending;
                const workshopTitle = workshop.workshopName || workshop.title || 'Untitled Workshop';

                    return (
                  <div
                    key={workshop._id}
                    onClick={() => handleEditClick(workshop)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      padding: 0,
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#1e40af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    {/* Workshop Image - Top Half */}
                    {getEventTypeImage('workshop') && (
                      <div style={{
                        width: '100%',
                        height: '180px',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#f3f4f6',
                        flexShrink: 0
                      }}>
                        <img
                          src={getEventTypeImage('workshop')}
                          alt="Workshop"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.backgroundColor = getEventTypeColor('workshop');
                            e.target.parentElement.style.display = 'flex';
                            e.target.parentElement.style.alignItems = 'center';
                            e.target.parentElement.style.justifyContent = 'center';
                            if (!e.target.parentElement.querySelector('.fallback-text')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-text';
                              fallback.textContent = 'WORKSHOP';
                              fallback.style.color = '#FFFFFF';
                              fallback.style.fontSize = '1.5rem';
                              fallback.style.fontWeight = '700';
                              e.target.parentElement.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    )}
                    
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{
                          padding: '0.375rem 0.875rem',
                          borderRadius: '0.5rem',
                          backgroundColor: getEventTypeColor('workshop'),
                          color: '#FFFFFF',
                          fontSize: '0.6875rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Workshop
                        </div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                          fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text
                            }}>
                              {getStatusLabel(workshop.status)}
                            </span>
                      </div>
                      
                      <h3 style={{
                        color: '#1D3557',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        marginTop: 0,
                        lineHeight: '1.4'
                      }}>
                        {workshopTitle}
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                        flex: 1
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          fontSize: '0.8125rem',
                          color: '#6b7280'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.125rem',
                            color: '#9ca3af'
                          }}>
                            calendar_today
                          </span>
                          <span>{formatDateOnly(workshop.startDate)}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          fontSize: '0.8125rem',
                          color: '#6b7280'
                        }}>
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.125rem',
                            color: '#9ca3af'
                          }}>
                            location_on
                          </span>
                          <span>{workshop.location}</span>
                        </div>
                        {workshop.capacity && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            fontSize: '0.8125rem',
                            color: '#6b7280'
                          }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '1.125rem',
                              color: '#9ca3af'
                            }}>
                              people
                            </span>
                            <span>
                              {workshop.registeredCount || 0} / {workshop.capacity} registered
                              {getRemainingSpots(workshop) > 0 && (
                                <span style={{ color: '#059669', fontWeight: '600', marginLeft: '0.5rem' }}>
                                  ({getRemainingSpots(workshop)} spots remaining)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Edit Requests and Rejection Reasons */}
                      {(workshop.hasEditRequests || workshop.hasRejectionReason) && (
                        <div style={{
                          marginBottom: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          {workshop.hasEditRequests && workshop.editRequests && (
                            <div style={{
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FCD34D'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#92400e'
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  edit_note
                                </span>
                                Edit Requests
                              </div>
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#78350f',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {workshop.editRequests}
                              </div>
                            </div>
                          )}
                          {workshop.hasRejectionReason && workshop.rejectionReason && (
                            <div style={{
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#FEE2E2',
                              border: '1px solid #FCA5A5'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#991b1b'
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                  cancel
                                </span>
                                Rejection Reason
                              </div>
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#7f1d1d',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {workshop.rejectionReason}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewParticipants(workshop);
                              }}
                              style={{
                            flex: 1,
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                                cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            gap: '0.25rem',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#047857';
                              }}
                              onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#059669';
                              }}
                            >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                groups
                              </span>
                          Participants
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(workshop);
                              }}
                              style={{
                            flex: 1,
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                            backgroundColor: '#1e40af',
                            color: '#FFFFFF',
                            border: 'none',
                                cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            gap: '0.25rem',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1e3a8a';
                              }}
                              onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#1e40af';
                              }}
                            >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                edit
                              </span>
                          Edit
                            </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Right Side - Create Workshop Form */}
          {showCreateForm && (
            <div style={{
              flex: 1,
              padding: '2rem',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  color: '#1D3557',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Create Workshop
                </h3>
                            <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData({
                      workshopName: '',
                      location: 'GUC Cairo',
                      startDate: '',
                      endDate: '',
                      startTime: '',
                      endTime: '',
                      registrationDeadline: '',
                      shortDescription: '',
                      fullAgenda: '',
                      facultyResponsible: 'MET',
                      professorsParticipating: '',
                      requiredBudget: '',
                      fundingSource: 'GUC',
                      extraRequiredResources: '',
                      capacity: ''
                    });
                    setError('');
                    setCreateSuccess(false);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                    padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                    color: '#6b7280'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                    close
                              </span>
                            </button>
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

              {createSuccess && (
                <div style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.875rem'
                }}>
                  Workshop created successfully!
                </div>
              )}

              <form onSubmit={handleCreateSubmit} style={{ maxWidth: '600px' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Workshop Name */}
                                <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Workshop Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="workshopName"
                      value={createFormData.workshopName}
                      onChange={handleCreateChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                                  </div>

                  {/* Location */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Location <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      name="location"
                      value={createFormData.location}
                      onChange={handleCreateChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="GUC Cairo">GUC Cairo</option>
                      <option value="GUC Berlin">GUC Berlin</option>
                    </select>
                                </div>

                  {/* Date and Time Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Start Date <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={createFormData.startDate}
                        onChange={handleCreateChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box'
                        }}
                      />
                                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Start Time <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={createFormData.startTime}
                        onChange={handleCreateChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box'
                        }}
                      />
                                    </div>
                                    </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        End Date <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={createFormData.endDate}
                        onChange={handleCreateChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box'
                        }}
                      />
                                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        End Time <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={createFormData.endTime}
                        onChange={handleCreateChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box'
                        }}
                      />
                                      </div>
                                  </div>

                  {/* Registration Deadline */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Registration Deadline <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="registrationDeadline"
                      value={createFormData.registrationDeadline}
                      onChange={handleCreateChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                                </div>

                  {/* Short Description */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Short Description <span style={{ color: '#dc2626' }}>*</span> (max 200 characters)
                    </label>
                    <textarea
                      name="shortDescription"
                      value={createFormData.shortDescription}
                      onChange={handleCreateChange}
                      required
                      maxLength={200}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem',
                      marginBottom: 0
                    }}>
                      {createFormData.shortDescription.length}/200 characters
                    </p>
                              </div>

                  {/* Full Agenda */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Full Agenda <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      name="fullAgenda"
                      value={createFormData.fullAgenda}
                      onChange={handleCreateChange}
                      required
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                                  </div>

                  {/* Faculty Responsible */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Faculty Responsible <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      name="facultyResponsible"
                      value={createFormData.facultyResponsible}
                      onChange={handleCreateChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="MET">MET</option>
                      <option value="IET">IET</option>
                      <option value="EMS">EMS</option>
                      <option value="BI">BI</option>
                      <option value="MGT">MGT</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="AA">AA</option>
                      <option value="Pharm">Pharm</option>
                      <option value="Arch">Arch</option>
                    </select>
                                  </div>

                  {/* Professors Participating */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Professor(s) Participating <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="professorsParticipating"
                      value={createFormData.professorsParticipating}
                      onChange={handleCreateChange}
                      required
                      placeholder="Separate multiple professors with commas"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                                </div>

                  {/* Budget and Funding Source Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Required Budget <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="number"
                        name="requiredBudget"
                        value={createFormData.requiredBudget}
                        onChange={handleCreateChange}
                        required
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        Funding Source <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        name="fundingSource"
                        value={createFormData.fundingSource}
                        onChange={handleCreateChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="GUC">GUC</option>
                        <option value="external">External</option>
                      </select>
                    </div>
                  </div>

                  {/* Extra Required Resources */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Extra Required Resources
                    </label>
                    <textarea
                      name="extraRequiredResources"
                      value={createFormData.extraRequiredResources}
                      onChange={handleCreateChange}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Capacity */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Capacity <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={createFormData.capacity}
                      onChange={handleCreateChange}
                      required
                      min="1"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      type="submit"
                      disabled={creating || createSuccess}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: creating || createSuccess ? '#9ca3af' : '#1e40af',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: creating || createSuccess ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!creating && !createSuccess) {
                          e.target.style.backgroundColor = '#1e3a8a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!creating && !createSuccess) {
                          e.target.style.backgroundColor = '#1e40af';
                        }
                      }}
                    >
                      {creating ? 'Creating...' : createSuccess ? 'Created!' : 'Create Workshop'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
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
          zIndex: 1000,
          padding: '2rem'
        }}
        onClick={() => {
          if (!saving) {
            setShowEditModal(false);
            setSelectedWorkshop(null);
          }
        }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1D3557', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                Edit Workshop
              </h2>
              <button
                onClick={() => {
                  if (!saving) {
                    setShowEditModal(false);
                    setSelectedWorkshop(null);
                  }
                }}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#6b7280' }}>
                  close
                </span>
              </button>
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

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Workshop Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Workshop Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="workshopName"
                    value={editFormData.workshopName || ''}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Location <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    name="location"
                    value={editFormData.location || 'GUC Cairo'}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="GUC Cairo">GUC Cairo</option>
                    <option value="GUC Berlin">GUC Berlin</option>
                  </select>
                </div>

                {/* Date and Time Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Start Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={editFormData.startDate || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Start Time <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={editFormData.startTime || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      End Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={editFormData.endDate || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      End Time <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={editFormData.endTime || ''}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Registration Deadline */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Registration Deadline <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={editFormData.registrationDeadline || ''}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Short Description <span style={{ color: '#dc2626' }}>*</span> (max 200 characters)
                  </label>
                  <textarea
                    name="shortDescription"
                    value={editFormData.shortDescription || ''}
                    onChange={handleEditChange}
                    required
                    maxLength={200}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    marginBottom: 0
                  }}>
                    {(editFormData.shortDescription || '').length}/200 characters
                  </p>
                </div>

                {/* Full Agenda */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Full Agenda <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    name="fullAgenda"
                    value={editFormData.fullAgenda || ''}
                    onChange={handleEditChange}
                    required
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Faculty Responsible */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Faculty Responsible <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    name="facultyResponsible"
                    value={editFormData.facultyResponsible || 'MET'}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="MET">MET</option>
                    <option value="IET">IET</option>
                    <option value="EMS">EMS</option>
                    <option value="BI">BI</option>
                    <option value="MGT">MGT</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="AA">AA</option>
                    <option value="Pharm">Pharm</option>
                    <option value="Arch">Arch</option>
                  </select>
                </div>

                {/* Professors Participating */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Professor(s) Participating <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="professorsParticipating"
                    value={editFormData.professorsParticipating || ''}
                    onChange={handleEditChange}
                    required
                    placeholder="Separate multiple professors with commas"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Budget and Funding Source Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Required Budget <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="requiredBudget"
                      value={editFormData.requiredBudget || ''}
                      onChange={handleEditChange}
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Funding Source <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      name="fundingSource"
                      value={editFormData.fundingSource || 'GUC'}
                      onChange={handleEditChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="GUC">GUC</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                </div>

                {/* Extra Required Resources */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Extra Required Resources
                  </label>
                  <textarea
                    name="extraRequiredResources"
                    value={editFormData.extraRequiredResources || ''}
                    onChange={handleEditChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Capacity <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={editFormData.capacity || ''}
                    onChange={handleEditChange}
                    required
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: saving ? '#9ca3af' : '#1e40af',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#1e3a8a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#1e40af';
                      }
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!saving) {
                        setShowEditModal(false);
                        setSelectedWorkshop(null);
                      }
                    }}
                    disabled={saving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.borderColor = '#d1d5db';
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedWorkshopForParticipants && (
        <div
          onClick={() => setShowParticipantsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{
                  color: '#1D3557',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  Workshop Participants
                </h2>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  {selectedWorkshopForParticipants.workshopName || selectedWorkshopForParticipants.title}
                </p>
              </div>
              <button
                onClick={() => setShowParticipantsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'all 0.2s',
                  lineHeight: 1,
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
                ×
              </button>
            </div>

            {/* Participants Info */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Total Capacity</div>
                  <div style={{ color: '#374151', fontWeight: '600', fontSize: '1rem' }}>
                    {selectedWorkshopForParticipants.capacity || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Registered</div>
                  <div style={{ color: '#374151', fontWeight: '600', fontSize: '1rem' }}>
                    {selectedWorkshopForParticipants.registeredCount || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Remaining Spots</div>
                  <div style={{ 
                    color: getRemainingSpots(selectedWorkshopForParticipants) > 0 ? '#059669' : '#dc2626', 
                    fontWeight: '600', 
                    fontSize: '1rem' 
                  }}>
                    {getRemainingSpots(selectedWorkshopForParticipants)}
                  </div>
                </div>
              </div>
            </div>

            {/* Participants List */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
              {loadingParticipants ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '3rem',
                  color: '#6b7280'
                }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #1e40af',
                    borderRadius: '50%',
                    display: 'inline-block',
                    marginBottom: '1rem'
                  }} className="spinner"></div>
                  <span>Loading participants...</span>
                </div>
              ) : participants.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#6b7280'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>
                    person_off
                  </span>
                  <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    No participants yet
                  </p>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    No one has registered for this workshop yet.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id || index}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#1D3557',
                          fontSize: '0.875rem',
                          marginBottom: '0.25rem'
                        }}>
                          {participant.name || 'Unknown'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.125rem'
                        }}>
                          {participant.email}
                        </div>
                        {participant.studentId && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {participant.userType === 'TA' ? 'TA ID' : 'Student ID'}: {participant.studentId}
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        backgroundColor: participant.status === 'approved' || participant.status === 'registered' 
                          ? '#d1fae5' 
                          : participant.status === 'pending'
                          ? '#fef3c7'
                          : '#fee2e2',
                        color: participant.status === 'approved' || participant.status === 'registered'
                          ? '#065f46'
                          : participant.status === 'pending'
                          ? '#92400e'
                          : '#991b1b',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {participant.status || 'pending'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyWorkshops;

