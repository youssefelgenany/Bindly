import React, { useState } from 'react';
import PlatformBoothMapSelector from './PlatformBoothMapSelector';
import FileChooser from './FileChooser';

const PlatformBoothsModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    attendees: [{ name: '', email: '' }],
    duration: '',
    boothLocation: '',
    boothSize: '',
    attendeeFiles: [null]
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const setAttendee = (idx, field, value) => {
    const next = formData.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    setFormData({ ...formData, attendees: next });
    if (errors.attendees) {
      setErrors({ ...errors, attendees: '' });
    }
  };

  const addAttendee = () => {
    if (formData.attendees.length < 5) {
      setFormData({ ...formData, attendees: [...formData.attendees, { name: '', email: '' }], attendeeFiles: [...(formData.attendeeFiles || []), null] });
    }
  };

  const removeAttendee = (idx) => {
    if (formData.attendees.length > 1) {
      const next = formData.attendees.filter((_, i) => i !== idx);
      const nextFiles = (formData.attendeeFiles || []).filter((_, i) => i !== idx);
      setFormData({ ...formData, attendees: next, attendeeFiles: nextFiles.length ? nextFiles : [null] });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleLocationSelect = (locationId) => {
    setFormData({ ...formData, boothLocation: locationId });
    if (errors.boothLocation) {
      setErrors({ ...errors, boothLocation: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate attendees
    const validAttendees = formData.attendees.filter(attendee => 
      attendee.name.trim() && attendee.email.trim()
    );

    if (validAttendees.length === 0) {
      newErrors.attendees = 'At least one attendee is required';
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validAttendees.filter(attendee => 
      !emailRegex.test(attendee.email)
    );

    if (invalidEmails.length > 0) {
      newErrors.attendees = 'Please enter valid email addresses for all attendees';
    }

    // Validate duration
    if (!formData.duration) {
      newErrors.duration = 'Please select a duration';
    }

    // Validate booth location
    if (!formData.boothLocation) {
      newErrors.boothLocation = 'Please select a booth location from the map';
    }

    // Validate booth size
    if (!formData.boothSize) {
      newErrors.boothSize = 'Please select a booth size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e, idx) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const nextFiles = [...(formData.attendeeFiles || [])];
      nextFiles[idx] = file;
      setFormData(prev => ({ ...prev, attendeeFiles: nextFiles }));
    }
  };

  const handleRemoveFile = (idx) => {
    const nextFiles = [...(formData.attendeeFiles || [])];
    nextFiles[idx] = null;
    setFormData(prev => ({ ...prev, attendeeFiles: nextFiles }));
    // Reset the file input
    const fileInput = document.getElementById(`attendeeFile_${idx}`);
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Filter and clean attendees - ensure they have both name and email
      const validAttendees = formData.attendees
        .map(attendee => ({
          name: (attendee.name || '').trim(),
          email: (attendee.email || '').trim()
        }))
        .filter(attendee => attendee.name && attendee.email);

      if (validAttendees.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'Please add at least one attendee with both name and email.' 
        });
        setLoading(false);
        return;
      }

      // Prepare submission data - ensure all values are valid
      const submissionData = {
        eventType: 'platformBooth',
        attendees: validAttendees
      };

      // Only add optional fields if they have valid values
      if (formData.boothSize && (formData.boothSize === '2x2' || formData.boothSize === '4x4')) {
        submissionData.boothSize = formData.boothSize;
      }

      if (formData.duration) {
        const duration = parseInt(formData.duration);
        if (!isNaN(duration) && duration >= 1 && duration <= 4) {
          submissionData.durationWeeks = duration;
        }
      }

      if (formData.boothLocation && formData.boothLocation.trim()) {
        submissionData.boothLocation = formData.boothLocation.trim();
      }

      console.log('🔍 Submitting platform booth application:', submissionData);

      const token = localStorage.getItem('token');

      // If attendee files are present, ensure one per attendee and send as multipart/form-data
      const files = formData.attendeeFiles || [];
      const missingFileIndex = validAttendees.findIndex((_, i) => !files[i]);
      let response;

      if (missingFileIndex !== -1) {
        setMessage({ type: 'error', text: `Please upload an ID for attendee #${missingFileIndex + 1}.` });
        setLoading(false);
        return;
      }

      if (files.some(f => f)) {
        const fd = new FormData();
        fd.append('eventType', 'platformBooth');
        fd.append('attendees', JSON.stringify(validAttendees));
        if (submissionData.boothSize) fd.append('boothSize', submissionData.boothSize);
        if (submissionData.durationWeeks) fd.append('durationWeeks', submissionData.durationWeeks);
        if (submissionData.boothLocation) fd.append('boothLocation', submissionData.boothLocation);
        // append files in order
        files.slice(0, validAttendees.length).forEach((file) => {
          if (file) fd.append('individualIds', file);
        });

        response = await fetch('http://localhost:5000/api/vendor-requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
      } else {
        response = await fetch('http://localhost:5000/api/vendor-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(submissionData)
        });
      }

      const data = await response.json();
      console.log('🔍 Platform booth submission response:', { status: response.status, data });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Platform booth application submitted successfully! Your request is pending approval.' 
        });
        
        // Reset form
        setFormData({
          attendees: [{ name: '', email: '' }],
          duration: '',
          boothLocation: '',
          boothSize: '',
          attendeeFiles: [null]
        });

        // Call onSuccess callback if provided
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } else {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        // Extract error message from response
        let errorMessage = 'Failed to submit application';
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
        }
        
        // Add validation error details if available
        if (data.validationErrors && Array.isArray(data.validationErrors) && data.validationErrors.length > 0) {
          errorMessage += '\n' + data.validationErrors.join('\n');
        } else if (data.details && typeof data.details === 'object') {
          const detailMessages = Object.values(data.details);
          if (detailMessages.length > 0) {
            errorMessage += '\n' + detailMessages.join('\n');
          }
        }
        
        console.error('❌ Backend error response:', data);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error submitting platform booth application:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      
      let errorMessage = 'An error occurred while submitting your application. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      attendees: [{ name: '', email: '' }],
      duration: '',
      boothLocation: '',
      boothSize: '',
      attendeeFiles: [null]
    });
    setErrors({});
    setMessage({ type: '', text: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
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
        zIndex: 2000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#FFFFFF'
        }}>
          <div>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0,
              marginBottom: '0.25rem'
            }}>
              Platform Booth Application
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              margin: 0
            }}>
              Apply for a booth on the platform by filling in the form below.
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s'
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
          padding: '2rem'
        }}>
          {message.text && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.875rem',
              whiteSpace: 'pre-line'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Attendees Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '1rem'
              }}>
                Names, Emails and IDs of Attendees (Maximum 5) <span style={{ color: '#ef4444' }}>*</span>
              </h4>
              
              {formData.attendees.map((attendee, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  alignItems: 'end'
                }}>
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={attendee.name}
                      onChange={(e) => setAttendee(idx, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#f3f4f6',
                        outline: 'none',
                        transition: 'border-color 0.2s, background-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.backgroundColor = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.backgroundColor = '#f3f4f6';
                      }}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={attendee.email}
                      onChange={(e) => setAttendee(idx, 'email', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#f3f4f6',
                        outline: 'none',
                        transition: 'border-color 0.2s, background-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.backgroundColor = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.backgroundColor = '#f3f4f6';
                      }}
                      required
                    />
                  </div>
                  <div>
                    {formData.attendeeFiles && formData.attendeeFiles[idx] ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        position: 'relative'
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: '1.25rem',
                          color: formData.attendeeFiles[idx].type === 'application/pdf' ? '#ef4444' : '#3b82f6'
                        }}>
                          {formData.attendeeFiles[idx].type === 'application/pdf' ? 'description' : 'image'}
                        </span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: '#374151',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {formData.attendeeFiles[idx].name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                            borderRadius: '50%',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              e.target.style.backgroundColor = '#fee2e2';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                          title="Remove file"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <FileChooser
                        id={`platform_attendee_${idx}`}
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, idx)}
                        disabled={loading}
                        buttonLabel="Upload ID"
                        showName={false}
                        ariaLabel={`Attendee ${idx + 1} ID file`}
                      />
                    )}
                  </div>
                  {formData.attendees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttendee(idx)}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#ef4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              {formData.attendees.length < 5 && (
                <button
                  type="button"
                  onClick={addAttendee}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1D3557',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#152843'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1D3557'}
                >
                  + Add Attendee
                </button>
              )}
              
              {errors.attendees && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {errors.attendees}
                </div>
              )}
            </div>

            {/* Duration Section */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontWeight: '600',
                color: '#111827',
                fontSize: '0.875rem'
              }}>
                Duration of Booth Setup <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                required
              >
                <option value="">Select duration</option>
                <option value="1">1 Week</option>
                <option value="2">2 Weeks</option>
                <option value="3">3 Weeks</option>
                <option value="4">4 Weeks</option>
              </select>
              {errors.duration && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {errors.duration}
                </div>
              )}
            </div>

            {/* Booth Location Map */}
            <PlatformBoothMapSelector
              selectedLocation={formData.boothLocation}
              onLocationSelect={handleLocationSelect}
            />
            {errors.boothLocation && (
              <div style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '-1rem',
                marginBottom: '1.5rem'
              }}>
                {errors.boothLocation}
              </div>
            )}

            {/* Booth Size Section */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontWeight: '600',
                color: '#111827',
                fontSize: '0.875rem'
              }}>
                Booth Size <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="boothSize"
                value={formData.boothSize}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                required
              >
                <option value="">Select booth size</option>
                <option value="2x2">2x2 meters (Small Booth)</option>
                <option value="4x4">4x4 meters (Large Booth)</option>
              </select>
              {errors.boothSize && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {errors.boothSize}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
              marginTop: '2rem'
            }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading ? '#9ca3af' : '#1D3557',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#152843';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#1D3557';
                  }
                }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlatformBoothsModal;




