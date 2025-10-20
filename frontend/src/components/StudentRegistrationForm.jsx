import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';
import '../styles/StudentRegistrationForm.css';

const StudentRegistrationForm = ({ event, onClose, onSuccess }) => {
  const { user } = useAuth();
  const isStaff = user?.userType === 'Staff';
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    studentEmail: '',
    emergencyContact: {
      name: '',
      phone: ''
    },
    dietaryRequirements: '',
    medicalConditions: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await studentRegistrationApi.register(event.id, formData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess(result.data);
          onClose();
        }, 2000);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isTrip = event.type === 'trip';

  if (success) {
    return (
      <div className="registration-success">
        <div className="success-icon">✅</div>
        <h3>Registration Successful!</h3>
        <p>You have been successfully registered for <strong>{event.title}</strong></p>
        <p>A confirmation email will be sent to <strong>{formData.studentEmail}</strong></p>
        <p className="closing-message">This window will close automatically...</p>
      </div>
    );
  }

  return (
    <div className="registration-form-container">
      <div className="registration-header">
        <h2>Register for {event.title}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="event-info">
        <div className="event-details">
          <span className="event-type-badge">{event.type.toUpperCase()}</span>
          <span className="event-date">{formatDate(event.startDate)}</span>
          <span className="event-location">{event.location}</span>
        </div>
        {event.capacity && (
          <div className="capacity-info">
            Capacity: {event.registeredCount || 0}/{event.capacity}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-section">
          <h3>{isStaff ? 'Staff Information' : 'Student Information'}</h3>
          
          <div className="form-group">
            <label htmlFor="studentName">Full Name *</label>
            <input
              type="text"
              id="studentName"
              name="studentName"
              value={formData.studentName}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="studentId">{isStaff ? 'Staff ID *' : 'Student ID *'}</label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              required
              placeholder={isStaff ? 'Enter your staff ID' : 'Enter your student ID'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="studentEmail">Email Address *</label>
            <input
              type="email"
              id="studentEmail"
              name="studentEmail"
              value={formData.studentEmail}
              onChange={handleInputChange}
              required
              placeholder="Enter your email address"
            />
          </div>
        </div>

        {isTrip && (
          <div className="form-section">
            <h3>Trip Information</h3>
            
            <div className="form-group">
              <label htmlFor="emergencyContact.name">Emergency Contact Name</label>
              <input
                type="text"
                id="emergencyContact.name"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleInputChange}
                placeholder="Emergency contact person's name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContact.phone">Emergency Contact Phone</label>
              <input
                type="tel"
                id="emergencyContact.phone"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleInputChange}
                placeholder="Emergency contact phone number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dietaryRequirements">Dietary Requirements</label>
              <textarea
                id="dietaryRequirements"
                name="dietaryRequirements"
                value={formData.dietaryRequirements}
                onChange={handleInputChange}
                placeholder="Any dietary restrictions or requirements"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicalConditions">Medical Conditions</label>
              <textarea
                id="medicalConditions"
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleInputChange}
                placeholder="Any medical conditions we should be aware of"
                rows="3"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
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

export default StudentRegistrationForm;
