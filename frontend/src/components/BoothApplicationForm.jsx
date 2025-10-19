import React, { useState } from 'react';
import CampusMapSelector from './CampusMapSelector';

const BoothApplicationForm = ({ booth, bazaar, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        attendees: [{ name: '', email: '' }],
        boothSize: '',
        durationWeeks: '',
        boothLocation: '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

    const setAttendee = (idx, field, value) => {
        const next = formData.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
        setFormData({ ...formData, attendees: next });
    };

    const addAttendee = () => {
        if (formData.attendees.length >= 5) return;
        setFormData({ ...formData, attendees: [...formData.attendees, { name: '', email: '' }] });
    };

    const removeAttendee = (idx) => {
        const next = formData.attendees.filter((_, i) => i !== idx);
        setFormData({ ...formData, attendees: next.length ? next : [{ name: '', email: '' }] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitMessage({ type: '', text: '' });

        // Validation
        const cleanAttendees = formData.attendees
            .map(a => ({ name: a.name.trim(), email: a.email.trim() }))
            .filter(a => a.name && a.email)
            .slice(0, 5);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmail = cleanAttendees.find(a => !emailRegex.test(a.email));

        if (!formData.boothSize) {
            setSubmitMessage({ type: 'error', text: 'Please select a booth size.' });
            return;
        }
        if (!formData.durationWeeks) {
            setSubmitMessage({ type: 'error', text: 'Please select duration of booth setup.' });
            return;
        }
        // Only require booth location for bazaar booths, not standalone booths
        if (booth.type !== 'standaloneBooth' && !formData.boothLocation) {
            setSubmitMessage({ type: 'error', text: 'Please select a booth location on the campus map.' });
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
            const result = await onSubmit({
                eventType: booth.type === 'standaloneBooth' ? 'standaloneBooth' : 'booth',
                eventId: booth._id,
                attendees: cleanAttendees,
                boothSize: formData.boothSize,
                durationWeeks: formData.durationWeeks,
                boothLocation: formData.boothLocation,
                message: formData.message,
                isStandalone: booth.type === 'standaloneBooth'
            });

            const successText = result?.message || 'Booth application submitted successfully!';
            setSubmitMessage({ type: 'success', text: successText });

            // Reset form
            setFormData({
                attendees: [{ name: '', email: '' }],
                boothSize: '',
                durationWeeks: '',
                boothLocation: '',
                message: ''
            });

            // Close form after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            setSubmitMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to submit application. Please try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
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
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '800px', padding: '16px' }}>
                <div className="card" style={{
                    backgroundColor: 'var(--white)',
                    padding: 0,
                    borderRadius: '10px',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}>
                    {/* Header */}
                    <div className="card-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--light-gray)',
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--medium-gray)'
                    }}>
                        <div>
                            <h2 className="card-title" style={{ margin: 0, color: '#007bff' }}>
                                Apply for {booth.name}
                            </h2>
                            <p className="card-subtitle" style={{ marginTop: '4px', color: '#6c757d' }}>
                                {bazaar.name} • {booth.location}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={onClose}
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
                        {/* Booth Information */}
                        <div style={{
                            backgroundColor: '#f8f9fa',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            border: '1px solid #e9ecef'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Booth Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                <div><strong>Price:</strong> ${booth.price}</div>
                                <div><strong>Capacity:</strong> {booth.capacity} people</div>
                                <div><strong>Dates:</strong> {new Date(booth.startDate).toLocaleDateString()} - {new Date(booth.endDate).toLocaleDateString()}</div>
                            </div>
                            {booth.description && (
                                <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                                    {booth.description}
                                </p>
                            )}
                        </div>

                        {/* Attendees Section */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>
                                Attendees (Maximum 5)
                            </h4>
                            {formData.attendees.map((attendee, idx) => (
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
                                    {formData.attendees.length > 1 && (
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
                            {formData.attendees.length < 5 && (
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
                                    value={formData.boothSize}
                                    onChange={(e) => setFormData({ ...formData, boothSize: e.target.value })}
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

                            {/* Duration */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Duration of Booth Setup *
                                </label>
                                <select
                                    value={formData.durationWeeks}
                                    onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ced4da',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem'
                                    }}
                                    required
                                >
                                    <option value="">Select duration</option>
                                    <option value="1">1 week</option>
                                    <option value="2">2 weeks</option>
                                    <option value="3">3 weeks</option>
                                    <option value="4">4 weeks</option>
                                </select>
                                <p style={{
                                    margin: '0.25rem 0 0 0',
                                    color: '#6c757d',
                                    fontSize: '0.8rem',
                                    fontStyle: 'italic'
                                }}>
                                    ⏱️ Choose how long you want to keep your booth set up (1-4 weeks)
                                </p>
                            </div>

                            {/* Booth Location - Only show for bazaar booths, not standalone booths */}
                            {booth.type !== 'standaloneBooth' && (
                                <CampusMapSelector
                                    selectedLocation={formData.boothLocation}
                                    onLocationSelect={(location) => setFormData({ ...formData, boothLocation: location })}
                                />
                            )}

                            {/* Additional Message */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Additional Message (Optional)
                                </label>
                                <textarea
                                    placeholder="Any special requirements or notes..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ced4da',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Submit Message */}
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

                        {/* Submit Button */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={onClose}
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
    );
};

export default BoothApplicationForm;
