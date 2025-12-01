import React, { useState } from 'react';

const GymSessionForm = ({ onSubmit, loading = false, submitLabel = 'Create Gym Session', loadingLabel = 'Creating...' }) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: '',
    type: '',
    maxParticipants: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.date || !formData.time || !formData.duration || !formData.type || !formData.maxParticipants) {
      alert('Please fill in all required fields');
      return;
    }

    // Parse integer fields
    const duration = parseInt(formData.duration, 10);
    const maxParticipants = parseInt(formData.maxParticipants, 10);

    // Validate duration
    if (isNaN(duration) || duration <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    // Validate max participants
    if (isNaN(maxParticipants) || maxParticipants <= 0) {
      alert('Max participants must be greater than 0');
      return;
    }

    // Submit with parsed integers
    onSubmit({
      ...formData,
      duration,
      maxParticipants
    });
  };

  const sessionTypes = [
    { value: 'yoga', label: 'Yoga' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'aerobics', label: 'Aerobics' },
    { value: 'zumba', label: 'Zumba' },
    { value: 'cross circuit', label: 'Cross Circuit' },
    { value: 'kick-boxing', label: 'Kick-boxing' }
  ];

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, background-color 0.2s',
    fontFamily: 'inherit'
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
    display: 'block'
  };

  const formGroupStyle = {
    marginBottom: '1.5rem'
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={formGroupStyle}>
        <label style={labelStyle}>Date <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          placeholder="Select date"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Time <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Duration (minutes) <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="number"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          min="1"
          required
          placeholder="e.g., 60"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Session Type <span style={{ color: '#ef4444' }}>*</span></label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          required
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        >
          <option value="">Select session type</option>
          {sessionTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Max Number of Participants <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="number"
          name="maxParticipants"
          value={formData.maxParticipants}
          onChange={handleChange}
          min="1"
          required
          placeholder="e.g., 20"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          backgroundColor: loading ? '#9ca3af' : '#1D3557',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          marginTop: '0.5rem'
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
        {loading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
};

export default GymSessionForm;
