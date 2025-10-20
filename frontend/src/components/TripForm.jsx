import React from 'react';
import '../styles/TripForm.css';

const TripForm = ({ onSubmit, loading = false, initialData = {} }) => {
  const [formData, setFormData] = React.useState({
    name: initialData.name || '',
    location: initialData.location || '',
    price: initialData.price || '',
    description: initialData.description || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    capacity: initialData.capacity || '',
    registrationDeadline: initialData.registrationDeadline || ''
  });

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Trip Name *</label>
        <input
          type="text"
          name="name"
          className="form-input"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter trip name"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Price (EGP) *</label>
        <input
          type="number"
          name="price"
          className="form-input"
          value={formData.price}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          placeholder="Enter price"
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
        {loading ? 'Creating...' : 'Create Trip'}
      </button>
    </form>
  );
};

export default TripForm;