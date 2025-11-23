import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentRegistrationApi } from '../api/studentRegistrationApi';

const StudentRegistrationForm = ({ event, onClose, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.userType === 'Staff';
  const isProfessor = user?.userType === 'Professor';
  const isTA = user?.userType === 'TA';
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    studentEmail: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-fill form with user data when component mounts or user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Fetch current user data from API to ensure we have the latest gucId
          const token = localStorage.getItem('token');
          if (token) {
            const response = await fetch('http://localhost:5000/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              const currentUser = data.user || data;
              
              const fullName = currentUser.firstName && currentUser.lastName 
                ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
                : currentUser.name || user.name || '';
              
              setFormData({
                studentName: fullName,
                studentId: currentUser.gucId || user.gucId || '',
                studentEmail: currentUser.email || user.email || ''
              });
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
        
        // Fallback to user from context if API call fails
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.name || '';
        
        setFormData({
          studentName: fullName,
          studentId: user.gucId || '',
          studentEmail: user.email || ''
        });
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if event requires payment (trip or workshop with price > 0)
      const requiresPayment = (event.type === 'trip' || event.type === 'workshop') && 
                              event.price && event.price > 0;
      
      if (requiresPayment) {
        // Create pending registration first, then redirect to payment
        const result = await studentRegistrationApi.register(event.id, formData);
        
        if (result.success) {
          // Store registration data in sessionStorage for payment page
          sessionStorage.setItem('pendingRegistration', JSON.stringify({
            eventId: event.id,
            registrationId: result.data.registration?._id || result.data.registrationId,
            formData: formData,
            event: {
              id: event.id,
              title: event.title,
              type: event.type,
              price: event.price
            }
          }));
          
          // Redirect to payment page
          onClose();
          navigate(`/events/${event.id}/payment`);
        } else {
          setError(result.message || 'Registration failed');
        }
      } else {
        // Free event - register directly
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
      }
    } catch (err) {
      setError('An unexpected error occurred');
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

  if (success) {
    return (
      <div style={{
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          backgroundColor: '#d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem'
        }}>
          ✅
        </div>
        <h3 style={{
          color: '#1D3557',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem',
          marginTop: 0
        }}>
          Registration Successful!
        </h3>
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          marginBottom: '0.5rem'
        }}>
          You have been successfully registered for <strong style={{ color: '#1D3557' }}>{event.title}</strong>
        </p>
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          A confirmation email will be sent to <strong style={{ color: '#1D3557' }}>{formData.studentEmail}</strong>
        </p>
        <p style={{
          color: '#9ca3af',
          fontSize: '0.75rem',
          fontStyle: 'italic'
        }}>
          This window will close automatically...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          color: '#1D3557',
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: 0
        }}>
          Register for {event.title}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.25rem 0.5rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '0.25rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
      </div>

      {/* Event Info */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f8f6f6',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: '#1e40af',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            {event.type}
          </span>
          <span style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>calendar_today</span>
            {formatDate(event.startDate)}
          </span>
          <span style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
            {event.location}
          </span>
        </div>
        {event.capacity && (
          <div style={{
            color: '#059669',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Capacity: {event.registeredCount || 0}/{event.capacity}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        flex: 1,
        padding: '1.5rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            color: '#1D3557',
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            marginTop: 0,
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #1e40af'
          }}>
            {isStaff ? 'Staff Information' : 'Student Information'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="studentName" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                id="studentName"
                name="studentName"
                value={formData.studentName}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f3f4f6',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1e40af';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              />
            </div>

            <div>
              <label htmlFor="studentId" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                {isProfessor ? 'Professor ID' : isTA ? 'TA ID' : isStaff ? 'Staff ID' : 'Student ID'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                placeholder={isProfessor ? 'Enter your professor ID' : isTA ? 'Enter your TA ID' : isStaff ? 'Enter your staff ID' : 'Enter your student ID'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f3f4f6',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1e40af';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              />
            </div>

            <div>
              <label htmlFor="studentEmail" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                id="studentEmail"
                name="studentEmail"
                value={formData.studentEmail}
                onChange={handleInputChange}
                required
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f3f4f6',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1e40af';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: 'auto',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: loading ? '#9ca3af' : '#1e40af',
              color: '#FFFFFF',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#1e3a8a';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#1e40af';
              }
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentRegistrationForm;
