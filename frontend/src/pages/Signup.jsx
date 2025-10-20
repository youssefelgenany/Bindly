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
    employeeType: '',
    gucId: '',
    companyName: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Calculate score
    Object.values(requirements).forEach(met => {
      if (met) score++;
    });

    // Determine strength level
    let label, color;
    if (score <= 2) {
      label = 'Weak';
      color = '#dc3545'; // Red
    } else if (score === 3) {
      label = 'Fair';
      color = '#fd7e14'; // Orange
    } else if (score === 4) {
      label = 'Good';
      color = '#ffc107'; // Yellow
    } else {
      label = 'Strong';
      color = '#28a745'; // Green
    }

    return { score, label, color, requirements };
  };

  const mainUserTypes = [
    { value: 'Student', label: 'Student', description: 'GUC Student' },
    { value: 'Employee', label: 'Employee', description: 'GUC Employee' },
    { value: 'Vendor', label: 'Vendor', description: 'External Vendor' }
  ];

  const employeeTypes = [
    { value: 'Staff', label: 'Staff', description: 'GUC Staff Member' },
    { value: 'TA', label: 'Teaching Assistant', description: 'GUC Teaching Assistant' },
    { value: 'Professor', label: 'Professor', description: 'GUC Professor' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'userType') {
      setFormData(prev => ({
        ...prev,
        userType: value,
        employeeType: value === 'Employee' ? prev.employeeType : '' // Clear employee type if not Employee
      }));
    } else if (name === 'employeeType') {
      setFormData(prev => ({
        ...prev,
        employeeType: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Calculate password strength when password changes
    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear error when user starts typing
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
    } else {
      const strength = calculatePasswordStrength(formData.password);
      if (strength.score < 3) {
        const missingRequirements = [];
        if (!strength.requirements.length) missingRequirements.push('at least 8 characters');
        if (!strength.requirements.lowercase) missingRequirements.push('lowercase letter');
        if (!strength.requirements.uppercase) missingRequirements.push('uppercase letter');
        if (!strength.requirements.number) missingRequirements.push('number');
        if (!strength.requirements.symbol) missingRequirements.push('special character');
        
        newErrors.password = `Password must include: ${missingRequirements.join(', ')}`;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // First name and last name are only required for non-vendors
    if (formData.userType !== 'Vendor') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
    if (!formData.firstName.trim() && formData.userType !== 'Vendor') {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim() && formData.userType !== 'Vendor') {
      newErrors.lastName = 'Last name is required';
    }

    // Employee type validation
    if (formData.userType === 'Employee' && !formData.employeeType) {
      newErrors.employeeType = 'Please select an employee type';
    }

    // GUC user validations
    if (formData.userType === 'Student' || (formData.userType === 'Employee' && formData.employeeType)) {
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
      
      // Determine the actual userType to send to backend
      const actualUserType = formData.userType === 'Employee' ? formData.employeeType : formData.userType;
      
      // Add form fields
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      
      // Only add first and last name for non-vendors
      // Only add firstName and lastName for non-vendor users
      if (actualUserType !== 'Vendor') {
        submitData.append('firstName', formData.firstName);
        submitData.append('lastName', formData.lastName);
      }
      
      submitData.append('userType', actualUserType);
      
      if (formData.gucId) {
        submitData.append('gucId', formData.gucId);
      }
      
      if (formData.companyName) {
        submitData.append('companyName', formData.companyName);
      }


      // Debug: Log the form data being sent
      console.log('Form data being sent:', {
        userType: actualUserType,
        email: formData.email,
        firstName: actualUserType !== 'Vendor' ? formData.firstName : 'Not sent for vendors',
        lastName: actualUserType !== 'Vendor' ? formData.lastName : 'Not sent for vendors',
        gucId: formData.gucId,
        companyName: formData.companyName
      });

      const result = await signup(submitData);
      
      if (result.success) {
        if (result.requiresVerification) {
          // Students/Vendors should not require verification per backend rules,
          // but keep fallback just in case server says requiresVerification.
          setMessage('Account created successfully! Redirecting...');
          setTimeout(() => {
            navigate('/login');
          }, 800);
        } else {
          setMessage('Account created successfully! Redirecting...');
          setTimeout(() => {
            navigate('/login');
          }, 800);
        }
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
          {/* Main User Type Selection */}
          <div className="form-group">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {mainUserTypes.map(type => (
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

        {/* Employee Type Selection - Hidden until Employee is selected (moved above personal info) */}
        {formData.userType === 'Employee' && (
          <div className="form-group">
            <label className="form-label">Employee Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {employeeTypes.map(type => (
                <label key={type.value} style={{
                  padding: '12px',
                  border: `2px solid ${formData.employeeType === type.value ? 'var(--guc-red)' : 'var(--medium-gray)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: formData.employeeType === type.value ? 'rgba(210, 10, 10, 0.1)' : 'var(--white)',
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="radio"
                    name="employeeType"
                    value={type.value}
                    checked={formData.employeeType === type.value}
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
        )}

          {/* Personal Information - Only for non-vendors */}
          {formData.userType !== 'Vendor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name <span style={{ color: 'red' }}>*</span></label>
          {/* Personal Information - Hidden for Vendors */}
          {formData.userType !== 'Vendor' && (
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
                <label htmlFor="lastName" className="form-label">Last Name <span style={{ color: 'red' }}>*</span></label>
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
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address <span style={{ color: 'red' }}>*</span></label>
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
                  : formData.userType === 'Employee'
                  ? "your.email@guc.edu.eg"
                  : formData.userType === 'Vendor'
                  ? "your.email@company.com"
                  : "your.email@guc.edu.eg"
              }
              disabled={loading}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          {/* GUC ID for GUC users */}
          {(formData.userType === 'Student' || (formData.userType === 'Employee' && formData.employeeType)) && (
            <div className="form-group">
              <label htmlFor="gucId" className="form-label">GUC ID <span style={{ color: 'red' }}>*</span></label>
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
              <label htmlFor="companyName" className="form-label">Company Name <span style={{ color: 'red' }}>*</span></label>
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

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password <span style={{ color: 'red' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Create a strong password"
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  fontSize: '16px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                disabled={loading}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
            
            {/* Password Strength Scale - Always Visible */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color || '#e9ecef',
                    transition: 'all 0.3s ease'
                  }}></div>
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: passwordStrength.color || '#6c757d',
                  minWidth: '50px'
                }}>
                  {passwordStrength.label || 'Enter password'}
                </span>
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password <span style={{ color: 'red' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm password"
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  fontSize: '16px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                disabled={loading}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>

          {/* File Uploads for Vendors */}
          {formData.userType === 'Vendor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="vendorLogo" className="form-label">Company Logo <span style={{ color: 'red' }}>*</span></label>
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
                <label htmlFor="vendorTaxCard" className="form-label">Tax Card <span style={{ color: 'red' }}>*</span></label>
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


