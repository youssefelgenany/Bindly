import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApiService } from '../api/adminApi';

const AdminVendors = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | company
  const [statusFilter, setStatusFilter] = useState('all'); // all | verified | pending | active | blocked
  
  // Vendors state - will be loaded from API
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState({}); // id -> boolean
  const [actionMessages, setActionMessages] = useState({}); // id -> message

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading vendors with filters:', { q: searchQuery, status: statusFilter });
      const result = await adminApiService.getAllVendors({
        q: searchQuery,
        status: statusFilter
      });
      console.log('Vendors API result:', result);
      if (result.success) {
        setVendors(result.data.vendors || []);
        console.log('Vendors loaded:', result.data.vendors);
      } else {
        setError(result.message);
        console.error('API error:', result.message);
      }
    } catch (err) {
      setError('Failed to load vendors');
      console.error('Error loading vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Load vendors on component mount and when filters change
  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleVerificationToggle = async (vendorId, currentStatus) => {
    setProcessingIds(prev => ({ ...prev, [vendorId]: true }));
    setActionMessages(prev => ({ ...prev, [vendorId]: '' }));

    try {
      const result = await adminApiService.updateVendorVerification(vendorId, !currentStatus);
      if (result.success) {
        setActionMessages(prev => ({ ...prev, [vendorId]: result.data.message }));
        // Reload vendors to get updated data
        await loadVendors();
      } else {
        setActionMessages(prev => ({ ...prev, [vendorId]: result.message }));
      }
    } catch (error) {
      setActionMessages(prev => ({ ...prev, [vendorId]: 'Failed to update verification status' }));
    } finally {
      setProcessingIds(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const handleStatusToggle = async (vendorId, currentStatus) => {
    setProcessingIds(prev => ({ ...prev, [vendorId]: true }));
    setActionMessages(prev => ({ ...prev, [vendorId]: '' }));

    try {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      const result = await adminApiService.updateVendorStatus(vendorId, newStatus);
      if (result.success) {
        setActionMessages(prev => ({ ...prev, [vendorId]: result.data.message }));
        // Reload vendors to get updated data
        await loadVendors();
      } else {
        setActionMessages(prev => ({ ...prev, [vendorId]: result.message }));
      }
    } catch (error) {
      setActionMessages(prev => ({ ...prev, [vendorId]: 'Failed to update status' }));
    } finally {
      setProcessingIds(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const filteredVendors = useMemo(() => {
    // The filtering is now handled by the backend API
    return vendors;
  }, [vendors]);

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.userType === 'Admin')) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Unauthorized</h1>
              <p className="card-subtitle">You do not have access to this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Vendors</h1>
            <p className="card-subtitle">Manage platform vendors</p>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            {/* Search Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name, email, or company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '260px' }}
              />
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Vendors List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {loading ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <div style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading vendors...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--guc-red)', textAlign: 'center' }}>
                    {error}
                    <button 
                      onClick={loadVendors}
                      className="btn btn-outline"
                      style={{ marginLeft: '1rem', padding: '4px 8px' }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--text-light)' }}>
                    No vendors match your search.
                  </div>
                </div>
              ) : (
                filteredVendors.map((v) => {
                  const vendorId = v._id || v.id;
                  return (
                    <div key={vendorId} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                              {(v.firstName || '') + ' ' + (v.lastName || '')}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{v.email}</div>
                            <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                              Company: {v.companyName || 'N/A'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: v.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)' }}>
                              {v.isVerified ? 'Verified' : 'Pending'}
                            </div>
                            <div style={{ fontSize: '12px', color: v.status === 'active' ? 'var(--success-green)' : 'var(--guc-red)' }}>
                              {v.status === 'active' ? 'Active' : 'Blocked'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                              {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>

                        {/* Vendor Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-outline" style={{ fontSize: '12px' }}>
                            View Documents
                          </button>
                          <button 
                            className={v.isVerified ? 'btn btn-outline' : 'btn btn-primary'} 
                            style={{ fontSize: '12px' }}
                            onClick={() => handleVerificationToggle(vendorId, v.isVerified)}
                            disabled={!!processingIds[vendorId]}
                          >
                            {processingIds[vendorId] ? 'Processing...' : (v.isVerified ? 'Unverify' : 'Verify')}
                          </button>
                          <button 
                            className={v.status === 'active' ? 'btn btn-outline' : 'btn btn-primary'} 
                            style={{ fontSize: '12px' }}
                            onClick={() => handleStatusToggle(vendorId, v.status)}
                            disabled={!!processingIds[vendorId]}
                          >
                            {processingIds[vendorId] ? 'Processing...' : (v.status === 'active' ? 'Block' : 'Activate')}
                          </button>
                          
                          {actionMessages[vendorId] && (
                            <span style={{ 
                              marginLeft: '0.5rem', 
                              fontSize: '12px', 
                              color: actionMessages[vendorId].includes('successfully') ? 'var(--success-green)' : 'var(--guc-red)' 
                            }}>
                              {actionMessages[vendorId]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;
