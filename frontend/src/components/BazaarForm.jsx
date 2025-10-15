import React from 'react';
import '../styles/BazaarForm.css';

const BazaarForm = ({ onSubmit, loading = false, initialData = {} }) => {
  const [formData, setFormData] = React.useState({
    name: initialData.name || '',
    location: initialData.location || '',
    description: initialData.description || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    registrationDeadline: initialData.registrationDeadline || ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="bazaar-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Bazaar Name *</label>
        <input
          type="text"
          name="name"
          className="form-input"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter bazaar name"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Location *</label>
        <input
          type="text"
          name="location"
          className="form-input"
          value={formData.location}
          onChange={handleChange}
          required
          placeholder="Enter location"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          name="description"
          className="form-input"
          rows="4"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter a short description"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Start Date & Time *</label>
        <input
          type="datetime-local"
          name="startDate"
          className="form-input"
          value={formData.startDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">End Date & Time *</label>
        <input
          type="datetime-local"
          name="endDate"
          className="form-input"
          value={formData.endDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Registration Deadline *</label>
        <input
          type="datetime-local"
          name="registrationDeadline"
          className="form-input"
          value={formData.registrationDeadline}
          onChange={handleChange}
          required
        />
      </div>

      <button 
        type="submit" 
        className="btn btn-primary submit-btn"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Bazaar'}
      </button>
    </form>
  );
};

export default BazaarForm;