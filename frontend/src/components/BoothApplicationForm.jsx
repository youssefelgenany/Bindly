import React, { useState } from 'react';
import FileChooser from './FileChooser';

const BoothApplicationForm = ({ booth, bazaar, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        attendees: [{ name: '', email: '' }],
        attendeeFiles: [null],
        boothSize: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

    const setAttendee = (idx, field, value) => {
        const next = formData.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
        setFormData({ ...formData, attendees: next });
    };

    const addAttendee = () => {
        if (formData.attendees.length >= 5) return;
        setFormData({
            ...formData,
            attendees: [...formData.attendees, { name: '', email: '' }],
            attendeeFiles: [...(formData.attendeeFiles || []), null]
        });
    };

    const removeAttendee = (idx) => {
        const next = formData.attendees.filter((_, i) => i !== idx);
        const nextFiles = (formData.attendeeFiles || []).filter((_, i) => i !== idx);
        setFormData({ ...formData, attendees: next.length ? next : [{ name: '', email: '' }], attendeeFiles: nextFiles.length ? nextFiles : [null] });
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

                // Build payload as FormData because per-attendee files are required (if provided)
                let payload;
                const files = formData.attendeeFiles || [];

                // Ensure files are present for each attendee
                const missingFileIndex = cleanAttendees.findIndex((_, i) => !files[i]);
                if (missingFileIndex !== -1) {
                    setSubmitMessage({ type: 'error', text: `Please upload an ID for attendee #${missingFileIndex + 1}.` });
                    setSubmitting(false);
                    return;
                }

                payload = new FormData();
                payload.append('eventType', booth.type === 'standaloneBooth' ? 'standaloneBooth' : 'bazaar');
                payload.append('eventId', booth._id);
                payload.append('attendees', JSON.stringify(cleanAttendees));
                payload.append('boothSize', formData.boothSize);

                // Append each attendee file in the same order as attendees
                files.slice(0, cleanAttendees.length).forEach((file) => {
                    if (file) payload.append('individualIds', file);
                });

            const result = await onSubmit(payload);

            const successText = result?.message || 'Booth application submitted successfully!';
            setSubmitMessage({ type: 'success', text: successText });

            // Reset form
            setFormData({
                attendees: [{ name: '', email: '' }],
                attendeeFiles: [null],
                boothSize: ''
            });

            // Close form after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            console.error('❌ Error submitting booth application:', error);
            console.error('❌ Error response:', error.response);
            
            let errorMessage = 'Failed to submit application. Please try again.';
            
            if (error.response?.data) {
                const data = error.response.data;
                // Check for validation errors
                if (data.validationErrors && Array.isArray(data.validationErrors) && data.validationErrors.length > 0) {
                    errorMessage = data.validationErrors.join('. ');
                } else if (data.message) {
                    errorMessage = data.message;
                } else if (data.error) {
                    errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setSubmitMessage({
                type: 'error',
                text: errorMessage
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e, idx) => {
        const file = e.target.files && e.target.files[0];
        const nextFiles = [...(formData.attendeeFiles || [])];
        nextFiles[idx] = file || null;
        setFormData(prev => ({ ...prev, attendeeFiles: nextFiles }));
    };

    return (
        <div
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1rem'
            }}
        >
            <form 
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    width: '100%', 
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    {/* Modal Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.5rem 2rem',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#FFFFFF'
                    }}>
                        <div>
                            <h2 style={{
                                color: '#1D3557',
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                margin: 0,
                                marginBottom: '0.25rem'
                            }}>
                                Apply for {booth.name || booth.title}
                            </h2>
                            <p style={{
                                color: '#6b7280',
                                fontSize: '0.875rem',
                                margin: 0
                            }}>
                                {bazaar.name || 'Bazaar'} • {booth.location || 'Location TBD'}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280',
                                borderRadius: '0.375rem',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                                close
                            </span>
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '2rem'
                    }}>
                        {/* Booth Information */}
                        {booth.price || booth.capacity || booth.startDate ? (
                            <div style={{
                                backgroundColor: '#f9fafb',
                                padding: '1.5rem',
                                borderRadius: '0.5rem',
                                marginBottom: '2rem',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 1rem 0', 
                                    color: '#111827',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                }}>
                                    Bazaar Details
                                </h4>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '1rem',
                                    marginBottom: booth.description ? '1rem' : 0
                                }}>
                                    {booth.price && (
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            <strong style={{ color: '#111827' }}>Price:</strong> ${booth.price}
                                        </div>
                                    )}
                                    {booth.capacity && (
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            <strong style={{ color: '#111827' }}>Capacity:</strong> {booth.capacity} people
                                        </div>
                                    )}
                                    {booth.startDate && (
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            <strong style={{ color: '#111827' }}>Dates:</strong> {new Date(booth.startDate).toLocaleDateString()} {booth.endDate ? `- ${new Date(booth.endDate).toLocaleDateString()}` : ''}
                                        </div>
                                    )}
                                </div>
                                {booth.description && (
                                    <p style={{ 
                                        margin: 0, 
                                        color: '#6b7280', 
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5'
                                    }}>
                                        {booth.description}
                                    </p>
                                )}
                            </div>
                        ) : null}

                        {/* Attendees Section */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827',
                                marginBottom: '1rem'
                            }}>
                                Names, Emails and IDs of Attendees (Maximum 5) <span style={{ color: '#ef4444' }}>*</span>
                            </h4>
                            
                            {formData.attendees.map((attendee, idx) => (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr auto',
                                    gap: '0.75rem',
                                    marginBottom: '0.75rem',
                                    alignItems: 'end'
                                }}>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={attendee.name}
                                            onChange={(e) => setAttendee(idx, 'name', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.875rem',
                                                backgroundColor: '#f3f4f6',
                                                outline: 'none',
                                                transition: 'border-color 0.2s, background-color 0.2s'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#3b82f6';
                                                e.target.style.backgroundColor = '#ffffff';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.backgroundColor = '#f3f4f6';
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={attendee.email}
                                            onChange={(e) => setAttendee(idx, 'email', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.875rem',
                                                backgroundColor: '#f3f4f6',
                                                outline: 'none',
                                                transition: 'border-color 0.2s, background-color 0.2s'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#3b82f6';
                                                e.target.style.backgroundColor = '#ffffff';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#e5e7eb';
                                                e.target.style.backgroundColor = '#f3f4f6';
                                            }}
                                            required
                                        />
                                    </div>
                                        <div>
                                            {formData.attendeeFiles && formData.attendeeFiles[idx] ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 0.75rem',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    <span className="material-symbols-outlined" style={{
                                                        fontSize: '1.25rem',
                                                        color: formData.attendeeFiles[idx].type === 'application/pdf' ? '#ef4444' : '#3b82f6'
                                                    }}>
                                                        {formData.attendeeFiles[idx].type === 'application/pdf' ? 'description' : 'image'}
                                                    </span>
                                                    <span style={{
                                                        flex: 1,
                                                        fontSize: '0.875rem',
                                                        color: '#374151',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {formData.attendeeFiles[idx].name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextFiles = [...(formData.attendeeFiles || [])];
                                                            nextFiles[idx] = null;
                                                            setFormData(prev => ({ ...prev, attendeeFiles: nextFiles }));
                                                            // Reset the file input
                                                            const fileInput = document.getElementById(`attendeeFile_${idx}`);
                                                            if (fileInput) fileInput.value = '';
                                                        }}
                                                        disabled={submitting}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                                            padding: '0.25rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#ef4444',
                                                            opacity: submitting ? 0.5 : 1
                                                        }}
                                                        title="Remove file"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                                            close
                                                        </span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <FileChooser
                                                    id={`attendeeFile_${idx}`}
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleFileChange(e, idx)}
                                                    disabled={submitting}
                                                    buttonLabel="Upload ID"
                                                    showName={false}
                                                    ariaLabel={`Attendee ${idx + 1} ID file`}
                                                />
                                            )}
                                        </div>
                                    {formData.attendees.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAttendee(idx)}
                                            style={{
                                                padding: '0.75rem',
                                                backgroundColor: '#ef4444',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: '500'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
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
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#1D3557',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#152843'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1D3557'}
                                >
                                    + Add Attendee
                                </button>
                            )}
                        </div>

                        {/* Booth Size Section */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.75rem',
                                fontWeight: '600',
                                color: '#111827',
                                fontSize: '0.875rem'
                            }}>
                                Booth Size <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                value={formData.boothSize}
                                onChange={(e) => setFormData({ ...formData, boothSize: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#f3f4f6',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, background-color 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.backgroundColor = '#ffffff';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.backgroundColor = '#f3f4f6';
                                }}
                                required
                            >
                                <option value="">Select booth size</option>
                                <option value="2x2">2x2 meters (Small Booth)</option>
                                <option value="4x4">4x4 meters (Large Booth)</option>
                            </select>
                        </div>

                        {/* Individual IDs are uploaded per-attendee next to each attendee row */}

                        {/* Submit Message */}
                        {submitMessage.text && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                marginBottom: '1.5rem',
                                borderRadius: '0.5rem',
                                backgroundColor: submitMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: submitMessage.type === 'success' ? '#065f46' : '#991b1b',
                                border: `1px solid ${submitMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                                fontSize: '0.875rem',
                                whiteSpace: 'pre-line'
                            }}>
                                {submitMessage.text}
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            justifyContent: 'flex-end',
                            marginTop: '2rem'
                        }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#6b7280',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: submitting ? '#9ca3af' : '#1D3557',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    opacity: submitting ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.target.style.backgroundColor = '#152843';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!submitting) {
                                        e.target.style.backgroundColor = '#1D3557';
                                    }
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
