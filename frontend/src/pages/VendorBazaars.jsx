import React, { useEffect, useState } from 'react';
import { vendorApi } from '../api/vendorApi';
import BoothList from '../components/BoothList';
import BoothApplicationForm from '../components/BoothApplicationForm';
import StandaloneBoothsBrowser from '../components/StandaloneBoothsBrowser';

const VendorBazaars = () => {
    const [bazaars, setBazaars] = useState([]);
    const [standaloneBooths, setStandaloneBooths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [boothsLoading, setBoothsLoading] = useState(true);
    const [error, setError] = useState('');
    const [boothsError, setBoothsError] = useState('');
    const [activeTab, setActiveTab] = useState('bazaars'); // 'bazaars' or 'booths'
    const [query, setQuery] = useState('');
    const [activeBazaarId, setActiveBazaarId] = useState(null);
    const [formState, setFormState] = useState({
        attendees: [{ name: '', email: '' }],
        boothSize: ''
    });
    // Booth application form state
    const [selectedBooth, setSelectedBooth] = useState(null);
    const [showBoothForm, setShowBoothForm] = useState(false);

    // Load bazaars
    useEffect(() => {
        
        const loadBazaars = async () => {
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
            } catch (e) {
                setBazaars([]);
                setError('Failed to load bazaars');
            } finally {
                setLoading(false);
            }
        };
        loadBazaars();
    }, [query]);

    // Load standalone booths
    useEffect(() => {
        const loadStandaloneBooths = async () => {
            try {
                setBoothsLoading(true);
                setBoothsError('');
                const data = await vendorApi.listStandaloneBooths();
                const list = Array.isArray(data) ? data : [];
                setStandaloneBooths(list);
            } catch (e) {
                console.error('Error loading standalone booths:', e);
                setStandaloneBooths([]);
                setBoothsError('Failed to load standalone booths');
            } finally {
                setBoothsLoading(false);
            }
        };
        loadStandaloneBooths();
    }, []);

    // Handle booth application (for both bazaar booths and standalone booths)
    const handleApplyToBooth = (booth) => {
        // Normalize booth data structure (events have 'title', standalone booths have 'name')
        const normalizedBooth = {
            ...booth,
            name: booth.name || booth.title
        };
        
        // Check if it's a standalone booth
        if (standaloneBooths.some(sb => sb._id === booth._id)) {
            setSelectedBooth({ booth: normalizedBooth, bazaar: null, isStandalone: true });
        } else {
            // It's a bazaar booth
            const bazaar = bazaars.find(b => b.booths && b.booths.some(boothItem => boothItem._id === booth._id));
            setSelectedBooth({ booth: normalizedBooth, bazaar, isStandalone: false });
        }
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
                <h1>Bazaars & Booths</h1>
                <p>Browse upcoming bazaars and standalone booths. Apply for specific booths with detailed application forms including attendee information and booth preferences.</p>
                
                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1.5rem',
                    borderBottom: '2px solid var(--medium-gray)'
                }}>
                    <button
                        onClick={() => setActiveTab('bazaars')}
                        style={{
                            backgroundColor: activeTab === 'bazaars' ? 'var(--guc-red)' : 'transparent',
                            color: activeTab === 'bazaars' ? 'white' : 'var(--charcoal-black)',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        🏪 Bazaars ({bazaars.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('booths')}
                        style={{
                            backgroundColor: activeTab === 'booths' ? 'var(--guc-red)' : 'transparent',
                            color: activeTab === 'booths' ? 'white' : 'var(--charcoal-black)',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        🏢 Standalone Booths ({standaloneBooths.length})
                    </button>
                </div>

                {/* Search for bazaars tab */}
                {activeTab === 'bazaars' && (
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
                )}
            </div>

            {/* Error Messages */}
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
            {boothsError && <div className="alert alert-error">{boothsError}</div>}

            {/* Tab Content */}
            {activeTab === 'bazaars' && (
                loading ? (
                    <div className="events-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading bazaars...</p>
                    </div>
                ) : (
                    <div className="events-list">
                        <h2 style={{ 
                            marginBottom: '1.5rem', 
                            color: 'var(--charcoal-black)',
                            fontSize: '1.5rem',
                            fontWeight: '600'
                        }}>
                            Bazaars {bazaars.length ? `(${bazaars.length})` : ''}
                        </h2>
                        {bazaars.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem 1rem',
                                backgroundColor: 'var(--light-gray)',
                                borderRadius: '8px',
                                border: '1px solid var(--medium-gray)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏪</div>
                                <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '0.5rem' }}>
                                    No Bazaars Available
                                </h3>
                                <p style={{ color: 'var(--text-light)', margin: 0 }}>
                                    No upcoming bazaars found. Check back later for new opportunities.
                                </p>
                            </div>
                        ) : (
                            <div style={{ 
                                display: 'grid', 
                                gap: '1.5rem', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
                            }}>
                                {bazaars.map(b => (
                                    <BazaarCard
                                        key={`bazaar-${b._id}`}
                                        bazaar={b}
                                        activeBazaarId={activeBazaarId}
                                        setActiveBazaarId={setActiveBazaarId}
                                        formState={formState}
                                        setFormState={setFormState}
                                        onApplyToBooth={handleApplyToBooth}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )
            )}

            {activeTab === 'booths' && (
                <StandaloneBoothsBrowser
                    booths={standaloneBooths}
                    loading={boothsLoading}
                    error={boothsError}
                    onApplyToBooth={handleApplyToBooth}
                />
            )}

            {/* Booth Application Form Modal */}
            {showBoothForm && selectedBooth && (
                <BoothApplicationForm
                    booth={selectedBooth.booth}
                    bazaar={selectedBooth.bazaar || { name: selectedBooth.booth.name }}
                    onClose={closeBoothForm}
                    onSubmit={handleBoothApplicationSubmit}
                />
            )}
                    </div>
                </div>
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
        <div style={{
            backgroundColor: 'var(--white)',
            border: '1px solid var(--medium-gray)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--guc-red) 0%, #B00808 100%)',
                color: 'white',
                padding: '1.5rem',
                textAlign: 'left'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '1.4rem', 
                            fontWeight: '700',
                            color: 'white'
                        }}>
                            {bazaar.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                            }}>
                                🏪 BAZAAR
                            </span>
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.8rem', opacity: '0.9' }}>Available Booths</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            {bazaar.booths ? bazaar.booths.length : 0}
                        </div>
                    </div>
                </div>
                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📍</span>
                        <span style={{ fontSize: '0.9rem', opacity: '0.9' }}>{bazaar.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>🗓️</span>
                        <span style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                            {new Date(bazaar.startDate).toLocaleDateString()} - {new Date(bazaar.endDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
                {bazaar.description && (
                    <div style={{
                        backgroundColor: 'var(--light-gray)',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--medium-gray)'
                    }}>
                        <h4 style={{
                            margin: '0 0 0.5rem 0',
                            color: 'var(--charcoal-black)',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}>
                            📝 Description
                        </h4>
                        <p style={{
                            margin: 0,
                            color: 'var(--text-dark)',
                            lineHeight: '1.5',
                            fontSize: '0.9rem'
                        }}>
                            {bazaar.description}
                        </p>
                    </div>
                )}

                {/* Booth information section */}
                <BoothList
                    booths={bazaar.booths || []}
                    bazaarId={bazaar._id}
                    onApplyToBooth={onApplyToBooth}
                />
            </div>

            {/* Actions */}
            <div style={{ 
                padding: '1rem 1.5rem', 
                backgroundColor: 'var(--light-gray)', 
                borderTop: '1px solid var(--medium-gray)',
                display: 'flex',
                justifyContent: 'flex-end'
            }}>
                <button 
                    className="btn btn-primary" 
                    onClick={toggle}
                    style={{
                        backgroundColor: 'var(--guc-red)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(210, 10, 10, 0.3)'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#B00808';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(210, 10, 10, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'var(--guc-red)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(210, 10, 10, 0.3)';
                    }}
                >
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


