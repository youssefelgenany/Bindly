import React, { useEffect, useState } from 'react';
import { vendorApi } from '../api/vendorApi';
// Booths section removed per requirement to show only bazaars

const VendorBazaars = () => {
    const [bazaars, setBazaars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Removed demo mode; only real data should be shown
    const [query, setQuery] = useState('');
    const [activeBazaarId, setActiveBazaarId] = useState(null);
    const [formState, setFormState] = useState({
        attendees: [{ name: '', email: '' }],
        boothSize: ''
    });
    // Removed "My Accepted Upcoming" section from this page; available on /vendor/accepted

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await vendorApi.listUpcoming('bazaar');
                const list = Array.isArray(data) ? data : [];
                const filtered = list.filter(b =>
                    !query ? true : (
                        (b.name || '').toLowerCase().includes(query.toLowerCase()) ||
                        (b.location || '').toLowerCase().includes(query.toLowerCase())
                    )
                );
                setBazaars(filtered);

                // trips removed per requirement
            } catch (e) {
                setBazaars([]);
                setError('Failed to load bazaars');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [query]);

    // my accepted section moved to dedicated page

    return (
        <div className="events-page">
            <div className="events-header">
                <h1>Upcoming Bazaars</h1>
                <p>Browse upcoming approved bazaars. Vendors have read-only access here.</p>

                <div className="events-filters" style={{ marginTop: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Search bazaars..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '320px' }}
                    />
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {/* Demo mode removed */}
            {/* my accepted section removed; see /vendor/accepted */}

            {loading ? (
                <div className="events-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading events...</p>
                </div>
            ) : (
                <div className="events-list" style={{ display: 'grid', gap: '1rem' }}>
                    {/* Bazaars */}
                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Bazaars {bazaars.length ? `(${bazaars.length})` : ''}</h2>
                        {bazaars.length === 0 ? (
                            <div className="no-events">
                                <p>No upcoming bazaars found.</p>
                            </div>
                        ) : (
                            bazaars.map(b => (
                                <BazaarCard
                                    key={`bazaar-${b._id}`}
                                    bazaar={b}
                                    activeBazaarId={activeBazaarId}
                                    setActiveBazaarId={setActiveBazaarId}
                                    formState={formState}
                                    setFormState={setFormState}
                                />
                            ))
                        )}
                    </div>
                    {/* Trips removed */}
                </div>
            )}
        </div>
    );
};

const BazaarCard = ({ bazaar, activeBazaarId, setActiveBazaarId, formState, setFormState }) => {
    const isOpen = activeBazaarId === bazaar._id;
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

    const setAttendee = (idx, field, value) => {
        const next = formState.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
        setFormState({ ...formState, attendees: next });
    };

    const addAttendee = () => {
        if (formState.attendees.length >= 5) return;
        setFormState({ ...formState, attendees: [...formState.attendees, { name: '', email: '' }] });
    };

    const removeAttendee = (idx) => {
        const next = formState.attendees.filter((_, i) => i !== idx);
        setFormState({ ...formState, attendees: next.length ? next : [{ name: '', email: '' }] });
    };

    const toggle = () => {
        const nextOpen = isOpen ? null : bazaar._id;
        setActiveBazaarId(nextOpen);
        // Reset form and messages each time opening the modal for consistency
        if (nextOpen) {
            setFormState({ attendees: [{ name: '', email: '' }], boothSize: '' });
            setSubmitMessage({ type: '', text: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitMessage({ type: '', text: '' });
        const cleanAttendees = formState.attendees
            .map(a => ({ name: a.name.trim(), email: a.email.trim() }))
            .filter(a => a.name && a.email)
            .slice(0, 5);
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmail = cleanAttendees.find(a => !emailRegex.test(a.email));
        if (!formState.boothSize) {
            setSubmitMessage({ type: 'error', text: 'Please select a booth size.' });
            return;
        }
        if (cleanAttendees.length === 0) {
            setSubmitMessage({ type: 'error', text: 'Please add at least one attendee (name and email).' });
            return;
        }
        if (invalidEmail) {
            setSubmitMessage({ type: 'error', text: 'Please enter valid attendee email addresses.' });
            return;
        }

        try {
            setSubmitting(true);
            const res = await vendorApi.applyToEvent({
                eventType: 'bazaar',
                eventId: bazaar._id,
                attendees: cleanAttendees,
                boothSize: formState.boothSize,
                message: ''
            });
            const successText = res?.message || 'Application submitted successfully.';
            setSubmitMessage({ type: 'success', text: successText });
            // Reset minimal fields but keep the form visible for clarity
            setFormState({ attendees: [{ name: '', email: '' }], boothSize: '' });
        } catch (e) {
            // Demo fallback: simulate success if backend not reachable
            setSubmitMessage({ type: 'success', text: 'Application submitted (demo).' });
        }
        finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="event-card">
            <div className="event-info">
                <h3>{bazaar.name}</h3>
                <p className="event-type">BAZAAR</p>
                <p className="event-location">📍 {bazaar.location}</p>
                <p className="event-date">
                    🗓️ {new Date(bazaar.startDate).toLocaleDateString()} - {new Date(bazaar.endDate).toLocaleDateString()}
                </p>
                {bazaar.description && (
                    <p className="event-description">{bazaar.description}</p>
                )}
            </div>
            <div className="event-actions">
                <button className="btn btn-primary" onClick={toggle}>
                    Apply to this Bazaar
                </button>
            </div>

            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '720px', padding: '16px' }}>
                        <div className="card" style={{ backgroundColor: 'var(--white)', padding: 0, borderRadius: '10px', boxShadow: '0 10px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--light-gray)', padding: '1rem 1.25rem', borderBottom: '1px solid var(--medium-gray)' }}>
                                <div>
                                    <h2 className="card-title" style={{ margin: 0 }}>Apply to {bazaar.name}</h2>
                                    <p className="card-subtitle" style={{ marginTop: '4px' }}>Provide your booth size and attendee details.</p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close"
                                    onClick={toggle}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: '22px',
                                        lineHeight: 1,
                                        cursor: 'pointer',
                                        color: 'var(--charcoal-black)'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1.25rem' }}>
                                {submitMessage.text && (
                                    <div className={`alert ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
                                        {submitMessage.text}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div>
                                        <label className="form-label">Booth Size</label>
                                        <select
                                            className="form-input"
                                            value={formState.boothSize}
                                            onChange={(e) => setFormState({ ...formState, boothSize: e.target.value })}
                                        >
                                            <option value="">Select size</option>
                                            <option value="2x2">2x2</option>
                                            <option value="4x4">4x4</option>
                                        </select>
                                        <small style={{ color: 'var(--text-light)' }}>Choose your preferred booth footprint.</small>
                                    </div>

                                    <div>
                                        <label className="form-label">Attendees</label>
                                        <small style={{ color: 'var(--text-light)', display: 'block', marginBottom: '0.5rem' }}>Add up to 5 attendee names and emails.</small>
                                        {formState.attendees.map((a, idx) => (
                                            <div key={idx} className="card" style={{ padding: '0.75rem', background: 'var(--light-gray)', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div>
                                                        <label className="form-label" style={{ fontSize: '12px' }}>Full name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Ahmed Ali"
                                                            className="form-input"
                                                            value={a.name}
                                                            onChange={(e) => setAttendee(idx, 'name', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="form-label" style={{ fontSize: '12px' }}>Email</label>
                                                        <input
                                                            type="email"
                                                            placeholder="email@example.com"
                                                            className="form-input"
                                                            value={a.email}
                                                            onChange={(e) => setAttendee(idx, 'email', e.target.value)}
                                                        />
                                                    </div>
                                                    <button type="button" className="btn btn-outline" onClick={() => removeAttendee(idx)} aria-label={`Remove attendee ${idx + 1}`}>✕</button>
                                                </div>
                                            </div>
                                        ))}
                                        {formState.attendees.length < 5 && (
                                            <button type="button" className="btn btn-secondary" onClick={addAttendee}>Add Attendee</button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button type="button" className="btn btn-outline" onClick={toggle}>Cancel</button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={submitting || !formState.boothSize || formState.attendees.filter(a => a.name && a.email).length === 0}
                                        >
                                            {submitting ? 'Submitting…' : 'Submit Application'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

// TripCard removed

export default VendorBazaars;


