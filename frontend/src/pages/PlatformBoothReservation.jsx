import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PlatformMapSelector from '../components/PlatformMapSelector';

const PlatformBoothReservation = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        attendees: [{ name: '', email: '' }],
        startDate: '',
        duration: '',
        selectedBooth: null,
        boothSize: '',
        message: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Get today's date for minimum date
    const today = new Date().toISOString().split('T')[0];

    // Duration options (1-4 weeks)
    const durationOptions = [
        { value: '1', label: '1 Week' },
        { value: '2', label: '2 Weeks' },
        { value: '3', label: '3 Weeks' },
        { value: '4', label: '4 Weeks' }
    ];

    // Booth size options
    const boothSizeOptions = [
        { value: '2x2', label: '2x2 (Small)' },
        { value: '4x4', label: '4x4 (Large)' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleBoothSelect = (booth) => {
        setFormData(prev => ({
            ...prev,
            selectedBooth: booth.id,
            boothSize: booth.size
        }));
        // Clear booth selection error
        if (errors.selectedBooth) {
            setErrors(prev => ({
                ...prev,
                selectedBooth: ''
            }));
        }
    };

    const handleAttendeeChange = (index, field, value) => {
        const newAttendees = [...formData.attendees];
        newAttendees[index][field] = value;
        setFormData(prev => ({
            ...prev,
            attendees: newAttendees
        }));
    };

    const addAttendee = () => {
        if (formData.attendees.length < 5) {
            setFormData(prev => ({
                ...prev,
                attendees: [...prev.attendees, { name: '', email: '' }]
            }));
        }
    };

    const removeAttendee = (index) => {
        if (formData.attendees.length > 1) {
            const newAttendees = formData.attendees.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                attendees: newAttendees
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate attendees
        const validAttendees = formData.attendees.filter(attendee => 
            attendee.name.trim() && attendee.email.trim()
        );

        if (validAttendees.length === 0) {
            newErrors.attendees = 'At least one attendee is required';
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = validAttendees.filter(attendee => 
            !emailRegex.test(attendee.email)
        );

        if (invalidEmails.length > 0) {
            newErrors.attendees = 'Please enter valid email addresses for all attendees';
        }

        // Validate start date
        if (!formData.startDate) {
            newErrors.startDate = 'Please select a start date';
        }

        // Validate duration
        if (!formData.duration) {
            newErrors.duration = 'Please select a duration';
        }

        // Validate booth selection
        if (!formData.selectedBooth) {
            newErrors.selectedBooth = 'Please select a booth from the map';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // Filter out empty attendees
            const validAttendees = formData.attendees.filter(attendee => 
                attendee.name.trim() && attendee.email.trim()
            );

            const submissionData = {
                eventType: 'booth',
                attendees: validAttendees,
                startDate: formData.startDate,
                durationWeeks: parseInt(formData.duration),
                boothId: formData.selectedBooth,
                boothSize: formData.boothSize,
                message: formData.message.trim(),
                status: 'pending' // Set status to pending for approval
            };

            // Submit to backend API for approval
            console.log('Submitting platform booth reservation:', submissionData);
            const token = localStorage.getItem('token');
            console.log('Token present:', !!token);
            
            const response = await fetch('http://localhost:5000/api/vendor-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(submissionData)
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                setMessage('Platform booth reservation submitted successfully! Your request is pending approval from the admin and events office.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            
            // Reset form
            setFormData({
                attendees: [{ name: '', email: '' }],
                startDate: '',
                duration: '',
                selectedBooth: null,
                boothSize: '',
                message: ''
            });

        } catch (error) {
            console.error('Error submitting platform booth reservation:', error);
            setMessage('An error occurred while submitting your reservation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--light-gray)',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'var(--white)',
                borderRadius: '15px',
                padding: '2rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        color: 'var(--guc-red)',
                        marginBottom: '0.5rem',
                        fontSize: '2rem',
                        fontWeight: '700'
                    }}>
                        Platform Booth Reservation
                    </h1>
                    <p style={{
                        color: 'var(--text-light)',
                        fontSize: '1.1rem',
                        lineHeight: '1.6'
                    }}>
                        Reserve a booth on the GUC platform for your business. Fill out the form below with your team details and preferences.
                    </p>
                </div>

                {/* Success/Error Message */}
                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        backgroundColor: message.includes('successfully') ? '#d4edda' : '#f8d7da',
                        color: message.includes('successfully') ? '#155724' : '#721c24',
                        border: `1px solid ${message.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Attendees Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                            color: 'var(--text-dark)',
                            marginBottom: '1rem',
                            fontSize: '1.3rem',
                            fontWeight: '600'
                        }}>
                            Team Members (Max 5)
                        </h3>
                        
                        {formData.attendees.map((attendee, index) => (
                            <div key={index} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr auto',
                                gap: '1rem',
                                marginBottom: '1rem',
                                padding: '1rem',
                                backgroundColor: 'var(--light-gray)',
                                borderRadius: '8px',
                                border: '1px solid var(--medium-gray)'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontWeight: '500',
                                        color: 'var(--text-dark)'
                                    }}>
                                        Name <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={attendee.name}
                                        onChange={(e) => handleAttendeeChange(index, 'name', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid var(--medium-gray)',
                                            borderRadius: '6px',
                                            fontSize: '1rem'
                                        }}
                                        placeholder="Full name"
                                    />
                                </div>
                                
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontWeight: '500',
                                        color: 'var(--text-dark)'
                                    }}>
                                        Email <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={attendee.email}
                                        onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid var(--medium-gray)',
                                            borderRadius: '6px',
                                            fontSize: '1rem'
                                        }}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                
                                {formData.attendees.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeAttendee(index)}
                                        style={{
                                            padding: '0.75rem',
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            alignSelf: 'end'
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
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: 'var(--guc-red)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: '500'
                                }}
                            >
                                + Add Team Member
                            </button>
                        )}
                        
                        {errors.attendees && (
                            <div style={{
                                color: '#dc3545',
                                fontSize: '0.9rem',
                                marginTop: '0.5rem'
                            }}>
                                {errors.attendees}
                            </div>
                        )}
                    </div>

                    {/* Start Date Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                            fontSize: '1.1rem'
                        }}>
                            Start Date <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            min={today}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--medium-gray)',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                backgroundColor: 'var(--white)'
                            }}
                        />
                        {errors.startDate && (
                            <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                {errors.startDate}
                            </div>
                        )}
                    </div>

                    {/* Platform Map Selector */}
                    <PlatformMapSelector
                        selectedDate={formData.startDate}
                        onBoothSelect={handleBoothSelect}
                        selectedBooth={formData.selectedBooth}
                        duration={formData.duration}
                    />
                    {errors.selectedBooth && (
                        <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            {errors.selectedBooth}
                        </div>
                    )}

                    {/* Duration Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                            fontSize: '1.1rem'
                        }}>
                            Duration <span style={{ color: 'red' }}>*</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            {durationOptions.map(option => (
                                <label key={option.value} style={{
                                    padding: '1rem',
                                    border: `2px solid ${formData.duration === option.value ? 'var(--guc-red)' : 'var(--medium-gray)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: formData.duration === option.value ? 'rgba(210, 10, 10, 0.1)' : 'var(--white)',
                                    transition: 'all 0.3s ease',
                                    textAlign: 'center',
                                    fontWeight: '500'
                                }}>
                                    <input
                                        type="radio"
                                        name="duration"
                                        value={option.value}
                                        checked={formData.duration === option.value}
                                        onChange={handleChange}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                        {errors.duration && (
                            <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                {errors.duration}
                            </div>
                        )}
                    </div>


                    {/* Additional Message */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                            fontSize: '1.1rem'
                        }}>
                            Additional Message (Optional)
                        </label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            rows="4"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--medium-gray)',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                resize: 'vertical'
                            }}
                            placeholder="Any additional information or special requests..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/vendor')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--medium-gray)',
                                color: 'var(--text-dark)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '500'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 2rem',
                                backgroundColor: 'var(--guc-red)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                fontWeight: '500',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit Reservation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlatformBoothReservation;
