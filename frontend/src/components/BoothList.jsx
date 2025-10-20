import React, { useState } from 'react';

const BoothList = ({ booths, bazaarId, onApplyToBooth }) => {
    const [expandedBooths, setExpandedBooths] = useState({});

    const toggleBooth = (boothId) => {
        setExpandedBooths(prev => ({
            ...prev,
            [boothId]: !prev[boothId]
        }));
    };

    const handleApplyToBooth = (booth) => {
        if (onApplyToBooth) {
            onApplyToBooth(booth);
        }
    };

    if (!booths || booths.length === 0) {
        return (
            <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                marginTop: '1rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>🏪</span>
                    <h4 style={{
                        margin: 0,
                        color: '#495057',
                        fontSize: '1rem',
                        fontWeight: '600'
                    }}>
                        Available Booths
                    </h4>
                </div>
                <p style={{
                    margin: 0,
                    color: '#6c757d',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '0.5rem 0'
                }}>
                    No booths available for this bazaar yet. Check back later or contact the event organizer.
                </p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {booths.map((booth) => (
                    <div
                        key={booth._id}
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onClick={() => toggleBooth(booth._id)}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h5 style={{
                                    margin: '0 0 0.25rem 0',
                                    color: '#212529',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>
                                    {booth.name}
                                </h5>
                                <p style={{
                                    margin: '0',
                                    color: '#6c757d',
                                    fontSize: '0.8rem'
                                }}>
                                    {new Date(booth.startDate).toLocaleDateString()} - {new Date(booth.endDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {booth.price && (
                                    <span style={{
                                        backgroundColor: '#e8f5e8',
                                        color: '#2e7d32',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}>
                                        ${booth.price}
                                    </span>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyToBooth(booth);
                                    }}
                                    style={{
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                                >
                                    Apply
                                </button>

                                <span style={{
                                    color: '#6c757d',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}>
                                    {expandedBooths[booth._id] ? '▼' : '▶'}
                                </span>
                            </div>
                        </div>

                        {expandedBooths[booth._id] && (
                            <div style={{
                                marginTop: '0.75rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid #e9ecef'
                            }}>
                                {booth.description && (
                                    <p style={{
                                        margin: '0 0 0.5rem 0',
                                        color: '#495057',
                                        fontSize: '0.85rem',
                                        lineHeight: '1.4'
                                    }}>
                                        {booth.description}
                                    </p>
                                )}

                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <span style={{
                                        backgroundColor: '#f8f9fa',
                                        color: '#495057',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        📍 {booth.location}
                                    </span>

                                    <span style={{
                                        backgroundColor: '#fff3cd',
                                        color: '#856404',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        border: '1px solid #ffeaa7'
                                    }}>
                                        🏪 Booth Event
                                    </span>

                                    {booth._id && booth._id.startsWith('mock-booth-') && (
                                        <span style={{
                                            backgroundColor: '#d1ecf1',
                                            color: '#0c5460',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            border: '1px solid #bee5eb'
                                        }}>
                                            🎭 Demo
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BoothList;
