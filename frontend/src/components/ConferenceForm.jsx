import React from 'react';

const ConferenceForm = ({ onSubmit, loading = false, initialData = {} }) => {
  console.log('🔹 ConferenceForm: Received initialData:', initialData);
  
  const [formData, setFormData] = React.useState({
    title: initialData.title || '',
    description: initialData.description || '',
    agenda: initialData.agenda || '',
    website: initialData.website || '',
    budget: initialData.budget || '',
    fundingSource: initialData.fundingSource || 'GUC',
    extraResources: initialData.extraResources || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    location: initialData.location || '',
    capacity: initialData.capacity || ''
  });

  console.log('🔹 ConferenceForm: Initialized formData:', formData);

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
    <form className="conference-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Conference Name *</label>
        <input
          type="text"
          name="title"
          className="form-input"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter conference name"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Short Description</label>
        <input
          type="text"
          name="description"
          className="form-input"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the conference"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Agenda *</label>
        <textarea
          name="agenda"
          className="form-textarea"
          value={formData.agenda}
          onChange={handleChange}
          required
          placeholder="Detailed agenda of the conference"
          rows="4"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Website Link *</label>
        <input
          type="url"
          name="website"
          className="form-input"
          value={formData.website}
          onChange={handleChange}
          required
          placeholder="https://example.com"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Required Budget *</label>
          <input
            type="number"
            name="budget"
            className="form-input"
            value={formData.budget}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Source of Funding *</label>
          <select
            name="fundingSource"
            className="form-input"
            value={formData.fundingSource}
            onChange={handleChange}
            required
          >
            <option value="GUC">GUC</option>
            <option value="external">External</option>
          </select>
        </div>
      </div>

      <div className="form-row">
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
      </div>


      <div className="form-group">
        <label className="form-label">Extra Resources</label>
        <textarea
          name="extraResources"
          className="form-textarea"
          value={formData.extraResources}
          onChange={handleChange}
          placeholder="Additional resources or requirements"
          rows="3"
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Conference'}
        </button>
      </div>
    </form>
  );
};

export default ConferenceForm;