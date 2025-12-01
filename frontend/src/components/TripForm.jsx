import React from 'react';

const TripForm = ({ onSubmit, loading = false, initialData = {}, submitLabel = 'Create Trip', loadingLabel = 'Creating...' }) => {
  // Format price to preserve decimals - convert number to string to avoid rounding
  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '';
    // If it's already a string, return as is
    if (typeof price === 'string') return price;
    // If it's a number, convert to string preserving decimals
    return price.toString();
  };

  const [formData, setFormData] = React.useState({
    name: initialData.name || '',
    location: initialData.location || '',
    price: formatPrice(initialData.price),
    description: initialData.description || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    capacity: initialData.capacity || '',
    registrationDeadline: initialData.registrationDeadline || '',
    allowedUserTypes: initialData.allowedUserTypes || []
  });

  const handleChange = (e) => {
    // Keep number inputs as strings to preserve exact user input
    const value = e.target.value;
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
    // Parse number fields on submit
    const parsedData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : '',
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : ''
    };
    onSubmit(parsedData);
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
        <label style={labelStyle}>Trip Name <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter trip name"
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
        <label style={labelStyle}>Price (EGP) <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          placeholder="Enter price"
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
        <label style={labelStyle}>Capacity (Number of people) <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleChange}
          required
          min="1"
          placeholder="Enter capacity"
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
        <label style={labelStyle}>Description <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea
          name="description"
          rows="4"
          value={formData.description}
          onChange={handleChange}
          required
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

      <div style={formGroupStyle}>
        <label style={labelStyle}>Restrict to User Types (optional)</label>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
          Select which user types can access this trip. Leave empty for all users.
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

export default TripForm;