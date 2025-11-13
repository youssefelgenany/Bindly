import React, { useState } from 'react';

const PlatformBoothMapSelector = ({ selectedLocation, onLocationSelect }) => {
    const [hoveredArea, setHoveredArea] = useState(null);

    const platformAreas = [
        { id: 'main-entrance', name: 'Main Entrance', x: 5, y: 5, width: 35, height: 15 },
        { id: 'garden-section', name: 'Garden Section', x: 45, y: 5, width: 25, height: 15 },
        { id: 'central-plaza', name: 'Central Plaza', x: 75, y: 5, width: 20, height: 15 },
        { id: 'food-court', name: 'Food Court', x: 5, y: 25, width: 30, height: 20 },
        { id: 'student-center', name: 'Student Center', x: 40, y: 25, width: 25, height: 20 },
        { id: 'library-area', name: 'Library Area', x: 70, y: 25, width: 25, height: 20 },
        { id: 'cafeteria-area', name: 'Cafeteria Area', x: 5, y: 50, width: 30, height: 20 },
        { id: 'auditorium-hall', name: 'Auditorium Hall', x: 40, y: 50, width: 25, height: 20 },
        { id: 'gym-entrance', name: 'Gym Entrance', x: 70, y: 50, width: 25, height: 20 },
        { id: 'parking-lot', name: 'Parking Lot', x: 5, y: 75, width: 90, height: 20 }
    ];

    const getAreaStyle = (area) => {
        const isSelected = selectedLocation === area.id;
        const isHovered = hoveredArea === area.id;

        return {
            position: 'absolute',
            left: `${area.x}%`,
            top: `${area.y}%`,
            width: `${area.width}%`,
            height: `${area.height}%`,
            backgroundColor: isSelected ? '#1D3557' : isHovered ? '#457B9D' : 'rgba(29, 53, 87, 0.1)',
            border: `2px solid ${isSelected ? '#1D3557' : isHovered ? '#457B9D' : '#1D3557'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: isSelected || isHovered ? 'white' : '#1D3557',
            textAlign: 'center',
            padding: '0.5rem',
            boxSizing: 'border-box'
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
                backgroundColor: '#f8f9fa',
                border: '2px solid #e5e7eb',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                marginBottom: '0.75rem',
                backgroundImage: `
                    linear-gradient(90deg, #e5e7eb 1px, transparent 1px),
                    linear-gradient(180deg, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: '25px 25px'
            }}>
                {/* Platform Areas */}
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

