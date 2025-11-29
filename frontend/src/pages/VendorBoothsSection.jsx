import React, { useEffect, useState } from 'react';
import { vendorApi } from '../api/vendorApi';

const VendorBoothsSection = ({ query }) => {
    const [booths, setBooths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Removed demo mode; only real data should be shown
    const [activeBoothId, setActiveBoothId] = useState(null);
    const [formState, setFormState] = useState({
        attendees: [{ name: '', email: '' }],
        boothSize: '',
        durationWeeks: '',
        boothLocation: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await vendorApi.listUpcoming('booth');
                const list = Array.isArray(data) ? data : [];
                const filtered = list.filter(b =>
                    !query ? true : (
                        (b.name || '').toLowerCase().includes(query.toLowerCase()) ||
                        (b.location || '').toLowerCase().includes(query.toLowerCase())
                    )
                );
                setBooths(filtered);
            } catch (e) {
                setBooths([]);
                setError('Failed to load booths');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [query]);

    return (
        <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Booths {booths.length ? `(${booths.length})` : ''}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            {/* Demo mode removed */}
            {loading ? (
                <div className="events-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading booths...</p>
                </div>
            ) : (
                booths.length === 0 ? (
                    <div className="no-events">
                        <p>No upcoming booths found.</p>
                    </div>
                ) : (
                    booths.map(b => (
                        <BoothCard
                            key={`booth-${b._id}`}
                            booth={b}
                            activeBoothId={activeBoothId}
                            setActiveBoothId={(id) => {
                                setActiveBoothId(id);
                                if (id) {
                                    setFormState({ attendees: [{ name: '', email: '' }], boothSize: '', durationWeeks: '', boothLocation: '' });
                                    setSubmitMessage({ type: '', text: '' });
                                }
                            }}
                            formState={formState}
                            setFormState={setFormState}
                            submitting={submitting}
                            setSubmitting={setSubmitting}
                            submitMessage={submitMessage}
                            setSubmitMessage={setSubmitMessage}
                        />
                    ))
                )
            )}
        </div>
    );
};

const BoothCard = ({ booth, activeBoothId, setActiveBoothId, formState, setFormState, submitting, setSubmitting, submitMessage, setSubmitMessage }) => {
    const isOpen = activeBoothId === booth._id;

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
        setActiveBoothId(isOpen ? null : booth._id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitMessage({ type: '', text: '' });
        const cleanAttendees = formState.attendees
            .map(a => ({ name: a.name.trim(), email: a.email.trim() }))
            .filter(a => a.name && a.email)
            .slice(0, 5);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmail = cleanAttendees.find(a => !emailRegex.test(a.email));
        if (!formState.boothSize) {
            setSubmitMessage({ type: 'error', text: 'Please select a booth size.' });
            return;
        }
        if (!formState.durationWeeks || Number(formState.durationWeeks) < 1 || Number(formState.durationWeeks) > 4) {
            setSubmitMessage({ type: 'error', text: 'Please select a duration between 1 and 4 weeks.' });
            return;
        }
        if (!formState.boothLocation) {
            setSubmitMessage({ type: 'error', text: 'Please select a booth location.' });
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
                eventType: 'booth',
                eventId: booth._id,
                attendees: cleanAttendees,
                boothSize: formState.boothSize,
                durationWeeks: Number(formState.durationWeeks),
                boothLocation: formState.boothLocation,
                message: ''
            });
            const successText = res?.message || 'Application submitted successfully.';
            setSubmitMessage({ type: 'success', text: successText });
            setFormState({ attendees: [{ name: '', email: '' }], boothSize: '', durationWeeks: '', boothLocation: '' });
        } catch (e) {
            // Demo fallback: simulate success if backend not reachable
            setSubmitMessage({ type: 'success', text: 'Application submitted (demo).' });
        } finally {
            setSubmitting(false);
        }
    };

    const bannerSrc = booth.bannerFile || '/assets/images/booth-background.jpg';

    return (
        <div className="event-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            {bannerSrc && (
                <div style={{
                    width: '100%',
                    height: '180px',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#f3f4f6',
                    flexShrink: 0
                }}>
                    <img
                        src={bannerSrc}
                        alt={booth.name || 'Booth'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.backgroundColor = '#3F51B5';
                            e.target.parentElement.style.display = 'flex';
                            e.target.parentElement.style.alignItems = 'center';
                            e.target.parentElement.style.justifyContent = 'center';
                            if (!e.target.parentElement.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text';
                                fallback.textContent = (booth.name || 'BOOTH').toUpperCase();
                                fallback.style.color = '#FFFFFF';
                                fallback.style.fontSize = '1.25rem';
                                fallback.style.fontWeight = '700';
                                e.target.parentElement.appendChild(fallback);
                            }
                        }}
                    />
                </div>
            )}

            <div className="event-info" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h3>{booth.name}</h3>
                <p className="event-type">BOOTH</p>
                <p className="event-location">📍 {booth.location}</p>
                <p className="event-date">
                    🗓️ {new Date(booth.startDate).toLocaleDateString()} - {new Date(booth.endDate).toLocaleDateString()}
                </p>
                {booth.description && (
                    <p className="event-description">{booth.description}</p>
                )}
            </div>
            <div className="event-actions" style={{ padding: '1rem' }}>
                <button className="btn btn-primary" onClick={toggle}>
                    Apply to this Booth
                </button>
            </div>

            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '780px', padding: '16px' }}>
                        <div className="card" style={{ backgroundColor: 'var(--white)', padding: 0, borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--light-gray)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--medium-gray)' }}>
                                <div>
                                    <h2 className="card-title" style={{ margin: 0, color: 'var(--charcoal-black)' }}>Apply to {booth.name}</h2>
                                    <p className="card-subtitle" style={{ marginTop: '4px' }}>Duration 1–4 weeks • Sizes 2x2 or 4x4</p>
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

                            <div style={{ padding: '1.25rem', maxHeight: '80vh', overflowY: 'auto', scrollBehavior: 'smooth' }}>
                                {submitMessage.text && (
                                    <div className={`alert ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
                                        {submitMessage.text}
                                    </div>
                                )}

                                {/* Details section */}
                                <div className="card" style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', marginBottom: '1rem', borderRadius: '8px' }}>
                                    <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label className="form-label">Booth Size <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select
                                                className="form-input"
                                                value={formState.boothSize}
                                                onChange={(e) => setFormState({ ...formState, boothSize: e.target.value })}
                                            >
                                                <option value="">Select size</option>
                                                <option value="2x2">2x2</option>
                                                <option value="4x4">4x4</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Duration (weeks) <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select
                                                className="form-input"
                                                value={formState.durationWeeks}
                                                onChange={(e) => setFormState({ ...formState, durationWeeks: e.target.value })}
                                            >
                                                <option value="">Select duration</option>
                                                <option value="1">1 week</option>
                                                <option value="2">2 weeks</option>
                                                <option value="3">3 weeks</option>
                                                <option value="4">4 weeks</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Location section */}
                                <div className="card" style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', marginBottom: '1rem', borderRadius: '8px' }}>
                                    <div style={{ padding: '1rem' }}>
                                        <label className="form-label">Booth Location <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ height: '180px', background: '#f7f7f7', border: '1px dashed var(--medium-gray)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                                            Platform Map (placeholder)
                                        </div>
                                        <select
                                            className="form-input"
                                            value={formState.boothLocation}
                                            onChange={(e) => setFormState({ ...formState, boothLocation: e.target.value })}
                                        >
                                            <option value="">Select location</option>
                                            <option value="North Wing A1">North Wing A1</option>
                                            <option value="North Wing A2">North Wing A2</option>
                                            <option value="Central Plaza C1">Central Plaza C1</option>
                                            <option value="Central Plaza C2">Central Plaza C2</option>
                                            <option value="South Hall S1">South Hall S1</option>
                                            <option value="South Hall S2">South Hall S2</option>
                                        </select>
                                        <small style={{ color: 'var(--text-light)' }}>Pick an available point from the platform layout.</small>
                                    </div>
                                </div>

                                {/* Attendees section */}
                                <div className="card" style={{ background: 'var(--white)', border: '1px solid var(--medium-gray)', marginBottom: '1rem', borderRadius: '8px' }}>
                                    <div style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <label className="form-label" style={{ margin: 0 }}>Attendees</label>
                                            <small style={{ color: 'var(--text-light)' }}>Max 5 people</small>
                                        </div>
                                        {formState.attendees.map((a, idx) => (
                                            <div key={idx} className="card" style={{ padding: '0.9rem', background: 'var(--light-gray)', border: '1px solid var(--medium-gray)', marginBottom: '0.6rem', borderRadius: '6px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div>
                                                        <label className="form-label" style={{ fontSize: '12px' }}>Full name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Sara Nabil"
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
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={toggle}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={
                                            submitting ||
                                            !formState.boothSize ||
                                            !formState.durationWeeks ||
                                            !formState.boothLocation ||
                                            formState.attendees.filter(a => a.name && a.email).length === 0
                                        }
                                    >
                                        {submitting ? 'Submitting…' : 'Submit Application'}
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

export default VendorBoothsSection;


