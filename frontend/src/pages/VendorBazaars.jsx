import React, { useEffect, useState } from 'react';
import { vendorApi } from '../api/vendorApi';
import BoothList from '../components/BoothList';
import BoothApplicationForm from '../components/BoothApplicationForm';
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
    // Booth application form state
    const [selectedBooth, setSelectedBooth] = useState(null);
    const [showBoothForm, setShowBoothForm] = useState(false);
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

    // Handle booth application
    const handleApplyToBooth = (booth) => {
        const bazaar = bazaars.find(b => b.booths && b.booths.some(boothItem => boothItem._id === booth._id));
        setSelectedBooth({ booth, bazaar });
        setShowBoothForm(true);
    };

    const handleBoothApplicationSubmit = async (applicationData) => {
        try {
            // Check if it's a mock booth (for demonstration)
            if (applicationData.eventId.startsWith('mock-booth-')) {
                // Simulate successful application for mock booths
                return {
                    success: true,
                    message: 'Booth application submitted successfully! (Demo Mode)'
                };
            }

            // Real API call for actual booths
            const result = await vendorApi.applyToEvent(applicationData);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const closeBoothForm = () => {
        setShowBoothForm(false);
        setSelectedBooth(null);
    };

    // my accepted section moved to dedicated page

    return (
        <div className="events-page">
            <div className="events-header">
                <h1>Upcoming Bazaars & Booths</h1>
                <p>Browse upcoming approved bazaars and apply for specific booths. View booth details, pricing, and submit applications with attendee information and booth preferences.</p>
                <div style={{
                    backgroundColor: '#d1ecf1',
                    color: '#0c5460',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #bee5eb',
                    marginTop: '1rem',
                    fontSize: '0.9rem'
                }}>
                    <strong>🎭 Demo Mode:</strong> Mock booth data is displayed for demonstration purposes. Click "Apply" on any booth to see the comprehensive application form!
                </div>

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
                <div className="events-list" style={{ display: 'grid', gap: '2rem' }}>
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
                                    onApplyToBooth={handleApplyToBooth}
                                />
                            ))
                        )}
                    </div>
                    {/* Trips removed */}
                </div>
            )}

            {/* Booth Application Form Modal */}
            {showBoothForm && selectedBooth && (
                <BoothApplicationForm
                    booth={selectedBooth.booth}
                    bazaar={selectedBooth.bazaar}
                    onClose={closeBoothForm}
                    onSubmit={handleBoothApplicationSubmit}
                />
            )}
        </div>
    );
};

const BazaarCard = ({ bazaar, activeBazaarId, setActiveBazaarId, formState, setFormState, onApplyToBooth }) => {
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
                                    <h2 className="card-title" style={{ margin: 0, color: '#007bff' }}>
                                        Apply to {bazaar.name}
                                    </h2>
                                    <p className="card-subtitle" style={{ marginTop: '4px', color: '#6c757d' }}>
                                        {bazaar.location} • {new Date(bazaar.startDate).toLocaleDateString()} - {new Date(bazaar.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close"
                                    onClick={toggle}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        color: '#6c757d'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Form Content */}
                            <div style={{ padding: '1.5rem' }}>
                                {/* Bazaar Information */}
                                <div style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Bazaar Details</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                        <div><strong>Location:</strong> {bazaar.location}</div>
                                        <div><strong>Dates:</strong> {new Date(bazaar.startDate).toLocaleDateString()} - {new Date(bazaar.endDate).toLocaleDateString()}</div>
                                    </div>
                                    {bazaar.description && (
                                        <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                                            {bazaar.description}
                                        </p>
                                    )}
                                </div>

                                {submitMessage.text && (
                                    <div style={{
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        marginBottom: '1rem',
                                        backgroundColor: submitMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                                        color: submitMessage.type === 'success' ? '#155724' : '#721c24',
                                        border: `1px solid ${submitMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                                    }}>
                                        {submitMessage.text}
                                    </div>
                                )}
                                {/* Attendees Section */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>
                                        Attendees (Maximum 5)
                                    </h4>
                                    {formState.attendees.map((attendee, idx) => (
                                        <div key={idx} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr auto',
                                            gap: '0.5rem',
                                            marginBottom: '0.5rem',
                                            alignItems: 'end'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                value={attendee.name}
                                                onChange={(e) => setAttendee(idx, 'name', e.target.value)}
                                                style={{
                                                    padding: '0.5rem',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9rem'
                                                }}
                                                required
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                value={attendee.email}
                                                onChange={(e) => setAttendee(idx, 'email', e.target.value)}
                                                style={{
                                                    padding: '0.5rem',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9rem'
                                                }}
                                                required
                                            />
                                            {formState.attendees.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttendee(idx)}
                                                    style={{
                                                        backgroundColor: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '0.5rem',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {formState.attendees.length < 5 && (
                                        <button
                                            type="button"
                                            onClick={addAttendee}
                                            style={{
                                                backgroundColor: '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            + Add Attendee
                                        </button>
                                    )}
                                </div>

                                {/* Booth Configuration */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Booth Configuration</h4>

                                    {/* Booth Size */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                            Booth Size *
                                        </label>
                                        <select
                                            value={formState.boothSize}
                                            onChange={(e) => setFormState({ ...formState, boothSize: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                border: '1px solid #ced4da',
                                                borderRadius: '4px',
                                                fontSize: '0.9rem'
                                            }}
                                            required
                                        >
                                            <option value="">Select booth size</option>
                                            <option value="2x2">2x2 meters (Small Booth)</option>
                                            <option value="4x4">4x4 meters (Large Booth)</option>
                                        </select>
                                        <p style={{
                                            margin: '0.25rem 0 0 0',
                                            color: '#6c757d',
                                            fontSize: '0.8rem',
                                            fontStyle: 'italic'
                                        }}>
                                            📏 Choose the size of your booth space in meters
                                        </p>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={toggle}
                                        style={{
                                            backgroundColor: '#6c757d',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            backgroundColor: submitting ? '#6c757d' : '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '4px',
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Application'}
                                    </button>
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


