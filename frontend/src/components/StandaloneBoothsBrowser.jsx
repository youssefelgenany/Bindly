import React, { useState } from 'react';
import BoothApplicationForm from './BoothApplicationForm';

const StandaloneBoothCard = ({ booth, onApplyToBooth }) => {
    const handleApply = () => {
        onApplyToBooth(booth);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDuration = (weeks) => {
        if (weeks === 1) return '1 week';
        return `${weeks} weeks`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'upcoming': return '#28a745';
            case 'active': return '#007bff';
            case 'completed': return '#6c757d';
            default: return '#6c757d';
        }
    };

    return (
        <div className="event-card" style={{
            backgroundColor: 'var(--white)',
            border: '1px solid var(--medium-gray)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div className="event-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--charcoal-black)', fontSize: '1.25rem' }}>
                            {booth.name || booth.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{
                                backgroundColor: getStatusColor(booth.status),
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                            }}>
                                {booth.status}
                            </span>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                🏢 STANDALONE BOOTH
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--guc-red)' }}>
                            ${booth.price}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            {formatDuration(booth.durationWeeks)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>📍 Location</div>
                        <div style={{ fontWeight: '500' }}>{booth.location}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>🗓️ Dates</div>
                        <div style={{ fontWeight: '500' }}>
                            {formatDate(booth.startDate)} - {formatDate(booth.endDate)}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>👥 Capacity</div>
                        <div style={{ fontWeight: '500' }}>{booth.capacity} people</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>🎯 Booth Area</div>
                        <div style={{ fontWeight: '500' }}>{booth.boothLocation}</div>
                    </div>
                </div>

                {booth.description && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>📝 Description</div>
                        <p style={{ margin: 0, color: 'var(--charcoal-black)', lineHeight: '1.5' }}>
                            {booth.description}
                        </p>
                    </div>
                )}

                {booth.registrationDeadline && (
                    <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ fontSize: '0.9rem', color: '#856404', fontWeight: '500' }}>
                            ⏰ Registration Deadline: {formatDate(booth.registrationDeadline)}
                        </div>
                    </div>
                )}
            </div>

            <div className="event-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    style={{
                        backgroundColor: 'var(--guc-red)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                    }}
                >
                    Apply to this Booth
                </button>
            </div>
        </div>
    );
};

const StandaloneBoothsBrowser = ({ booths, loading, error, onApplyToBooth }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Filter booths based on search and filters
    const filteredBooths = booths.filter(booth => {
        const boothName = booth.name || booth.title || '';
        const boothDescription = booth.description || '';
        const boothLocation = booth.location || '';
        
        const matchesSearch = !searchQuery || 
            boothName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            boothDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
            boothLocation.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesLocation = !locationFilter || boothLocation.toLowerCase().includes(locationFilter.toLowerCase());
        const matchesStatus = !statusFilter || booth.status === statusFilter;
        
        return matchesSearch && matchesLocation && matchesStatus;
    });

    const uniqueLocations = [...new Set(booths.map(booth => booth.location))];
    const uniqueStatuses = [...new Set(booths.map(booth => booth.status))];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>Loading standalone booths...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-error" style={{ margin: '1rem 0' }}>
                {error}
            </div>
        );
    }

    return (
        <div>
            {/* Filters */}
            <div style={{
                backgroundColor: 'var(--light-gray)',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid var(--medium-gray)'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--charcoal-black)' }}>Filter Booths</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--charcoal-black)' }}>
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Search booths..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--charcoal-black)' }}>
                            Location
                        </label>
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Locations</option>
                            {uniqueLocations.map(location => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--charcoal-black)' }}>
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: 'var(--charcoal-black)' }}>
                    Available Booths ({filteredBooths.length})
                </h2>
                {(searchQuery || locationFilter || statusFilter) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setLocationFilter('');
                            setStatusFilter('');
                        }}
                        style={{
                            backgroundColor: 'var(--medium-gray)',
                            color: 'var(--charcoal-black)',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Booths List */}
            {filteredBooths.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    backgroundColor: 'var(--light-gray)',
                    borderRadius: '8px',
                    border: '1px solid var(--medium-gray)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--charcoal-black)' }}>No Booths Found</h3>
                    <p style={{ margin: 0, color: 'var(--text-light)' }}>
                        {searchQuery || locationFilter || statusFilter 
                            ? 'Try adjusting your search criteria or filters.'
                            : 'No standalone booths are currently available.'}
                    </p>
                </div>
            ) : (
                <div>
                    {filteredBooths.map(booth => (
                        <StandaloneBoothCard
                            key={booth._id}
                            booth={booth}
                            onApplyToBooth={onApplyToBooth}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StandaloneBoothsBrowser;
