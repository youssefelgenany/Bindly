import React, { useState } from 'react';

const PlatformBoothMapSelector = ({ selectedLocation, onLocationSelect }) => {
    const [hoveredArea, setHoveredArea] = useState(null);

    // Map locations to actual areas on the campus map
    const platformAreas = [
        { id: 'sports-area', name: 'Sports Area', x: 50, y: 42 }, // Sports Area (above center circular area)
        { id: 'parking', name: 'Parking', x: 15, y: 80 }, // Parking areas (marked with P on map)
        { id: 'main-gate', name: 'Main Gate', x: 75, y: 85 }, // Main Gate (bottom-right)
        { id: 'platform', name: 'Platform', x: 40, y: 15 }, // Platform area (center-top)
        { id: 'exam-halls', name: 'Exam Halls', x: 5, y: 5 } // Admission & Exam Hall (top-left)
    ];

    const getAreaStyle = (area) => {
        const isSelected = selectedLocation === area.id;
        const isHovered = hoveredArea === area.id;

        return {
            position: 'absolute',
            left: `${area.x}%`,
            top: `${area.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 'auto',
            minWidth: '80px',
            height: 'auto',
            backgroundColor: isSelected ? 'rgba(29, 53, 87, 0.9)' : isHovered ? 'rgba(69, 123, 157, 0.6)' : 'rgba(29, 53, 87, 0.4)',
            border: '2px solid #FFFFFF',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#FFFFFF',
            textAlign: 'center',
            padding: '0.375rem 0.75rem',
            boxSizing: 'border-box',
            zIndex: 1,
            boxShadow: isSelected ? '0 4px 8px rgba(29, 53, 87, 0.4)' : isHovered ? '0 2px 4px rgba(29, 53, 87, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            whiteSpace: 'nowrap'
        };
    };

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: '600',
                color: '#111827',
                fontSize: '0.875rem'
            }}>
                Location of Booth Setup <span style={{ color: '#ef4444' }}>*</span>
            </label>

            <div style={{
                position: 'relative',
                width: '100%',
                height: '400px',
                border: '2px solid #e5e7eb',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                marginBottom: '0.75rem',
                backgroundColor: '#f8f9fa'
            }}>
                {/* Map Background Image */}
                <img
                    src="/assets/images/map.jpg"
                    alt="Platform Map"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                />
                
                {/* Platform Areas - Clickable Boxes */}
                {platformAreas.map(area => (
                    <div
                        key={area.id}
                        style={getAreaStyle(area)}
                        onClick={() => onLocationSelect(area.id)}
                        onMouseEnter={() => setHoveredArea(area.id)}
                        onMouseLeave={() => setHoveredArea(null)}
                        title={area.name}
                    >
                        {area.name}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                flexWrap: 'wrap',
                fontSize: '0.875rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '1rem',
                        height: '1rem',
                        backgroundColor: '#1D3557',
                        borderRadius: '0.25rem'
                    }}></div>
                    <span style={{ color: '#6b7280' }}>Selected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '1rem',
                        height: '1rem',
                        backgroundColor: 'rgba(29, 53, 87, 0.1)',
                        border: '2px solid #1D3557',
                        borderRadius: '0.25rem'
                    }}></div>
                    <span style={{ color: '#6b7280' }}>Available</span>
                </div>
            </div>

            {selectedLocation && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: '1px solid #93c5fd',
                    fontWeight: '500'
                }}>
                    ✓ Selected: {platformAreas.find(area => area.id === selectedLocation)?.name}
                </div>
            )}
        </div>
    );
};

export default PlatformBoothMapSelector;

