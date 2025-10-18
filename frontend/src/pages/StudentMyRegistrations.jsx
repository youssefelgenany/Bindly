import React, { useState, useEffect } from 'react';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import '../styles/StudentMyRegistrations.css';

const StudentMyRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Searching for registrations with email:', searchEmail.trim());
      const result = await studentRegistrationApi.getMyRegistrations(searchEmail.trim());
      console.log('🔍 API result:', result);
      
      if (result.success) {
        setRegistrations(result.data.registrations || []);
        setEmail(searchEmail.trim());
        console.log('🔍 Set registrations:', result.data.registrations);
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
      workshop: '#607D8B',
      trip: '#2196F3',
      bazaar: '#4CAF50',
      other: '#757575'
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: '#27ae60',
      pending: '#f39c12',
      rejected: '#e74c3c'
    };
    return colors[status] || '#757575';
  };

  const RegistrationCard = ({ registration }) => (
    <div className="registration-card">
      <div className="registration-header">
        <div className="event-type-badge" style={{ backgroundColor: getEventTypeColor(registration.eventType) }}>
          {registration.eventType.toUpperCase()}
        </div>
        <div className="status-badge" style={{ backgroundColor: getStatusColor(registration.status) }}>
          {registration.status.toUpperCase()}
        </div>
      </div>

      <h3 className="event-title">{registration.eventTitle}</h3>

      <div className="event-details">
        <div className="detail-item">
          <span className="detail-label">📅 Event Date:</span>
          <span>{formatDate(registration.eventDate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">📍 Location:</span>
          <span>{registration.eventLocation}</span>
        </div>
        {registration.capacity && (
          <div className="detail-item">
            <span className="detail-label">👥 Capacity:</span>
            <span>{registration.registeredCount || 0}/{registration.capacity}</span>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">📝 Registered:</span>
          <span>{formatDate(registration.registeredAt)}</span>
        </div>
      </div>

      {registration.eventDescription && (
        <p className="event-description">{registration.eventDescription}</p>
      )}

      <div className="student-info">
        <div className="info-section">
          <h4>Your Registration Details</h4>
          <div className="detail-item">
            <span className="detail-label">Name:</span>
            <span>{registration.studentName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Student ID:</span>
            <span>{registration.studentId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email:</span>
            <span>{registration.studentEmail}</span>
          </div>
        </div>

        {registration.eventType === 'trip' && (
          <div className="info-section">
            <h4>Trip Information</h4>
            {registration.emergencyContact && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Emergency Contact:</span>
                  <span>{registration.emergencyContact.name}</span>
                </div>
                {registration.emergencyContact.phone && (
                  <div className="detail-item">
                    <span className="detail-label">Contact Phone:</span>
                    <span>{registration.emergencyContact.phone}</span>
                  </div>
                )}
              </>
            )}
            {registration.dietaryRequirements && (
              <div className="detail-item">
                <span className="detail-label">Dietary Requirements:</span>
                <span>{registration.dietaryRequirements}</span>
              </div>
            )}
            {registration.medicalConditions && (
              <div className="detail-item">
                <span className="detail-label">Medical Conditions:</span>
                <span>{registration.medicalConditions}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="my-registrations-container">
        <div className="loading">Loading registrations...</div>
      </div>
    );
  }

  return (
    <div className="my-registrations-container">
      <div className="page-header">
        <h1>📋 My Event Registrations</h1>
        <p>View all your registered workshops and trips</p>
      </div>

      <div className="search-section">
        <div className="search-form">
          <div className="form-group">
            <label htmlFor="email">Enter your email address to view registrations:</label>
            <div className="input-group">
              <input
                type="email"
                id="email"
                placeholder="your.email@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>🔍 Search</button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {email && (
        <div className="results-header">
          <h2>Registrations for {email}</h2>
          <p>Found {registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="registrations-grid">
        {registrations.length === 0 && email ? (
          <div className="no-registrations">
            <p>No registrations found for this email address.</p>
            <p>Make sure you've registered for workshops or trips using this email.</p>
          </div>
        ) : (
          registrations.map(registration => (
            <RegistrationCard key={registration.id} registration={registration} />
          ))
        )}
      </div>
    </div>
  );
};

export default StudentMyRegistrations;
