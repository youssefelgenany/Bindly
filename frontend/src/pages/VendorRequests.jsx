import React, { useEffect, useMemo, useState } from 'react';
import { vendorApi } from '../api/vendorApi';

const VendorRequests = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [events, setEvents] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending'); // pending | rejected
    const [typeFilter, setTypeFilter] = useState('all'); // all | bazaar | booth
    const [q, setQ] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await vendorApi.listMyRequests({ status: statusFilter });
                const list = Array.isArray(res?.events) ? res.events : [];
                setEvents(list);
            } catch (e) {
                setError('Failed to load your requests');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [statusFilter]);

    const filtered = useMemo(() => {
        let list = Array.isArray(events) ? events : [];
        if (typeFilter !== 'all') list = list.filter(e => (e.type || '') === typeFilter);
        if (q.trim()) {
            const s = q.trim().toLowerCase();
            list = list.filter(e => (e.name || '').toLowerCase().includes(s) || (e.location || '').toLowerCase().includes(s));
        }
        return list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }, [events, typeFilter, q]);

    return (
        <div style={{ padding: '2rem' }}>
            <div className="container">
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>My Requests</h1>
                            <p className="card-subtitle">Upcoming bazaars/booths you applied to (pending or rejected)</p>
                        </div>
                        <div style={{ color: 'var(--text-light)', fontSize: 12 }}>{filtered.length} results</div>
                    </div>

                    <div className="card" style={{ background: 'var(--light-gray)', padding: '0.75rem', border: '1px solid var(--medium-gray)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input className="form-input" placeholder="Search by name or location" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 240 }} />
                            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
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
                        <div className="no-events"><p>No matching requests found.</p></div>
                    ) : (
                        <div className="events-list" style={{ display: 'grid', gap: '1rem' }}>
                            {filtered.map(ev => (
                                <div key={ev._id} className="event-card">
                                    <div className="event-info">
                                        <h3>{ev.name}</h3>
                                        <p className="event-type">{(ev.type || '').toUpperCase()} • {statusFilter.toUpperCase()}</p>
                                        {ev.location && (<p className="event-location">📍 {ev.location}</p>)}
                                        <p className="event-date">🗓️ {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}</p>
                                        {ev.description && (<p className="event-description">{ev.description}</p>)}
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


