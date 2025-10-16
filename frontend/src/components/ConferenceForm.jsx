import React from 'react';
import '../styles/BazaarForm.css'; // Reuse existing styles

const ConferenceForm = ({ onSubmit, loading = false, initialData = {}, submitLabel = 'Create Conference', loadingLabel = 'Creating...' }) => {
  const [formData, setFormData] = React.useState({
    title: initialData.title || '',
    location: initialData.location || '',
    agenda: initialData.agenda || '',
    website: initialData.website || '',
    budget: initialData.budget || '',
    fundingSource: initialData.fundingSource || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || ''
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
    <form className="bazaar-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Conference Title *</label>
        <input
          type="text"
          name="title"
          className="form-input"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter conference title"
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
        <label className="form-label">Agenda *</label>
        <textarea
          name="agenda"
          className="form-input"
          rows="4"
          value={formData.agenda}
          onChange={handleChange}
          required
          placeholder="Enter conference agenda"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Website *</label>
        <input
          type="url"
          name="website"
          className="form-input"
          value={formData.website}
          onChange={handleChange}
          required
          placeholder="Enter conference website"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Budget *</label>
        <input
          type="number"
          name="budget"
          className="form-input"
          value={formData.budget}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          placeholder="Enter budget amount"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Funding Source *</label>
        <input
          type="text"
          name="fundingSource"
          className="form-input"
          value={formData.fundingSource}
          onChange={handleChange}
          required
          placeholder="Enter funding source"
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

      <button 
        type="submit" 
        className="btn btn-primary submit-btn"
        disabled={loading}
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
};

export default ConferenceForm;
