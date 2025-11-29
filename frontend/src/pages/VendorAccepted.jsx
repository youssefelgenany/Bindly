import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';
import axios from 'axios';

const VendorAccepted = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [events, setEvents] = useState([]);
    const [typeFilter, setTypeFilter] = useState('all'); // all | bazaar | booth
    const [q, setQ] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                // prefer the requests endpoint which includes requestId and payment fields
                const res = await vendorApi.listMyRequests({ status: 'accepted' });
                // vendorApi.listMyRequests may return { events: [...] } or an array; normalize
                const list = Array.isArray(res?.events) ? res.events : (Array.isArray(res) ? res : []);
                setEvents(list);
            } catch (e) {
                console.error('Failed to load accepted requests', e);
                setError('Failed to load your accepted upcoming events');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleCancel = async (requestId) => {
        if (!requestId) return;
        const ok = window.confirm('Are you sure you want to cancel this participation request? This cannot be undone.');
        if (!ok) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`http://localhost:5000/api/vendor-requests/${requestId}/cancel`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (res.status === 200) {
                setEvents(prev => prev.filter(ev => String(ev.requestId || ev._id) !== String(requestId)));
                alert('Participation request cancelled successfully.');
            } else {
                alert(res.data?.message || 'Failed to cancel request');
            }
        } catch (err) {
            console.error('Error cancelling request:', err);
            const msg = err.response?.data?.message || err.message || 'Error cancelling request';
            alert(msg);
        }
    };

    const { user } = useAuth();
    const location = useLocation();

    const isActiveRoute = (path) => {
        const currentPath = location.pathname;
        if (currentPath === path) return true;
        if (path === '/vendor') return currentPath === '/vendor';
        return currentPath.startsWith(path);
    };

    const filtered = useMemo(() => {
        let list = Array.isArray(events) ? events : [];
        if (typeFilter !== 'all') list = list.filter(e => (e.type || '') === typeFilter);
        if (q.trim()) {
            const s = q.trim().toLowerCase();
            list = list.filter(e => (e.name || '').toLowerCase().includes(s) || (e.location || '').toLowerCase().includes(s));
        }
        return list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }, [events, typeFilter, q]);

    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#f6f7f8'
        }}>
            {/* Header/Navbar */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2.5rem',
                backgroundColor: '#FFFFFF'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#1D3557' }}>
                    <Link to="/vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h2 style={{
                            color: '#1D3557',
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            lineHeight: '1.25',
                            margin: 0,
                            cursor: 'pointer'
                        }}>Bindly</h2>
                    </Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                    {(() => {
                        const avatarPath = user?.profilePicturePath || user?.vendorLogoPath;
                        const avatarSrc = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `http://localhost:5000${avatarPath}`) : null;
                        return avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt="User profile"
                                style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '50%',
                                backgroundColor: '#1D3557',
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
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1D3557', margin: 0 }}>{user?.companyName || user?.firstName}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Vendor</p>
                    </div>
                </div>
            </header>

            {/* Horizontal Menu Bar */}
            <nav style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem 2rem',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <Link to="/vendor" style={{ textDecoration: 'none', color: isActiveRoute('/vendor') ? '#2563eb' : '#6b7280', fontSize: '0.875rem', fontWeight: isActiveRoute('/vendor') ? '600' : '500', paddingBottom: '0.5rem', borderBottom: isActiveRoute('/vendor') ? '2px solid #2563eb' : '2px solid transparent' }}>Dashboard</Link>
                    <Link to="/vendor/bazaars" style={{ textDecoration: 'none', color: isActiveRoute('/vendor/bazaars') ? '#2563eb' : '#6b7280', fontSize: '0.875rem', fontWeight: isActiveRoute('/vendor/bazaars') ? '600' : '500', paddingBottom: '0.5rem', borderBottom: isActiveRoute('/vendor/bazaars') ? '2px solid #2563eb' : '2px solid transparent' }}>Discover Bazaars</Link>
                    <Link to="/vendor/accepted-events" style={{ textDecoration: 'none', color: isActiveRoute('/vendor/accepted-events') ? '#2563eb' : '#6b7280', fontSize: '0.875rem', fontWeight: isActiveRoute('/vendor/accepted-events') ? '600' : '500', paddingBottom: '0.5rem', borderBottom: isActiveRoute('/vendor/accepted-events') ? '2px solid #2563eb' : '2px solid transparent' }}>My Participations</Link>
                    <Link to="/vendor/my-requests" style={{ textDecoration: 'none', color: isActiveRoute('/vendor/my-requests') ? '#2563eb' : '#6b7280', fontSize: '0.875rem', fontWeight: isActiveRoute('/vendor/my-requests') ? '600' : '500', paddingBottom: '0.5rem', borderBottom: isActiveRoute('/vendor/my-requests') ? '2px solid #2563eb' : '2px solid transparent' }}>My Applications</Link>
                    <Link to="/vendor/loyalty-program" style={{ textDecoration: 'none', color: isActiveRoute('/vendor/loyalty-program') ? '#2563eb' : '#6b7280', fontSize: '0.875rem', fontWeight: isActiveRoute('/vendor/loyalty-program') ? '600' : '500', paddingBottom: '0.5rem', borderBottom: isActiveRoute('/vendor/loyalty-program') ? '2px solid #2563eb' : '2px solid transparent' }}>GUC Loyalty Program</Link>
                </div>
            </nav>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '2rem' }}>
                <div className="container">
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                            <div>
                                <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>My Accepted Upcoming</h1>
                                <p className="card-subtitle">Bazaars and booths where your request is accepted</p>
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: 12 }}>{filtered.length} results</div>
                        </div>

                    <div className="card" style={{ background: 'var(--light-gray)', padding: '0.75rem', border: '1px solid var(--medium-gray)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input className="form-input" placeholder="Search by name or location" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 240 }} />
                            <select className="form-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ minWidth: 160 }}>
                                <option value="all">All types</option>
                                <option value="bazaar">Bazaars</option>
                                <option value="booth">Booths</option>
                            </select>
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
                        <div className="no-events"><p>No accepted upcoming events found.</p></div>
                    ) : (
                        <div className="events-list" style={{ display: 'grid', gap: '1rem' }}>
                            {filtered.map(ev => (
                                <div key={ev._id || ev.requestId} className="event-card">
                                    <div className="event-info">
                                        <h3>{ev.name}</h3>
                                        <p className="event-type">{(ev.type || '').toUpperCase()}</p>
                                        {ev.location && (<p className="event-location">📍 {ev.location}</p>)}
                                        <p className="event-date">🗓️ {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}</p>
                                        {ev.description && (<p className="event-description">{ev.description}</p>)}
                                    </div>
                                    {/* Footer: align buttons bottom-right */}
                                    <div style={{ padding: '0.75rem 1rem 1rem', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                                        {ev.price > 0 && (
                                            <button
                                                onClick={() => navigate(`/events/${ev._id}/payment`)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    minWidth: 160,
                                                    borderRadius: '0.375rem',
                                                    backgroundColor: '#1e40af',
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    marginRight: '0.5rem',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Pay Participation Fee
                                            </button>
                                        )}

                                        {ev.requestId && (ev.paymentStatus !== 'paid' && !ev.paidAt) && (
                                            <button
                                                onClick={() => handleCancel(ev.requestId)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    minWidth: 160,
                                                    borderRadius: '0.375rem',
                                                    backgroundColor: '#ef4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Cancel Participation
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                </div>
            </main>
        </div>
    );
};

export default VendorAccepted;


