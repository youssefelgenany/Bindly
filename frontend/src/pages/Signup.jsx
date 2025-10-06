import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    userType: 'Student',
    gucId: '',
    companyName: ''
  });
  const [files, setFiles] = useState({
    vendorLogo: null,
    vendorTaxCard: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { signup } = useAuth();
  const navigate = useNavigate();

  const userTypes = [
    { value: 'Student', label: 'Student', description: 'GUC Student' },
    { value: 'Staff', label: 'Staff', description: 'GUC Staff Member' },
    { value: 'TA', label: 'Teaching Assistant', description: 'GUC Teaching Assistant' },
    { value: 'Professor', label: 'Professor', description: 'GUC Professor' },
    { value: 'Vendor', label: 'Vendor', description: 'External Vendor' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles(prev => ({
      ...prev,
      [name]: fileList[0] || null
    }));
    // Clear error when user selects file
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // GUC user validations
    if (['Student', 'Staff', 'TA', 'Professor'].includes(formData.userType)) {
      const gucEmailRegex = /^[a-zA-Z0-9._%+-]+@student\.guc\.edu\.eg$|^[a-zA-Z0-9._%+-]+@guc\.edu\.eg$/;
      if (!gucEmailRegex.test(formData.email)) {
        newErrors.email = 'GUC users must use a valid GUC email address (@student.guc.edu.eg or @guc.edu.eg)';
      }

      if (!formData.gucId.trim()) {
        newErrors.gucId = 'GUC ID is required';
      }
    }

    // Vendor validations
    if (formData.userType === 'Vendor') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }

      if (!files.vendorLogo) {
        newErrors.vendorLogo = 'Company logo is required';
      }

      if (!files.vendorTaxCard) {
        newErrors.vendorTaxCard = 'Tax card is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add files for vendors
      if (formData.userType === 'Vendor') {
        if (files.vendorLogo) {
          submitData.append('vendorLogo', files.vendorLogo);
        }
        if (files.vendorTaxCard) {
          submitData.append('vendorTaxCard', files.vendorTaxCard);
        }
      }

      // Debug: Log the form data being sent
      console.log('Form data being sent:', {
        userType: formData.userType,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gucId: formData.gucId,
        companyName: formData.companyName,
        hasLogo: !!files.vendorLogo,
        hasTaxCard: !!files.vendorTaxCard
      });

      const result = await signup(submitData);
      
      if (result.success) {
        setMessage('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      } else {
        setMessage(result.message);
        console.error('Signup failed:', result.message);
      }
    } catch (error) {
      console.error('Unexpected signup error:', error);
      setMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--light-gray) 0%, #E9ECEF 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="card-header">
          <h1 className="card-title">Join Bindly</h1>
          <p className="card-subtitle">Create your account to get started</p>
        </div>

        {message && (
          <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Type Selection */}
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {userTypes.map(type => (
                <label key={type.value} style={{
                  padding: '12px',
                  border: `2px solid ${formData.userType === type.value ? 'var(--guc-red)' : 'var(--medium-gray)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: formData.userType === type.value ? 'rgba(210, 10, 10, 0.1)' : 'var(--white)',
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="radio"
                    name="userType"
                    value={type.value}
                    checked={formData.userType === type.value}
                    onChange={handleChange}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      {type.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`form-input ${errors.firstName ? 'error' : ''}`}
                placeholder="First name"
                disabled={loading}
              />
              {errors.firstName && <div className="form-error">{errors.firstName}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`form-input ${errors.lastName ? 'error' : ''}`}
                placeholder="Last name"
                disabled={loading}
              />
              {errors.lastName && <div className="form-error">{errors.lastName}</div>}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder={
                formData.userType === 'Student'
                  ? "your.email@student.guc.edu.eg"
                  : formData.userType === 'Vendor'
                  ? "your.email@company.com"
                  : "your.email@guc.edu.eg"
              }
              disabled={loading}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          {/* GUC ID for GUC users */}
          {['Student', 'Staff', 'TA', 'Professor'].includes(formData.userType) && (
            <div className="form-group">
              <label htmlFor="gucId" className="form-label">GUC ID</label>
              <input
                type="text"
                id="gucId"
                name="gucId"
                value={formData.gucId}
                onChange={handleChange}
                className={`form-input ${errors.gucId ? 'error' : ''}`}
                placeholder="e.g., 34-1234"
                disabled={loading}
              />
              {errors.gucId && <div className="form-error">{errors.gucId}</div>}
            </div>
          )}

          {/* Company Name for Vendors */}
          {formData.userType === 'Vendor' && (
            <div className="form-group">
              <label htmlFor="companyName" className="form-label">Company Name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className={`form-input ${errors.companyName ? 'error' : ''}`}
                placeholder="Your company name"
                disabled={loading}
              />
              {errors.companyName && <div className="form-error">{errors.companyName}</div>}
            </div>
          )}

          {/* Password Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min. 6 characters"
                disabled={loading}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm password"
                disabled={loading}
              />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
          </div>

          {/* File Uploads for Vendors */}
          {formData.userType === 'Vendor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="vendorLogo" className="form-label">Company Logo</label>
                <input
                  type="file"
                  id="vendorLogo"
                  name="vendorLogo"
                  onChange={handleFileChange}
                  accept="image/*"
                  className={`form-input ${errors.vendorLogo ? 'error' : ''}`}
                  disabled={loading}
                />
                {errors.vendorLogo && <div className="form-error">{errors.vendorLogo}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="vendorTaxCard" className="form-label">Tax Card</label>
                <input
                  type="file"
                  id="vendorTaxCard"
                  name="vendorTaxCard"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className={`form-input ${errors.vendorTaxCard ? 'error' : ''}`}
                  disabled={loading}
                />
                {errors.vendorTaxCard && <div className="form-error">{errors.vendorTaxCard}</div>}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span style={{ marginLeft: '8px' }}>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center">
          <p style={{ color: 'var(--text-light)' }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'var(--guc-red)', 
                textDecoration: 'none', 
                fontWeight: '600' 
              }}
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
