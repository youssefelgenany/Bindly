import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AdminVendors = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all'); // all | name | email | company

  // Placeholder vendor data
  const vendors = [
    {
      id: 'vendor-001',
      firstName: 'Mona',
      lastName: 'Adel',
      email: 'mona.adel@company.com',
      userType: 'Vendor',
      companyName: 'Adel Foods',
      isVerified: false,
      isActive: true,
      vendorLogoUrl: 'https://via.placeholder.com/200x120?text=Vendor+Logo',
      vendorTaxCardUrl: 'https://via.placeholder.com/300x200?text=Tax+Card+PDF+Preview',
      createdAt: '2024-09-12T12:45:00Z'
    },
    {
      id: 'vendor-002',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@techcorp.com',
      userType: 'Vendor',
      companyName: 'TechCorp Solutions',
      isVerified: true,
      isActive: true,
      vendorLogoUrl: 'https://via.placeholder.com/200x120?text=TechCorp+Logo',
      vendorTaxCardUrl: 'https://via.placeholder.com/300x200?text=TechCorp+Tax+Card',
      createdAt: '2024-09-08T09:30:00Z'
    },
    {
      id: 'vendor-003',
      firstName: 'Fatma',
      lastName: 'Mohamed',
      email: 'fatma.mohamed@fashion.com',
      userType: 'Vendor',
      companyName: 'Fashion Forward',
      isVerified: false,
      isActive: false,
      vendorLogoUrl: 'https://via.placeholder.com/200x120?text=Fashion+Logo',
      vendorTaxCardUrl: 'https://via.placeholder.com/300x200?text=Fashion+Tax+Card',
      createdAt: '2024-09-15T14:20:00Z'
    }
  ];

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vendors;

    const match = (v) => {
      const name = `${v.firstName || ''} ${v.lastName || ''}`.trim().toLowerCase();
      const email = (v.email || '').toLowerCase();
      const company = (v.companyName || '').toLowerCase();
      const id = (v.id || v._id || '').toLowerCase();

      if (searchField === 'name') return name.includes(q);
      if (searchField === 'email') return email.includes(q);
      if (searchField === 'company') return company.includes(q);
      return name.includes(q) || email.includes(q) || company.includes(q) || id.includes(q);
    };

    return vendors.filter(match);
  }, [searchQuery, searchField, vendors]);

  // Basic guard (UI-level) to avoid rendering for non-admins
  if (!(user?.role === 'admin' || user?.userType === 'Admin')) {
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
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">All fields</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="company">Company</option>
              </select>
            </div>

            {/* Vendors List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredVendors.length === 0 ? (
                <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', color: 'var(--text-light)' }}>
                    No vendors match your search.
                  </div>
                </div>
              ) : (
                filteredVendors.map((v) => (
                  <div key={v.id || v._id} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                    <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>
                            {(v.firstName || '') + ' ' + (v.lastName || '')}
                          </div>
                          <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{v.email}</div>
                          <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                            Company: {v.companyName}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: v.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)' }}>
                            {v.isVerified ? 'Verified' : 'Pending'}
                          </div>
                          <div style={{ fontSize: '12px', color: v.isActive ? 'var(--success-green)' : 'var(--guc-red)' }}>
                            {v.isActive ? 'Active' : 'Disabled'}
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
                        {!v.isVerified && (
                          <button className="btn btn-primary" style={{ fontSize: '12px' }}>
                            Approve Vendor
                          </button>
                        )}
                        <button className={v.isActive ? 'btn btn-outline' : 'btn btn-primary'} style={{ fontSize: '12px' }}>
                          {v.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;
