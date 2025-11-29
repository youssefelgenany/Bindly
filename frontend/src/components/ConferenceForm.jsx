import React from 'react';

const ConferenceForm = ({ onSubmit, loading = false, initialData = {}, submitLabel = 'Create Conference', loadingLabel = 'Creating...' }) => {
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
    capacity: initialData.capacity || '',
    allowedUserTypes: initialData.allowedUserTypes || []
  });

  console.log('🔹 ConferenceForm: Initialized formData:', formData);

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const toggleUserType = (userType) => {
    setFormData(prev => {
      const currentTypes = prev.allowedUserTypes || [];
      if (currentTypes.includes(userType)) {
        return { ...prev, allowedUserTypes: currentTypes.filter(t => t !== userType) };
      } else {
        return { ...prev, allowedUserTypes: [...currentTypes, userType] };
      }
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

  const formRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem'
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={formGroupStyle}>
        <label style={labelStyle}>Conference Name <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter conference name"
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
        <label style={labelStyle}>Short Description <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          placeholder="Brief description of the conference"
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
        <label style={labelStyle}>Agenda <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea
          name="agenda"
          value={formData.agenda}
          onChange={handleChange}
          required
          placeholder="Detailed agenda of the conference"
          rows="4"
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

      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Website Link <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            required
            placeholder="https://example.com"
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
            placeholder="Conference venue"
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
      </div>

      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Required Budget <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
            placeholder="0.00"
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
          <label style={labelStyle}>Source of Funding <span style={{ color: '#ef4444' }}>*</span></label>
          <select
            name="fundingSource"
            value={formData.fundingSource}
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
            <option value="GUC">GUC</option>
            <option value="external">External</option>
          </select>
        </div>
      </div>

      <div style={formRowStyle}>
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
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Capacity</label>
        <input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleChange}
          min="0"
          placeholder="Maximum number of attendees"
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
        <label style={labelStyle}>Extra Resources</label>
        <textarea
          name="extraResources"
          value={formData.extraResources}
          onChange={handleChange}
          placeholder="Additional resources or requirements"
          rows="3"
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
        <label style={labelStyle}>Restrict to User Types (optional)</label>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
          Select which user types can access this conference. Leave empty for all users.
        </p>
        {['Student', 'Professor', 'Staff', 'TA'].map(userType => (
          <label key={userType} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.allowedUserTypes?.includes(userType) || false}
              onChange={() => toggleUserType(userType)}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                marginRight: '0.75rem',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>{userType}</span>
          </label>
        ))}
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

export default ConferenceForm;