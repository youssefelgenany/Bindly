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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--light-gray)',
                borderRadius: '8px',
                border: '1px solid var(--medium-gray)'
            }}>
                <span style={{ fontSize: '1.4rem' }}>🏪</span>
                <h4 style={{
                    margin: 0,
                    color: 'var(--charcoal-black)',
                    fontSize: '1.1rem',
                    fontWeight: '700'
                }}>
                    Available Booths ({booths.length})
                </h4>
                {booths.length > 0 && (
                    <div style={{
                        backgroundColor: 'var(--guc-red)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                    }}>
                        {booths.length} {booths.length === 1 ? 'Booth' : 'Booths'}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {booths.map((booth) => (
                    <div
                        key={booth._id}
                        style={{
                            backgroundColor: 'white',
                            border: '2px solid var(--medium-gray)',
                            borderRadius: '12px',
                            padding: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            position: 'relative'
                        }}
                        onClick={() => toggleBooth(booth._id)}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--guc-red)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(210, 10, 10, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--medium-gray)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: expandedBooths[booth._id] ? '0.75rem' : '0'
                        }}>
                            <div style={{ flex: 1 }}>
                                <h5 style={{
                                    margin: '0 0 0.5rem 0',
                                    color: 'var(--charcoal-black)',
                                    fontSize: '1rem',
                                    fontWeight: '700'
                                }}>
                                    {booth.name}
                                </h5>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.9rem' }}>🗓️</span>
                                        <span style={{
                                            color: 'var(--text-light)',
                                            fontSize: '0.85rem'
                                        }}>
                                            {new Date(booth.startDate).toLocaleDateString()} - {new Date(booth.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {booth.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.9rem' }}>📍</span>
                                            <span style={{
                                                color: 'var(--text-light)',
                                                fontSize: '0.85rem'
                                            }}>
                                                {booth.location}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                {booth.capacity && (
                                    <div style={{
                                        backgroundColor: '#e3f2fd',
                                        color: '#1976d2',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        border: '1px solid #bbdefb'
                                    }}>
                                        👥 {booth.capacity}
                                    </div>
                                )}

                                {booth.price && (
                                    <div style={{
                                        backgroundColor: '#e8f5e8',
                                        color: '#2e7d32',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        border: '1px solid #c8e6c9'
                                    }}>
                                        💰 ${booth.price}
                                    </div>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyToBooth(booth);
                                    }}
                                    style={{
                                        backgroundColor: 'var(--guc-red)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 8px rgba(210, 10, 10, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = '#B00808';
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(210, 10, 10, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = 'var(--guc-red)';
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 2px 8px rgba(210, 10, 10, 0.3)';
                                    }}
                                >
                                    Apply
                                </button>

                                <span style={{
                                    color: 'var(--text-light)',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = 'var(--light-gray)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {expandedBooths[booth._id] ? '▼' : '▶'}
                                </span>
                            </div>
                        </div>

                        {expandedBooths[booth._id] && (
                            <div style={{
                                marginTop: '0.75rem',
                                paddingTop: '0.75rem',
                                borderTop: '2px solid var(--light-gray)',
                                backgroundColor: 'var(--light-gray)',
                                margin: '0.75rem -1rem -1rem -1rem',
                                padding: '1rem',
                                borderRadius: '0 0 10px 10px'
                            }}>
                                {booth.description && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <h6 style={{
                                            margin: '0 0 0.5rem 0',
                                            color: 'var(--charcoal-black)',
                                            fontSize: '0.9rem',
                                            fontWeight: '600'
                                        }}>
                                            📝 Description
                                        </h6>
                                        <p style={{
                                            margin: 0,
                                            color: 'var(--text-dark)',
                                            fontSize: '0.85rem',
                                            lineHeight: '1.5'
                                        }}>
                                            {booth.description}
                                        </p>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <span style={{
                                        backgroundColor: 'white',
                                        color: 'var(--charcoal-black)',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '500',
                                        border: '1px solid var(--medium-gray)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        🏪 Booth Event
                                    </span>

                                    {booth._id && booth._id.startsWith('mock-booth-') && (
                                        <span style={{
                                            backgroundColor: '#d1ecf1',
                                            color: '#0c5460',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: '500',
                                            border: '1px solid #bee5eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
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
