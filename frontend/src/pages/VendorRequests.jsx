import React, { useEffect, useMemo, useState } from 'react';
import { vendorApi } from '../api/vendorApi';
import { adminApiService } from '../api/adminApi';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const VendorRequests = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [events, setEvents] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending'); // pending | rejected
    const [typeFilter, setTypeFilter] = useState('all'); // all | bazaar | booth
    const [q, setQ] = useState('');
    const [processingIds, setProcessingIds] = useState({});
    const [actionMessages, setActionMessages] = useState({});

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                console.log('🔍 VendorRequests - User:', user);
                console.log('🔍 VendorRequests - User type:', user?.userType);
                console.log('🔍 VendorRequests - Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
                
                const isEventsOffice = user && (
                  user.userType === 'Event Office' ||
                  user.userType === 'Events Office' ||
                  user.userType === 'event_office' ||
                  user.role === 'event_office' ||
                  user.role === 'Event Office'
                );

                if (isEventsOffice || (user && (user.role === 'admin' || user.role === 'Admin' || user.userType === 'Admin' || user.userType === 'admin'))) {
                    // Fetch all vendor requests (event office view)
                    const token = localStorage.getItem('token');
                    const res = await axios.get('http://localhost:5000/api/vendor-requests', {
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      }
                    });
                    const raw = Array.isArray(res.data) ? res.data : (res.data?.requests || []);

                    // Fetch vendors once to enrich if vendor field isn't populated
                    let vendorMap = {};
                    try {
                      const vendorsRes = await adminApiService.getAllVendors({});
                      const vendorsArr = Array.isArray(vendorsRes?.data?.vendors)
                        ? vendorsRes.data.vendors
                        : (Array.isArray(vendorsRes?.data) ? vendorsRes.data : []);
                      vendorsArr.forEach(v => {
                        const vid = v._id || v.id;
                        if (vid) vendorMap[vid] = v;
                      });
                    } catch (_) {
                      // ignore enrichment errors
                    }

                    // Normalize into displayable list
                    const mapped = raw.map(r => {
                      // support possible shapes
                      const ev = r.bazaar || r.booth || r.event || {};
                      const type = r.bazaar ? 'bazaar' : (r.booth ? 'booth' : (ev.type || ''));
                      const vendorVal = r.vendor;
                      const vendorObj = (vendorVal && typeof vendorVal === 'object') ? vendorVal
                        : (vendorVal && vendorMap[vendorVal]) ? vendorMap[vendorVal]
                        : {};
                      const vendorCompany = vendorObj.companyName || '';
                      const vendorName = ((vendorObj.firstName || '') + ' ' + (vendorObj.lastName || '')).trim();
                      const vendorEmail = vendorObj.email || '';
                      // Prefer explicit bazaar/booth or normalized event names
                      const bazaarName = r.bazaar && (r.bazaar.title || r.bazaar.name);
                      const boothName = r.booth && (r.booth.title || r.booth.name);
                      const eventNormalizedName = (r.event && (r.event.name || r.event.title)) || '';
                      const displayName = (type === 'bazaar'
                        ? (bazaarName || '')
                        : (boothName || ''))
                        || eventNormalizedName
                        || ev.name
                        || ev.title
                        || r.eventName;
                      return {
                        _id: r._id || ev._id,
                        name: displayName || 'Untitled',
                        type,
                        attendees: Array.isArray(r.attendees) ? r.attendees : [],
                        status: r.status || 'pending',
                        boothSize: r.boothSize || '',
                        vendorCompany,
                        vendorName,
                        vendorEmail,
                      };
                    });
                    setEvents(mapped);
                } else {
                    // Vendor self view
                    console.log('🔍 VendorRequests - Vendor self view, statusFilter:', statusFilter);
                    if (statusFilter === 'approved') {
                      // Use vendor requests collection with status=accepted
                      const acc = await vendorApi.listMyRequests({ status: 'accepted' });
                      console.log('🔍 Approved requests response:', acc);
                      const list = Array.isArray(acc?.events) ? acc.events : [];
                      console.log('📋 Approved events list:', list);
                      setEvents(list);
                    } else if (statusFilter === 'all') {
                      // Combine pending, rejected, and accepted from vendor requests collection
                      const [pendingRes, rejectedRes, acc] = await Promise.all([
                        vendorApi.listMyRequests({ status: 'pending' }),
                        vendorApi.listMyRequests({ status: 'rejected' }),
                        vendorApi.listMyRequests({ status: 'accepted' })
                      ]);
                      console.log('🔍 All requests responses:', { pendingRes, rejectedRes, acc });
                      const pend = Array.isArray(pendingRes?.events) ? pendingRes.events : [];
                      const rej = Array.isArray(rejectedRes?.events) ? rejectedRes.events : [];
                      const accList = Array.isArray(acc?.events) ? acc.events : [];
                      const combined = [
                        ...pend.map(x => ({ ...x, status: 'pending' })),
                        ...rej.map(x => ({ ...x, status: 'rejected' })),
                        ...accList.map(x => ({ ...x, status: 'accepted' }))
                      ];
                      console.log('📋 Combined events list:', combined);
                      setEvents(combined);
                    } else {
                      // pending or rejected
                      const res = await vendorApi.listMyRequests({ status: statusFilter });
                      console.log('🔍 Vendor requests response:', res);
                      console.log('🔍 Status filter:', statusFilter);
                      const list = Array.isArray(res?.events) ? res.events : [];
                      console.log('📋 Events list:', list);
                      setEvents(list);
                    }
                }
            } catch (e) {
                console.error('❌ VendorRequests - Error loading requests:', e);
                console.error('❌ VendorRequests - Error response:', e.response?.data);
                console.error('❌ VendorRequests - Error status:', e.response?.status);
                setError('Failed to load requests: ' + (e.response?.data?.message || e.message));
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, typeFilter, user]);

    const isEventsOffice = user && (
      user.userType === 'Event Office' ||
      user.userType === 'Events Office' ||
      user.userType === 'event_office' ||
      user.role === 'event_office' ||
      user.role === 'Event Office' ||
      user.role === 'admin' || user.role === 'Admin' || user.userType === 'Admin' || user.userType === 'admin'
    );

    const handleUpdateStatus = async (requestId, newStatus) => {
      setProcessingIds(prev => ({ ...prev, [requestId]: true }));
      setActionMessages(prev => ({ ...prev, [requestId]: '' }));
      try {
        const token = localStorage.getItem('token');
        const res = await axios.patch(`http://localhost:5000/api/vendor-requests/${requestId}/status`, { status: newStatus }, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (res.status === 200) {
          setActionMessages(prev => ({ ...prev, [requestId]: `Request ${newStatus}.` }));
          // reload current list with existing filter
          const token2 = localStorage.getItem('token');
          if (isEventsOffice) {
            const all = await axios.get('http://localhost:5000/api/vendor-requests', {
              headers: {
                'Content-Type': 'application/json',
                ...(token2 ? { 'Authorization': `Bearer ${token2}` } : {})
              }
            });
            const raw = Array.isArray(all.data) ? all.data : (all.data?.requests || []);
            const mapped = raw.map(r => ({
              _id: r._id,
              name: (r.event && (r.event.name || r.event.title)) || r.eventName || 'Untitled',
              type: (r.event && r.event.type) || r.eventType || (r.bazaar ? 'bazaar' : (r.booth ? 'booth' : '')),
              attendees: Array.isArray(r.attendees) ? r.attendees : [],
              status: r.status || 'pending',
              boothSize: r.boothSize || '',
              vendorCompany: r.vendor?.companyName || '',
              vendorName: ((r.vendor?.firstName || '') + ' ' + (r.vendor?.lastName || '')).trim(),
              vendorEmail: r.vendor?.email || ''
            }));
            setEvents(mapped);
          } else {
            const res2 = await vendorApi.listMyRequests({ status: statusFilter });
            const list = Array.isArray(res2?.events) ? res2.events : [];
            setEvents(list);
          }
        }
      } catch (e) {
        setActionMessages(prev => ({ ...prev, [requestId]: 'Update failed' }));
      } finally {
        setProcessingIds(prev => ({ ...prev, [requestId]: false }));
      }
    };

    const filtered = useMemo(() => {
        let list = Array.isArray(events) ? events : [];
        if (statusFilter !== 'all') list = list.filter(e => (e.status || 'pending') === (statusFilter === 'approved' ? 'accepted' : statusFilter));
        if (typeFilter !== 'all') list = list.filter(e => (e.type || '') === typeFilter);
        if (q.trim()) {
            const s = q.trim().toLowerCase();
            list = list.filter(e => (e.name || '').toLowerCase().includes(s));
        }
        return list;
    }, [events, statusFilter, typeFilter, q]);

    return (
        <div style={{ padding: '2rem' }}>
            <div className="container">
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>{(user && (user.userType === 'Event Office' || user.userType === 'Events Office' || user.userType === 'event_office' || user.role === 'event_office' || user.role === 'Event Office' || user.role === 'admin' || user.userType === 'Admin')) ? 'Vendor Requests' : 'My Requests'}</h1>
                            <p className="card-subtitle">{(user && (user.userType === 'Event Office' || user.userType === 'Events Office' || user.userType === 'event_office' || user.role === 'event_office' || user.role === 'Event Office' || user.role === 'admin' || user.userType === 'Admin')) ? 'All vendor requests from the database' : 'Upcoming bazaars/booths you applied to (pending or rejected)'}</p>
                        </div>
                        <div style={{ color: 'var(--text-light)', fontSize: 12 }}>{filtered.length} results</div>
                    </div>

                    <div className="card" style={{ background: 'var(--light-gray)', padding: '0.75rem', border: '1px solid var(--medium-gray)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input className="form-input" placeholder="Search by event name" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 240 }} />
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('pending')}
                              >Pending</button>
                              <button
                                className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('approved')}
                              >Approved</button>
                              <button
                                className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('rejected')}
                              >Rejected</button>
                              <button
                                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('all')}
                              >All</button>
                            </div>
                            {/* Event Type Filter */}
                            {isEventsOffice && (
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                  className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                                  onClick={() => setTypeFilter('all')}
                                >All Types</button>
                                <button
                                  className={`filter-btn ${typeFilter === 'bazaar' ? 'active' : ''}`}
                                  onClick={() => setTypeFilter('bazaar')}
                                >🏪 Bazaar</button>
                                <button
                                  className={`filter-btn ${typeFilter === 'booth' ? 'active' : ''}`}
                                  onClick={() => setTypeFilter('booth')}
                                >🏪 Booth</button>
                              </div>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="events-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading…</p>
                        </div>
                    ) : error ? (
                        <div className="alert alert-error">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="no-events"><p>No matching requests found.</p></div>
                    ) : (
                        <div className="events-list" style={{ display: 'grid', gap: '1rem' }}>
                            {filtered.map(ev => (
                                <div key={ev._id} className="event-card">
                                    <div className="event-info">
                                        {/* Event name, type, and status */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <h3 style={{ margin: 0 }}>{ev.name}</h3>
                                            {/* Event Type Badge */}
                                            {ev.type && (
                                              <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                backgroundColor: ev.type === 'bazaar' ? '#e3f2fd' : '#f3e5f5',
                                                color: ev.type === 'bazaar' ? '#1976d2' : '#7b1fa2',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                border: `1px solid ${ev.type === 'bazaar' ? '#1976d2' : '#7b1fa2'}`,
                                                alignSelf: 'flex-start'
                                              }}>
                                                🏪 {ev.type}
                                              </span>
                                            )}
                                          </div>
                                          {ev.status && (
                                            <span style={{
                                              padding: '4px 8px',
                                              borderRadius: 6,
                                              fontSize: 12,
                                              fontWeight: 700,
                                              backgroundColor: ev.status === 'accepted' ? 'var(--success-green)'
                                                : ev.status === 'rejected' ? 'var(--guc-red)'
                                                : 'var(--warning-yellow)',
                                              color: ev.status === 'pending' ? 'var(--charcoal-black)' : 'white',
                                              textTransform: 'uppercase',
                                              letterSpacing: 0.5
                                            }}>
                                              {ev.status}
                                            </span>
                                          )}
                                        </div>

                                        {/* Vendor info */}
                                        {(ev.vendorCompany || ev.vendorName || ev.vendorEmail) && (
                                          <div className="card" style={{ background: 'var(--light-gray)', padding: '0.75rem', borderRadius: 8, marginTop: '0.5rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)', marginBottom: 4 }}>Vendor</div>
                                            {ev.vendorCompany && (<div style={{ color: 'var(--text-light)' }}>🏢 {ev.vendorCompany}</div>)}
                                            {ev.vendorName && (<div style={{ color: 'var(--text-light)' }}>👤 {ev.vendorName}</div>)}
                                            {ev.vendorEmail && (<div style={{ color: 'var(--text-light)' }}>✉️ {ev.vendorEmail}</div>)}
                                          </div>
                                        )}

                                        {/* Attendees summary */}
                                        <div className="card" style={{ background: '#fff', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--medium-gray)', marginTop: '0.5rem' }}>
                                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)', marginBottom: 4 }}>Attendees ({Array.isArray(ev.attendees) ? ev.attendees.length : 0})</div>
                                          {Array.isArray(ev.attendees) && ev.attendees.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '4px' }}>
                                              {ev.attendees.map((a, idx) => (
                                                <div key={idx} style={{ color: 'var(--text-light)' }}>• {a.name} — {a.email}</div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div style={{ color: 'var(--text-light)' }}>No attendees provided</div>
                                          )}
                                        </div>

                                        {/* Booth size if present (bazaar applications) */}
                                        {ev.boothSize && (
                                          <div className="card" style={{ background: '#fff', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--medium-gray)', marginTop: '0.5rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--charcoal-black)', marginBottom: 4 }}>Booth</div>
                                            <div style={{ color: 'var(--text-light)' }}>📦 Booth Size: {ev.boothSize}</div>
                                          </div>
                                        )}

                                        {/* Actions for Event Office/Admin */}
                                        {isEventsOffice && (
                                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                            <button
                                              className="btn btn-primary"
                                              onClick={() => handleUpdateStatus(ev._id, 'accepted')}
                                              disabled={!!processingIds[ev._id] || ev.status === 'accepted'}
                                            >
                                              {processingIds[ev._id] ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                              className="btn btn-outline"
                                              onClick={() => handleUpdateStatus(ev._id, 'rejected')}
                                              disabled={!!processingIds[ev._id] || ev.status === 'rejected'}
                                              style={{ color: 'var(--guc-red)', borderColor: 'var(--guc-red)' }}
                                            >
                                              {processingIds[ev._id] ? 'Processing...' : 'Reject'}
                                            </button>
                                            {actionMessages[ev._id] && (
                                              <span style={{ fontSize: 12, color: actionMessages[ev._id].includes('failed') ? 'var(--guc-red)' : 'var(--success-green)' }}>
                                                {actionMessages[ev._id]}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorRequests;


