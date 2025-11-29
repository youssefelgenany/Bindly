import React, { useState, useRef, useEffect } from 'react';
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
  const topRef = useRef(null);
  const messageRef = useRef(null);

  // Scroll the message element into view whenever `message` changes.
  // Scrolling the message itself avoids clipping when the message uses
  // negative margins or sits near container edges.
  useEffect(() => {
    const el = messageRef.current || topRef.current;
    if (message && el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [message]);

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

    Object.values(requirements).forEach(met => {
      if (met) score++;
    });

    let label, color;
    if (score <= 2) {
      label = 'Weak';
      color = '#dc3545'; // Red
    } else if (score === 3) {
      label = 'Fair';
      color = '#fbbf24'; // Amber/Yellow
    } else if (score === 4) {
      label = 'Good';
      color = '#60a5fa'; // Light Blue
    } else {
      label = 'Strong';
      color = '#10b981'; // Green
    }

    return { score, label, color, requirements };
  };

  const mainUserTypes = [
    { value: 'Student', label: 'Student' },
    { value: 'Employee', label: 'Employee' },
    { value: 'Vendor', label: 'Vendor' }
  ];

  const employeeTypes = [
    { value: 'Staff', label: 'Staff' },
    { value: 'TA', label: 'Teaching Assistant' },
    { value: 'Professor', label: 'Professor' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'userType') {
      setFormData(prev => ({
        ...prev,
        userType: value,
        employeeType: value === 'Employee' ? prev.employeeType : ''
      }));
    } else if (name === 'employeeType') {
      setFormData(prev => ({
        ...prev,
        employeeType: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'email' ? value.toLowerCase() : value
      }));
    }
    
    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Removed vendor file inputs: logo and tax card are no longer collected at signup

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      // Check minimum length
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else {
        const strength = calculatePasswordStrength(formData.password);
        // Require password strength to be at least "Good" (score >= 4)
        if (strength.score < 4) {
          const missingRequirements = [];
          if (!strength.requirements.length) missingRequirements.push('at least 8 characters');
          if (!strength.requirements.lowercase) missingRequirements.push('lowercase letter');
          if (!strength.requirements.uppercase) missingRequirements.push('uppercase letter');
          if (!strength.requirements.number) missingRequirements.push('number');
          if (!strength.requirements.symbol) missingRequirements.push('special character');
          
          newErrors.password = `Password must be at least "Good" strength. Missing: ${missingRequirements.join(', ')}`;
        }
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.userType !== 'Vendor') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
    }

    if (formData.userType === 'Employee' && !formData.employeeType) {
      newErrors.employeeType = 'Please select an employee type';
    }

    // GUC email validation for Student/Staff/TA/Professor
    if (formData.userType === 'Student' || (formData.userType === 'Employee' && formData.employeeType)) {
      const gucEmailRegex = /^[a-zA-Z0-9._%+-]+@student\.guc\.edu\.eg$|^[a-zA-Z0-9._%+-]+@guc\.edu\.eg$/;
      if (!gucEmailRegex.test(formData.email)) {
        newErrors.email = 'GUC users must use a valid GUC email address (@student.guc.edu.eg or @guc.edu.eg)';
      }

      if (!formData.gucId.trim()) {
        newErrors.gucId = 'GUC ID is required';
      }
    }

    // Vendor should NOT use GUC email
    if (formData.userType === 'Vendor') {
      const gucEmailRegex = /^[a-zA-Z0-9._%+-]+@student\.guc\.edu\.eg$|^[a-zA-Z0-9._%+-]+@guc\.edu\.eg$/;
      if (gucEmailRegex.test(formData.email)) {
        newErrors.email = 'Vendors cannot use GUC email addresses. Please use your company email.';
      }
    }

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
      
      const actualUserType = formData.userType === 'Employee' ? formData.employeeType : formData.userType;
      
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      
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

      // Note: vendor logo and tax card are collected later in the vendor dashboard flow

      const result = await signup(submitData);
      
      if (result.success) {
        setMessage('Account created successfully! Redirecting...');
        // Store email and userType for verification page
        localStorage.setItem('pendingVerificationEmail', formData.email);
        localStorage.setItem('pendingVerificationUserType', actualUserType);
        // Immediately redirect to verification page
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&userType=${encodeURIComponent(actualUserType)}`);
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
      position: 'relative',
      display: 'flex',
      height: '100vh',
      width: '100%',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Manrope, sans-serif'
    }}>
      <div className="signup-container" style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Left Panel - Signup Form */}
        <div style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          padding: '1.5rem',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '28rem',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem'
          }}>
            {/* Anchor for scrolling to show errors/messages */}
            <div ref={topRef} />
            {/* Logo and Title */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <svg 
                style={{ height: '3rem', width: '3rem', color: '#1D3557' }}
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <p style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '1.875rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                color: '#1D3557',
                margin: 0
              }}>
                Bindly
              </p>
            </div>

            {/* Welcome Message */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '1.5rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                color: '#1A202C',
                margin: 0
              }}>
                Create Your Account
              </p>
              <p style={{
                fontSize: '1rem',
                color: '#4B5563',
                paddingTop: '0.5rem',
                margin: 0
              }}>
                Join our university community today.
              </p>
            </div>

            {/* Error/Success Message */}
            {message && (
              <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`} style={{ 
                width: '100%',
                marginBottom: '0',
                marginTop: '-1rem'
              }}>
                {message}
              </div>
            )}

            {/* Signup Form */}
            <div style={{ width: '100%' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* User Type Selection */}
                <div>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    paddingBottom: '0.5rem',
                    color: '#1A202C',
                    display: 'block'
                  }}>
                    I am a...
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem'
                  }}>
                    {mainUserTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'userType', value: type.value } })}
                        style={{
                          display: 'flex',
                          height: '3rem',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '0.375rem',
                          border: formData.userType === type.value 
                            ? '2px solid #1D3557' 
                            : '1px solid #D1D5DB',
                          backgroundColor: formData.userType === type.value ? '#1D3557' : '#FFFFFF',
                          padding: '0 1rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: formData.userType === type.value ? '#FFFFFF' : '#1A202C',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: formData.userType === type.value ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.userType !== type.value) {
                            e.target.style.backgroundColor = '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.userType !== type.value) {
                            e.target.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee Type Selection */}
                {formData.userType === 'Employee' && (
                  <div>
                    <label style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#1A202C',
                      display: 'block'
                    }}>
                      Employee Type
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem'
                    }}>
                      {employeeTypes.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleChange({ target: { name: 'employeeType', value: type.value } })}
                          style={{
                            display: 'flex',
                            height: '3rem',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '0.375rem',
                            border: formData.employeeType === type.value 
                              ? '2px solid #1D3557' 
                              : '1px solid #D1D5DB',
                            backgroundColor: formData.employeeType === type.value ? '#1D3557' : '#FFFFFF',
                            padding: '0 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: formData.employeeType === type.value ? '#FFFFFF' : '#1A202C',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: formData.employeeType === type.value ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.employeeType !== type.value) {
                              e.target.style.backgroundColor = '#F9FAFB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.employeeType !== type.value) {
                              e.target.style.backgroundColor = '#FFFFFF';
                            }
                          }}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    {errors.employeeType && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.employeeType}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* First Name and Last Name Inputs for Student/Staff/TA/Professor */}
                  {formData.userType !== 'Vendor' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            paddingBottom: '0.5rem',
                            color: '#1A202C',
                            margin: 0
                          }}>
                            First Name
                          </p>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="e.g. Jane"
                            disabled={loading}
                            style={{
                              display: 'flex',
                              width: '100%',
                              minWidth: 0,
                              flex: 1,
                              resize: 'none',
                              overflow: 'hidden',
                              borderRadius: '0.375rem',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              padding: '0.75rem 1rem',
                              fontSize: '1rem',
                              color: '#1A202C',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#1D3557';
                              e.target.style.outline = 'none';
                              e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = errors.firstName ? '#DC3545' : '#D1D5DB';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                          {errors.firstName && (
                            <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                              {errors.firstName}
                            </div>
                          )}
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            paddingBottom: '0.5rem',
                            color: '#1A202C',
                            margin: 0
                          }}>
                            Last Name
                          </p>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="e.g. Doe"
                            disabled={loading}
                            style={{
                              display: 'flex',
                              width: '100%',
                              minWidth: 0,
                              flex: 1,
                              resize: 'none',
                              overflow: 'hidden',
                              borderRadius: '0.375rem',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              padding: '0.75rem 1rem',
                              fontSize: '1rem',
                              color: '#1A202C',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#1D3557';
                              e.target.style.outline = 'none';
                              e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = errors.lastName ? '#DC3545' : '#D1D5DB';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                          {errors.lastName && (
                            <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                              {errors.lastName}
                            </div>
                          )}
                        </label>
                      </div>
                    </>
                  )}

                  {/* Company Name for Vendors */}
                  {formData.userType === 'Vendor' && (
                    <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        paddingBottom: '0.5rem',
                        color: '#1A202C',
                        margin: 0
                      }}>
                        Company Name
                      </p>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. ABC Company"
                        disabled={loading}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minWidth: 0,
                          flex: 1,
                          resize: 'none',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem 1rem',
                          fontSize: '1rem',
                          color: '#1A202C',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1D3557';
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.companyName ? '#DC3545' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {errors.companyName && (
                        <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {errors.companyName}
                        </div>
                      )}
                    </label>
                  )}

                  {/* vendor file inputs moved to bottom to match layout */}

                  {/* Email Input */}
                  <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#1A202C',
                      margin: 0
                    }}>
                      {formData.userType === 'Vendor' ? 'Email' : 'University Email'}
                    </p>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={
                        formData.userType === 'Student'
                          ? "you@student.guc.edu.eg"
                          : formData.userType === 'Employee'
                          ? "you@guc.edu.eg"
                          : "you@company.com"
                      }
                      disabled={loading}
                      style={{
                        display: 'flex',
                        width: '100%',
                        minWidth: 0,
                        flex: 1,
                        resize: 'none',
                        overflow: 'hidden',
                        borderRadius: '0.375rem',
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        padding: '0.75rem 1rem',
                        fontSize: '1rem',
                        color: '#1A202C',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1D3557';
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.email ? '#DC3545' : '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.email && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.email}
                      </div>
                    )}
                  </label>

                  {/* GUC ID / Staff ID for Students, Staff, TA, and Professor */}
                  {(formData.userType === 'Student' || (formData.userType === 'Employee' && formData.employeeType)) && (
                    <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        paddingBottom: '0.5rem',
                        color: '#1A202C',
                        margin: 0
                      }}>
                        {formData.userType === 'Student' ? 'Student ID' : 'Staff ID'}
                      </p>
                      <input
                        type="text"
                        name="gucId"
                        value={formData.gucId}
                        onChange={handleChange}
                        placeholder={formData.userType === 'Student' ? "e.g. 34-1234" : "e.g. 00-0000"}
                        disabled={loading}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minWidth: 0,
                          flex: 1,
                          resize: 'none',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem 1rem',
                          fontSize: '1rem',
                          color: '#1A202C',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1D3557';
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.gucId ? '#DC3545' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {errors.gucId && (
                        <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {errors.gucId}
                        </div>
                      )}
                    </label>
                  )}

                  {/* Password Input */}
                  <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#1A202C',
                      margin: 0
                    }}>
                      Password
                    </p>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter a strong password"
                        disabled={loading}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minWidth: 0,
                          flex: 1,
                          resize: 'none',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          fontSize: '1rem',
                          color: '#1A202C',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1D3557';
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.password ? '#DC3545' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          inset: '0 0 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          paddingRight: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9CA3AF'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#4B5563'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: '#E5E7EB',
                            borderRadius: '9999px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(passwordStrength.score / 5) * 100}%`,
                              backgroundColor: passwordStrength.color || '#E5E7EB',
                              transition: 'all 0.3s ease',
                              borderRadius: '9999px'
                            }}></div>
                          </div>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: passwordStrength.color || '#6B7280',
                            minWidth: '60px',
                            textAlign: 'right'
                          }}>
                            {passwordStrength.label || 'Enter password'}
                          </span>
                        </div>
                        {/* Password Requirements Explanation */}
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6B7280',
                          marginTop: '0.25rem',
                          lineHeight: '1.5'
                        }}>
                          <p style={{ margin: 0, marginBottom: '0.25rem', fontWeight: '500' }}>
                            Password requirements:
                          </p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                            <li>Minimum 8 characters (no maximum length)</li>
                            <li>At least one lowercase letter</li>
                            <li>At least one uppercase letter</li>
                            <li>At least one number</li>
                            <li>At least one special character (!@#$%^&*...)</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.password}
                      </div>
                    )}
                  </label>

                  {/* Confirm Password Input */}
                  <label style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      paddingBottom: '0.5rem',
                      color: '#1A202C',
                      margin: 0
                    }}>
                      Confirm Password
                    </p>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        disabled={loading}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minWidth: 0,
                          flex: 1,
                          resize: 'none',
                          overflow: 'hidden',
                          borderRadius: '0.375rem',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          fontSize: '1rem',
                          color: '#1A202C',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1D3557';
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = '0 0 0 2px rgba(29, 53, 87, 0.5)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.confirmPassword ? '#DC3545' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          inset: '0 0 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          paddingRight: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9CA3AF'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#4B5563'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div style={{ color: '#DC3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {errors.confirmPassword}
                      </div>
                    )}
                  </label>
                </div>

                {/* Company logo and tax card removed from signup per request */}

                {/* Sign Up Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    height: '3rem',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem',
                    backgroundColor: '#1D3557',
                    padding: '0 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.backgroundColor = 'rgba(29, 53, 87, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.target.style.backgroundColor = '#1D3557';
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span style={{ marginLeft: '8px' }}>Creating Account...</span>
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </form>
            </div>

            {/* Login Link */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#4B5563' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  fontWeight: '600',
                  color: '#457B9D',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = 'none';
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>

        {/* Right Panel - Background Image */}
        <div className="signup-right-panel" style={{
          position: 'relative',
          display: 'none',
          width: '100%',
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            width: '100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundImage: 'url(/assets/images/login-background.jpg)'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.7)'
            }}></div>
            <div style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: '3rem',
              color: '#FFFFFF'
            }}>
              <h2 style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '2.25rem',
                fontWeight: '700',
                lineHeight: '1.25',
                margin: 0
              }}>
                "Connecting our campus, one event at a time."
              </h2>
              <p style={{
                marginTop: '1rem',
                fontSize: '1.125rem',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: 0
              }}>
                Explore, engage, and excel with Bindly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: Show right panel on large screens */}
      <style>{`
        @media (min-width: 1024px) {
          .signup-container {
            flex-direction: row !important;
            height: 100vh !important;
            overflow: hidden !important;
          }
          .signup-right-panel {
            display: flex !important;
            height: 100vh !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          .signup-container > div:first-child {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Signup;
