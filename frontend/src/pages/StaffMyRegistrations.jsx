import React, { useState, useEffect } from 'react';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import { useAuth } from '../contexts/AuthContext';

const StaffMyRegistrations = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.email) {
      loadMyRegistrations();
    }
  }, [user]);

  const loadMyRegistrations = async () => {
    if (!user?.email) {
      setError('User email not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading registrations for user:', user.email);
      const result = await studentRegistrationApi.getMyRegistrations(user.email);
      console.log('🔍 API result:', result);
      
      if (result.success) {
        setRegistrations(result.data.registrations || []);
        console.log('🔍 Set registrations:', result.data.registrations);
        console.log('🔍 Sample registration emergency contact:', result.data.registrations[0]?.emergencyContact);
      } else {
        setError(result.message || 'Failed to fetch registrations');
        setRegistrations([]);
        console.log('🔍 Error:', result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setRegistrations([]);
      console.error('🔍 Unexpected error:', err);
    } finally {
      setLoading(false);
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

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1', // Light pink
      trip: '#2196F3',
      sports: '#FF9800',
      seminar: '#9C27B0',
      workshop: '#E91E63',
      conference: '#673AB7',
      booth: '#00BCD4',
      other: '#757575'
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FF9800',
      approved: '#4CAF50',
      rejected: '#F44336',
      cancelled: '#757575'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="my-registrations-container">
      <div className="page-header">
        <h1>📋 My Event Registrations</h1>
        <p>View all your registered workshops and trips</p>
        {user?.email && (
          <div className="user-info">
            <p><strong>Logged in as:</strong> {user.email}</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-message">
          <p>Loading your registrations...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!loading && user?.email && registrations.length === 0 && !error && (
        <div className="no-registrations">
          <p>No registrations found for your account.</p>
          <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '10px' }}>
            Make sure you've registered for workshops or trips using your email.
          </p>
        </div>
      )}

      {registrations.length > 0 && (
        <div className="results-header">
          <h2>Your Registrations</h2>
          <p>Found {registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {registrations.length > 0 && (
        <div className="registrations-grid">
          {registrations.map(reg => (
            <div key={reg.id} className="registration-card">
              <div className="registration-header">
                <h3 className="event-title">{reg.eventTitle}</h3>
                <span className="event-type-badge" style={{ backgroundColor: getEventTypeColor(reg.eventType) }}>
                  {reg.eventType.toUpperCase()}
                </span>
              </div>

              <div className="event-details">
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`registration-status ${reg.status}`} style={{ color: getStatusColor(reg.status) }}>
                    {reg.status.toUpperCase()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Registered At:</span>
                  <span>{formatDate(reg.registeredAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Event Date:</span>
                  <span>{formatDate(reg.eventDate)} - {formatDate(reg.eventEndDate)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span>{reg.eventLocation}</span>
                </div>
                {reg.eventDescription && (
                  <div className="detail-item">
                    <span className="detail-label">Description:</span>
                    <span>{reg.eventDescription}</span>
                  </div>
                )}
                {reg.capacity && (
                  <div className="detail-item">
                    <span className="detail-label">Capacity:</span>
                    <span>{reg.capacity}</span>
                  </div>
                )}
                {reg.registeredCount !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Registered:</span>
                    <span>{reg.registeredCount}</span>
                  </div>
                )}
              </div>

              <div className="student-info-section">
                <h4>Student Details</h4>
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span>{reg.studentName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Student ID:</span>
                  <span>{reg.studentId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span>{reg.studentEmail}</span>
                </div>
              </div>

              {reg.eventType === 'trip' && (
                <div className="trip-details-section">
                  <h4>Trip Specifics</h4>
                  {reg.emergencyContact && (
                    <div className="detail-item">
                      <span className="detail-label">Emergency Contact:</span>
                      <span>
                        {typeof reg.emergencyContact === 'object' 
                          ? `${reg.emergencyContact.name || 'N/A'} - ${reg.emergencyContact.phone || 'N/A'}`
                          : reg.emergencyContact
                        }
                      </span>
                    </div>
                  )}
                  {reg.dietaryRequirements && (
                    <div className="detail-item">
                      <span className="detail-label">Dietary:</span>
                      <span>{reg.dietaryRequirements}</span>
                    </div>
                  )}
                  {reg.medicalConditions && (
                    <div className="detail-item">
                      <span className="detail-label">Medical:</span>
                      <span>{reg.medicalConditions}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffMyRegistrations;
