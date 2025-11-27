import React, { useState } from 'react';
import '../styles/GymSessionForm.css';

const GymSessionForm = ({ onSubmit, loading = false, submitLabel = 'Create Gym Session', loadingLabel = 'Creating...' }) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: '',
    type: '',
    maxParticipants: '',
    instructor: '',
    location: 'Gym',
    description: ''
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

    // Validate duration
    if (formData.duration <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    // Validate max participants
    if (formData.maxParticipants <= 0) {
      alert('Max participants must be greater than 0');
      return;
    }

    onSubmit(formData);
  };

  const sessionTypes = [
    { value: 'yoga', label: 'Yoga' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'aerobics', label: 'Aerobics' },
    { value: 'zumba', label: 'Zumba' },
    { value: 'cross circuit', label: 'Cross Circuit' },
    { value: 'kick-boxing', label: 'Kick-boxing' }
  ];

  return (
    <form className="gym-session-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Date *</label>
        <input
          type="date"
          name="date"
          className="form-input"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Time *</label>
        <input
          type="time"
          name="time"
          className="form-input"
          value={formData.time}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Duration (minutes) *</label>
        <input
          type="number"
          name="duration"
          className="form-input"
          value={formData.duration}
          onChange={handleChange}
          min="1"
          required
          placeholder="e.g., 60"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Session Type *</label>
        <select
          name="type"
          className="form-input"
          value={formData.type}
          onChange={handleChange}
          required
        >
          <option value="">Select session type</option>
          {sessionTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Max Number of Participants *</label>
        <input
          type="number"
          name="maxParticipants"
          className="form-input"
          value={formData.maxParticipants}
          onChange={handleChange}
          min="1"
          required
          placeholder="e.g., 20"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Instructor</label>
        <input
          type="text"
          name="instructor"
          className="form-input"
          value={formData.instructor}
          onChange={handleChange}
          placeholder="Instructor name (optional)"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          name="location"
          className="form-input"
          value={formData.location}
          onChange={handleChange}
          placeholder="Location (default: Gym)"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          name="description"
          className="form-input"
          rows="3"
          value={formData.description}
          onChange={handleChange}
          placeholder="Session description (optional)"
        />
      </div>

      <button 
        type="submit" 
        className="submit-btn"
        disabled={loading}
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
};

export default GymSessionForm;
