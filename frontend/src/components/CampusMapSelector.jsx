import React, { useState } from 'react';

const CampusMapSelector = ({ selectedLocation, onLocationSelect }) => {
    const [hoveredArea, setHoveredArea] = useState(null);

    const campusAreas = [
        { id: 'main-entrance', name: 'Main Entrance', x: 20, y: 10, width: 15, height: 8 },
        { id: 'food-court', name: 'Food Court', x: 40, y: 20, width: 12, height: 10 },
        { id: 'central-plaza', name: 'Central Plaza', x: 30, y: 30, width: 20, height: 15 },
        { id: 'student-center', name: 'Student Center', x: 60, y: 25, width: 15, height: 12 },
        { id: 'library-area', name: 'Library Area', x: 10, y: 40, width: 18, height: 10 },
        { id: 'gym-entrance', name: 'Gym Entrance', x: 70, y: 45, width: 12, height: 8 },
        { id: 'parking-lot', name: 'Parking Lot', x: 5, y: 60, width: 25, height: 15 },
        { id: 'garden-section', name: 'Garden Section', x: 50, y: 55, width: 20, height: 12 },
        { id: 'auditorium-hall', name: 'Auditorium Hall', x: 35, y: 50, width: 15, height: 10 },
        { id: 'cafeteria-area', name: 'Cafeteria Area', x: 75, y: 15, width: 10, height: 8 }
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
            backgroundColor: isSelected ? '#007bff' : isHovered ? '#0056b3' : '#e9ecef',
            border: `2px solid ${isSelected ? '#0056b3' : '#ced4da'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: '500',
            color: isSelected || isHovered ? 'white' : '#495057',
            textAlign: 'center',
            padding: '2px',
            boxSizing: 'border-box'
        };
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Select Booth Location on Campus Map *
            </label>

            <div style={{
                position: 'relative',
                width: '100%',
                height: '300px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
            }}>
                {/* Campus Map Background */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }} />

                {/* Campus Areas */}
                {campusAreas.map(area => (
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

                {/* Map Legend */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    border: '1px solid #dee2e6'
                }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Legend:</div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.1rem' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#007bff', marginRight: '0.25rem', borderRadius: '2px' }}></div>
                        Selected
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#e9ecef', marginRight: '0.25rem', borderRadius: '2px', border: '1px solid #ced4da' }}></div>
                        Available
                    </div>
                </div>
            </div>

            <p style={{
                margin: '0',
                color: '#6c757d',
                fontSize: '0.8rem',
                fontStyle: 'italic'
            }}>
                🗺️ Click on any area on the campus map to select your preferred booth location
            </p>

            {selectedLocation && (
                <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    border: '1px solid #c3e6cb'
                }}>
                    ✅ Selected: {campusAreas.find(area => area.id === selectedLocation)?.name}
                </div>
            )}
        </div>
    );
};

export default CampusMapSelector;
