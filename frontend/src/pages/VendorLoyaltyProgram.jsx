import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import VendorDocumentsModal from '../components/VendorDocumentsModal';

const VendorLoyaltyProgram = () => {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingApp, setExistingApp] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);

  const [form, setForm] = useState({
    discountRate: '',
    discountType: 'percentage',
    promoCode: '',
    termsAndConditions: '',
    validFrom: '',
    validUntil: '',
    description: '',
    category: ''
  });
  const [formMode, setFormMode] = useState('create'); // 'create' | 'update'

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/vendor') {
      // Only match /vendor exactly, not other vendor routes
      return currentPath === '/vendor';
    }
    return currentPath.startsWith(path);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    // basic validation
    if (!form.discountRate || !form.promoCode || !form.termsAndConditions) {
      setError('Please fill discount rate, promo code and terms & conditions');
      return;
    }
    const payload = {
      discountRate: Number(form.discountRate),
      discountType: form.discountType,
      promoCode: form.promoCode,
      termsAndConditions: form.termsAndConditions,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      description: form.description,
      category: form.category
    };
    try {
      setLoading(true);
      let res;
      if (formMode === 'update') {
        // Update existing application
        res = await vendorApi.updateLoyaltyApplication(payload);
      } else {
        // Create / apply
        res = await vendorApi.applyToLoyaltyProgram(payload);
      }
      if (res && res.success) {
        const successMsg = res.message || (formMode === 'update' ? 'Application updated successfully' : 'Application submitted successfully');
        setSuccess(successMsg);
        setModalMessage(successMsg);
        setShowSuccessModal(true);
        // Refresh the application data
        const appRes = await vendorApi.getMyLoyaltyApplication();
        if (appRes && appRes.success) {
          setExistingApp(appRes.application || null);
        }
        // Clear form and reset mode
        setForm({
          discountRate: '',
          discountType: 'percentage',
          promoCode: '',
          termsAndConditions: '',
          validFrom: '',
          validUntil: '',
          description: '',
          category: ''
        });
        setFormMode('create');
      } else {
        const errorMsg = res?.message || (formMode === 'update' ? 'Failed to update application' : 'Failed to submit application');
        setError(errorMsg);
        setModalMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error('Error applying to loyalty program', err);
      const errorMsg = err.response?.data?.message || err.message || (formMode === 'update' ? 'Error updating application' : 'Error submitting application');
      setError(errorMsg);
      setModalMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    logout();
    navigate('/login');
  };

  // Fetch existing application on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setInitialLoading(true);
        setExistingApp(null); // Reset to null first
        const res = await vendorApi.getMyLoyaltyApplication();
        // Only set application if response is successful AND has an application object
        if (res && res.success && res.application && mounted) {
          setExistingApp(res.application);
        } else if (mounted) {
          // If success is false or no application, ensure it's null
          setExistingApp(null);
        }
      } catch (err) {
        // If 404, no application exists - this is normal for new vendors
        if (err.response && err.response.status === 404) {
          // This is expected for new vendors - no application exists yet
          if (mounted) {
            setExistingApp(null);
          }
        } else if (err.response && err.response.status !== 404) {
          // Only show error for non-404 errors
          console.error('Error fetching loyalty application', err);
          const errorMsg = err.response?.data?.message || err.message || 'Error fetching application';
          setError(errorMsg);
          setModalMessage(errorMsg);
          setShowErrorModal(true);
        } else {
          // Network or other errors - set to null
          if (mounted) {
            setExistingApp(null);
          }
        }
      } finally {
        if (mounted) setInitialLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Handle clicks outside logout dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutDropdown && event.target instanceof Element && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutDropdown]);

  const handleCancelMembership = () => {
    setShowCancelConfirmModal(true);
  };

  const confirmCancelMembership = async () => {
    setShowCancelConfirmModal(false);
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const res = await vendorApi.cancelMyLoyaltyApplication();
      if (res && res.success) {
        const successMsg = res.message || 'Membership cancelled successfully';
        setSuccess(successMsg);
        setModalMessage(successMsg);
        setShowSuccessModal(true);
        // Refresh the application to get updated status (inactive)
        try {
          const appRes = await vendorApi.getMyLoyaltyApplication();
          if (appRes && appRes.success) {
            setExistingApp(appRes.application || null);
          } else {
            setExistingApp(null);
          }
        } catch (fetchErr) {
          // If 404, no application exists
          if (fetchErr.response && fetchErr.response.status === 404) {
            setExistingApp(null);
          }
        }
      } else {
        const errorMsg = res?.message || 'Failed to cancel membership';
        setError(errorMsg);
        setModalMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error('Error cancelling loyalty application', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error cancelling membership';
      setError(errorMsg);
      setModalMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = () => {
    if (!existingApp) return;
    // Prefill the form with the previous application values so vendor can resubmit
    setForm({
      discountRate: existingApp.discountRate || '',
      discountType: existingApp.discountType || 'percentage',
      promoCode: existingApp.promoCode || '',
      termsAndConditions: existingApp.termsAndConditions || '',
      validFrom: existingApp.validFrom ? existingApp.validFrom.split('T')[0] : '',
      validUntil: existingApp.validUntil ? existingApp.validUntil.split('T')[0] : '',
      description: existingApp.description || '',
      category: existingApp.category || ''
    });
    // Show the form by clearing existingApp so the form view renders
    setExistingApp(null);
    setFormMode('create');
    // Scroll to the form area for better UX
    setTimeout(() => {
      const el = document.querySelector('form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleEditApplication = () => {
    if (!existingApp) return;
    setForm({
      discountRate: existingApp.discountRate || '',
      discountType: existingApp.discountType || 'percentage',
      promoCode: existingApp.promoCode || '',
      termsAndConditions: existingApp.termsAndConditions || '',
      validFrom: existingApp.validFrom ? existingApp.validFrom.split('T')[0] : '',
      validUntil: existingApp.validUntil ? existingApp.validUntil.split('T')[0] : '',
      description: existingApp.description || '',
      category: existingApp.category || ''
    });
    // Show the form and switch to update mode
    setExistingApp(null);
    setFormMode('update');
    setTimeout(() => {
      const el = document.querySelector('form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Inter, sans-serif', backgroundColor: '#f6f7f8' }}>
      {/* Header/Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2.5rem',
        backgroundColor: '#182e4d'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
          <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img
              src="/assets/images/bindly-logo.png"
              alt="Bindly Logo"
              style={{ height: '3rem', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
            />
          </Link>
        </div>
        
        {/* Centered Navigation Menu */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '1.25rem'
        }}>
          <Link
            to="/vendor"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              dashboard
            </span>
            Dashboard
          </Link>
          <Link
            to="/vendor/bazaars"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/bazaars') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              explore
            </span>
            Discover Bazaars
          </Link>
          <Link
            to="/vendor/accepted-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/accepted-events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              event
            </span>
            My Participations
          </Link>
          <Link
            to="/vendor/my-requests"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/my-requests') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              description
            </span>
            My Applications
          </Link>
          <Link
            to="/vendor/loyalty-program"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/loyalty-program') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/loyalty-program') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/loyalty-program') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              badge
            </span>
            Join Loyalty Program
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(() => {
              const hasTaxCard = !!(user?.vendorTaxCardPath || user?.hasTaxCard);
              const hasLogo = !!(user?.vendorLogoPath || user?.hasLogo);
              const isVerified = hasTaxCard && hasLogo;
              
              return (
                <div
                  onClick={!isVerified ? () => setShowDocumentsModal(true) : undefined}
                  style={{
                    position: 'relative',
                    cursor: isVerified ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start',
                    marginTop: '0.125rem'
                  }}
                  onMouseEnter={!isVerified ? (e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  } : undefined}
                  onMouseLeave={!isVerified ? (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  } : undefined}
                  title={!isVerified ? "Verify Account" : undefined}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: isVerified ? '#10b981' : 'rgba(255, 255, 255, 0.7)',
                    fontVariationSettings: isVerified ? "'FILL' 1" : "'FILL' 0"
                  }}>
                    verified
                  </span>
                  {!isVerified && (
                    <div style={{
                      width: '0.25rem',
                      height: '0.25rem',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    }}></div>
                  )}
                </div>
              );
            })()}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
                {user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Vendor</p>
            </div>
            <div
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
          >
            {(() => {
              const avatarPath = user?.profilePicturePath || user?.vendorLogoPath;
              const avatarSrc = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `http://localhost:5000${avatarPath}`) : null;
              return avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="User profile"
                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {(user?.companyName?.[0] || user?.firstName?.[0] || user?.name?.[0] || 'V').toUpperCase()}
                </div>
              );
            })()}
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '150px'
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    logout
                  </span>
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem 4rem' }}>
        {/* Back button removed per vendor UX: keep vendor on loyalty page */}

        <div style={{ 
          position: 'relative', 
          height: '140px', 
          borderRadius: '0.75rem', 
          overflow: 'hidden', 
          marginBottom: '1.5rem', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes slideInRight {
              from {
                opacity: 0;
                transform: translateX(30px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
          `}</style>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundImage: 'url(/assets/images/LoyaltyProgram.png)', 
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover', 
            filter: 'blur(2px)',
            animation: 'pulse 4s ease-in-out infinite'
          }}></div>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(29, 53, 87, 0.75)'}}></div>
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', color: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: '1.75rem', animation: 'slideInRight 0.8s ease-out' }}>GUC Loyalty Program</h3>
            <p style={{ margin: 0, animation: 'slideInRight 0.8s ease-out 0.2s both' }}>Apply to the GUC Loyalty Program to offer discounts to the campus community.</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '720px', background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {initialLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
            ) : existingApp ? (
              <div>
                {existingApp.isActive ? (
                  <>
                    <h4 style={{ marginTop: 0 }}>You're already a member</h4>
                    <p style={{ color: '#374151' }}>Your loyalty program is active with promo code <strong>{existingApp.promoCode}</strong>. If you want to stop participating, you can cancel your membership below.</p>
                    {error && <div style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{error}</div>}
                    {success && <div style={{ color: '#065f46', marginBottom: '0.75rem' }}>{success}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
                      <button 
                        onClick={handleEditApplication} 
                        disabled={loading} 
                        style={{ 
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          opacity: loading ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#e5e7eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                      >
                        {loading ? 'Preparing…' : 'Update my application'}
                      </button>
                      <button 
                        onClick={handleCancelMembership} 
                        disabled={loading} 
                        style={{ 
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          backgroundColor: loading ? '#9ca3af' : '#dc2626',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#b91c1c';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#dc2626';
                          }
                        }}
                      >
                        {loading ? 'Cancelling…' : 'Cancel membership'}
                      </button>
                    </div>
                  </>
                  ) : (
                  <>
                    <h4 style={{ marginTop: 0 }}>Your membership is inactive</h4>
                    <p style={{ color: '#374151' }}>Your loyalty program membership with promo code <strong>{existingApp.promoCode}</strong> is currently inactive. You can reactivate it by submitting a new application below.</p>
                    {error && <div style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{error}</div>}
                    {success && <div style={{ color: '#065f46', marginBottom: '0.75rem' }}>{success}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button 
                        onClick={handleResubmit} 
                        disabled={loading} 
                        style={{ 
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          backgroundColor: loading ? '#9ca3af' : '#1D3557',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
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
                        {loading ? 'Preparing…' : 'Resubmit Application'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <h4 style={{ marginTop: 0 }}>Apply to GUC Loyalty Program</h4>
                {error && <div style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{error}</div>}
                {success && <div style={{ color: '#065f46', marginBottom: '0.75rem' }}>{success}</div>}
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Discount Rate<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                      <input name="discountRate" value={form.discountRate} onChange={handleChange} className="form-input" placeholder="e.g. 10" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Promo Code<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                      <input name="promoCode" value={form.promoCode} onChange={handleChange} className="form-input" placeholder="e.g. GUC10" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Category</label>
                      <input name="category" value={form.category} onChange={handleChange} className="form-input" placeholder="e.g. Food, Retail" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Terms & Conditions<span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span></label>
                    <textarea name="termsAndConditions" value={form.termsAndConditions} onChange={handleChange} className="form-input" rows={4} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Valid From</label>
                      <input type="date" name="validFrom" value={form.validFrom} onChange={handleChange} className="form-input" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Valid Until</label>
                      <input type="date" name="validUntil" value={form.validUntil} onChange={handleChange} className="form-input" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Description (optional)</label>
                    <textarea name="description" value={form.description} onChange={handleChange} className="form-input" rows={3} />
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      style={{ 
                        padding: '0.75rem 1.5rem',
                        backgroundColor: loading ? '#9ca3af' : '#1D3557',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        opacity: loading ? 0.7 : 1,
                        transition: 'all 0.2s'
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
                      {loading ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Vendor Documents Modal */}
      {showDocumentsModal && (
        <VendorDocumentsModal
          onClose={() => setShowDocumentsModal(false)}
          onSuccess={(vendorData) => {
            if (vendorData) {
              const updatedUser = { ...user };
              if (vendorData.taxCardPath !== null && vendorData.taxCardPath !== undefined) {
                updatedUser.vendorTaxCardPath = vendorData.taxCardPath;
              }
              if (vendorData.logoPath !== null && vendorData.logoPath !== undefined) {
                updatedUser.vendorLogoPath = vendorData.logoPath;
              }
              updatedUser.hasTaxCard = vendorData.hasTaxCard !== undefined ? vendorData.hasTaxCard : !!vendorData.taxCardPath;
              updatedUser.hasLogo = vendorData.hasLogo !== undefined ? vendorData.hasLogo : !!vendorData.logoPath;
              updateUser(updatedUser);
            }
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem'
        }}
        onClick={() => setShowCancelConfirmModal(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Confirm Cancellation
              </h3>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Are you sure you want to cancel your GUC Loyalty membership? This action cannot be undone.
              </p>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setShowCancelConfirmModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCancelMembership}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading ? '#9ca3af' : '#dc2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {loading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem'
        }}
        onClick={() => setShowErrorModal(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '1.5rem',
                  color: '#ef4444'
                }}>
                  error
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  Error
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: '1.5'
                }}>
                  {modalMessage || 'An error occurred'}
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowErrorModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#1D3557',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#152843';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1D3557';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem'
        }}
        onClick={() => setShowSuccessModal(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '1.5rem',
                  color: '#10b981'
                }}>
                  check_circle
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  Success
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: '1.5'
                }}>
                  {modalMessage || 'Operation completed successfully'}
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#1D3557',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#152843';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1D3557';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorLoyaltyProgram;
