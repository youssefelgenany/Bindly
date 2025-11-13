import React from 'react';

const BazaarForm = ({ onSubmit, loading = false, initialData = {}, submitLabel = 'Create Bazaar', loadingLabel = 'Creating...' }) => {
  const [formData, setFormData] = React.useState({
    name: initialData.name || '',
    location: initialData.location || '',
    description: initialData.description || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    registrationDeadline: initialData.registrationDeadline || ''
  });

  // Update form data when initialData changes (for editing)
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        name: initialData.name || '',
        location: initialData.location || '',
        description: initialData.description || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        registrationDeadline: initialData.registrationDeadline || ''
      });
    }
  }, [initialData]);

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
        <label style={labelStyle}>Bazaar Name <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter bazaar name"
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
        <label style={labelStyle}>Location <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          placeholder="Enter location"
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
        <label style={labelStyle}>Description</label>
        <textarea
          name="description"
          rows="4"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter a short description"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
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
        <label style={labelStyle}>Start Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="datetime-local"
          name="startDate"
          value={formData.startDate}
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
        <label style={labelStyle}>End Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="datetime-local"
          name="endDate"
          value={formData.endDate}
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
        <label style={labelStyle}>Registration Deadline <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="datetime-local"
          name="registrationDeadline"
          value={formData.registrationDeadline}
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

export default BazaarForm;