import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GymSessionRegistrationForm = ({ gymSession, onClose, onSuccess }) => {
  const { user } = useAuth();
  const isTA = user?.userType === 'TA';
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    email: ''
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
                name: fullName,
                id: currentUser.gucId || user.gucId || '',
                email: currentUser.email || user.email || ''
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
          name: fullName,
          id: user.gucId || '',
          email: user.email || ''
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
      const { gymSessionApi } = await import('../api/gymSessionApi');
      const result = await gymSessionApi.register(gymSession._id || gymSession.id, {
        name: formData.name,
        id: formData.id,
        email: formData.email
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess(result);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    if (typeof timeString === 'string' && timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  return (
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
    onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          width: '90%',
          maxWidth: '500px',
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
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#1D3557',
            margin: 0
          }}>
            Register for Gym Session
          </h2>
          <button
            onClick={onClose}
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

        {/* Session Info */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            <strong style={{ color: '#1D3557' }}>Session:</strong> {gymSession.type ? gymSession.type.charAt(0).toUpperCase() + gymSession.type.slice(1) : 'Gym Session'}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            <strong style={{ color: '#1D3557' }}>Date:</strong> {formatDate(gymSession.date)}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <strong style={{ color: '#1D3557' }}>Time:</strong> {formatTime(gymSession.time)}
          </div>
        </div>

        {/* Modal Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {success ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem'
              }}>✓</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1D3557',
                marginBottom: '0.5rem'
              }}>
                Registration Successful!
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                You have been registered for this gym session.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Name Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  marginBottom: '0.5rem'
                }}>
                  {isTA ? 'TA Name' : 'Name'} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* ID Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  marginBottom: '0.5rem'
                }}>
                  {isTA ? 'TA ID' : 'ID'} *
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  required
                  placeholder={isTA ? 'Enter your TA ID' : 'Enter your ID'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Email Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1D3557',
                  marginBottom: '0.5rem'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: loading ? '#94a3b8' : '#1D3557',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
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
                      e.target.style.backgroundColor = '#1D3557';
                    }
                  }}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default GymSessionRegistrationForm;

