import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';

const VendorLoyaltyProgram = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingApp, setExistingApp] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

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

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
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
      const res = await vendorApi.applyToLoyaltyProgram(payload);
      if (res && res.success) {
        setSuccess(res.message || 'Application submitted successfully');
        // Refresh the application data
        const appRes = await vendorApi.getMyLoyaltyApplication();
        if (appRes && appRes.success) {
          setExistingApp(appRes.application || null);
        }
        // Clear form
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
      } else {
        setError(res?.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Error applying to loyalty program', err);
      setError(err.response?.data?.message || err.message || 'Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing application on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setInitialLoading(true);
        const res = await vendorApi.getMyLoyaltyApplication();
        if (res && res.success && mounted) {
          setExistingApp(res.application || null);
        }
      } catch (err) {
        // If 404, no application exists; otherwise show error
        if (err.response && err.response.status !== 404) {
          console.error('Error fetching loyalty application', err);
          setError(err.response?.data?.message || err.message || 'Error fetching application');
        }
      } finally {
        if (mounted) setInitialLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleCancelMembership = async () => {
    if (!window.confirm('Are you sure you want to cancel your GUC Loyalty membership?')) return;
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const res = await vendorApi.cancelMyLoyaltyApplication();
      if (res && res.success) {
        setSuccess(res.message || 'Membership cancelled');
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
        setError(res?.message || 'Failed to cancel membership');
      }
    } catch (err) {
      console.error('Error cancelling loyalty application', err);
      setError(err.response?.data?.message || err.message || 'Error cancelling membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Inter, sans-serif', backgroundColor: '#f6f7f8' }}>
      {/* Header/Nav - reuse the same layout as other vendor pages */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '1rem 2.5rem', backgroundColor: '#FFFFFF' }}>
        <div>
          <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{ color: '#1D3557', fontSize: '1.5rem', fontWeight: '700', margin: 0, cursor: 'pointer' }}>Bindly</h2>
          </Link>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1D3557', margin: 0 }}>{user?.companyName || user?.firstName}</p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Vendor</p>
        </div>
      </header>

      <nav style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#FFFFFF', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/vendor"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/vendor/bazaars"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/bazaars') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            Discover Bazaars
          </Link>
          <Link
            to="/vendor/accepted-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/accepted-events') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Participations
          </Link>
          <Link
            to="/vendor/my-requests"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/my-requests') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            My Applications
          </Link>
          <Link
            to="/vendor/loyalty-program"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/vendor/loyalty-program') ? '#2563eb' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/vendor/loyalty-program') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/vendor/loyalty-program') ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            GUC Loyalty Program
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 4rem' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/vendor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e5e7eb';
            e.target.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
            e.target.style.borderColor = '#e5e7eb';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            arrow_back
          </span>
          Back to Dashboard
        </button>

        <div style={{ position: 'relative', height: '140px', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/images/bazaar-background.jpg)', backgroundSize: 'cover', filter: 'blur(2px)' }}></div>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(29, 53, 87, 0.75)'}}></div>
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', color: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: '1.75rem' }}>GUC Loyalty Program</h3>
            <p style={{ margin: 0 }}>Apply to the GUC Loyalty Program to offer discounts to the campus community.</p>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button onClick={handleCancelMembership} disabled={loading} style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.5rem 0.75rem', minWidth: '160px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? 'Cancelling…' : 'Cancel membership'}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 style={{ marginTop: 0 }}>Your membership is inactive</h4>
                    <p style={{ color: '#374151' }}>Your loyalty program membership with promo code <strong>{existingApp.promoCode}</strong> is currently inactive. You can reactivate it by submitting a new application below.</p>
                    {error && <div style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{error}</div>}
                    {success && <div style={{ color: '#065f46', marginBottom: '0.75rem' }}>{success}</div>}
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
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Discount Rate</label>
                      <input name="discountRate" value={form.discountRate} onChange={handleChange} className="form-input" placeholder="e.g. 10" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Discount Type</label>
                      <select name="discountType" value={form.discountType} onChange={handleChange} className="form-input">
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Fixed amount</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Promo Code</label>
                      <input name="promoCode" value={form.promoCode} onChange={handleChange} className="form-input" placeholder="e.g. GUC10" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Category</label>
                      <input name="category" value={form.category} onChange={handleChange} className="form-input" placeholder="e.g. Food, Retail" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Terms & Conditions</label>
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
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.5rem 1rem' }}>{loading ? 'Submitting…' : 'Submit Application'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorLoyaltyProgram;
