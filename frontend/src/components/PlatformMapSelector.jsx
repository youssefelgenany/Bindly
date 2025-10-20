import React, { useState, useEffect } from 'react';

const PlatformMapSelector = ({ selectedDate, onBoothSelect, selectedBooth, duration }) => {
    const [availableBooths, setAvailableBooths] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock booth data - in real implementation, this would come from API
    const allBooths = [
        // Main Entrance Area (Top Left)
        { id: 'booth-1', name: 'Booth A1', location: 'main-entrance', x: 15, y: 10, size: '2x2', status: 'available' },
        { id: 'booth-2', name: 'Booth A2', location: 'main-entrance', x: 25, y: 10, size: '4x4', status: 'available' },
        { id: 'booth-3', name: 'Booth A3', location: 'main-entrance', x: 35, y: 10, size: '2x2', status: 'available' },
        
        // Garden Section (Top Center)
        { id: 'booth-4', name: 'Booth B1', location: 'garden-section', x: 50, y: 10, size: '2x2', status: 'available' },
        { id: 'booth-5', name: 'Booth B2', location: 'garden-section', x: 60, y: 10, size: '4x4', status: 'available' },
        { id: 'booth-6', name: 'Booth B3', location: 'garden-section', x: 70, y: 10, size: '2x2', status: 'available' },
        
        // Central Plaza (Top Right)
        { id: 'booth-7', name: 'Booth C1', location: 'central-plaza', x: 80, y: 10, size: '2x2', status: 'available' },
        { id: 'booth-8', name: 'Booth C2', location: 'central-plaza', x: 90, y: 10, size: '4x4', status: 'available' },
        
        // Food Court (Middle Left)
        { id: 'booth-9', name: 'Booth D1', location: 'food-court', x: 10, y: 30, size: '2x2', status: 'available' },
        { id: 'booth-10', name: 'Booth D2', location: 'food-court', x: 20, y: 30, size: '4x4', status: 'available' },
        { id: 'booth-11', name: 'Booth D3', location: 'food-court', x: 30, y: 30, size: '2x2', status: 'available' },
        
        // Student Center (Middle Center)
        { id: 'booth-12', name: 'Booth E1', location: 'student-center', x: 50, y: 30, size: '2x2', status: 'available' },
        { id: 'booth-13', name: 'Booth E2', location: 'student-center', x: 60, y: 30, size: '4x4', status: 'available' },
        { id: 'booth-14', name: 'Booth E3', location: 'student-center', x: 70, y: 30, size: '2x2', status: 'available' },
        
        // Library Area (Middle Right)
        { id: 'booth-15', name: 'Booth F1', location: 'library-area', x: 80, y: 30, size: '2x2', status: 'available' },
        { id: 'booth-16', name: 'Booth F2', location: 'library-area', x: 90, y: 30, size: '4x4', status: 'available' },
        
        // Cafeteria Area (Bottom Left)
        { id: 'booth-17', name: 'Booth G1', location: 'cafeteria-area', x: 10, y: 50, size: '2x2', status: 'available' },
        { id: 'booth-18', name: 'Booth G2', location: 'cafeteria-area', x: 20, y: 50, size: '4x4', status: 'available' },
        { id: 'booth-19', name: 'Booth G3', location: 'cafeteria-area', x: 30, y: 50, size: '2x2', status: 'available' },
        
        // Auditorium Hall (Bottom Center)
        { id: 'booth-20', name: 'Booth H1', location: 'auditorium-hall', x: 50, y: 50, size: '2x2', status: 'available' },
        { id: 'booth-21', name: 'Booth H2', location: 'auditorium-hall', x: 60, y: 50, size: '4x4', status: 'available' },
        { id: 'booth-22', name: 'Booth H3', location: 'auditorium-hall', x: 70, y: 50, size: '2x2', status: 'available' },
        
        // Gym Entrance (Bottom Right)
        { id: 'booth-23', name: 'Booth I1', location: 'gym-entrance', x: 80, y: 50, size: '2x2', status: 'available' },
        { id: 'booth-24', name: 'Booth I2', location: 'gym-entrance', x: 90, y: 50, size: '4x4', status: 'available' },
        
        // Parking Lot (Bottom)
        { id: 'booth-25', name: 'Booth J1', location: 'parking-lot', x: 10, y: 70, size: '2x2', status: 'available' },
        { id: 'booth-26', name: 'Booth J2', location: 'parking-lot', x: 20, y: 70, size: '4x4', status: 'available' },
        { id: 'booth-27', name: 'Booth J3', location: 'parking-lot', x: 30, y: 70, size: '2x2', status: 'available' },
        { id: 'booth-28', name: 'Booth J4', location: 'parking-lot', x: 50, y: 70, size: '2x2', status: 'available' },
        { id: 'booth-29', name: 'Booth J5', location: 'parking-lot', x: 60, y: 70, size: '4x4', status: 'available' },
        { id: 'booth-30', name: 'Booth J6', location: 'parking-lot', x: 70, y: 70, size: '2x2', status: 'available' }
    ];

    // Check booth availability based on date and duration
    useEffect(() => {
        if (selectedDate) {
            setLoading(true);
            // Simulate API call to check availability
            setTimeout(() => {
                // In real implementation, this would check actual reservations
                // For now, all booths are available unless specifically reserved
                const mockAvailability = allBooths.map(booth => ({
                    ...booth,
                    status: 'available' // All booths available by default
                }));
                setAvailableBooths(mockAvailability);
                setLoading(false);
            }, 500);
        }
    }, [selectedDate, duration]);

    const getBoothColor = (booth) => {
        if (booth.status === 'unavailable') return '#dc3545'; // Red for unavailable
        if (selectedBooth === booth.id) return '#28a745'; // Green for selected
        return '#007bff'; // Blue for available
    };

    const getBoothSize = (booth) => {
        return booth.size === '4x4' ? '20px' : '15px';
    };

    const handleBoothClick = (booth) => {
        if (booth.status === 'available') {
            onBoothSelect(booth);
        }
    };

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
                color: 'var(--text-dark)',
                marginBottom: '1rem',
                fontSize: '1.3rem',
                fontWeight: '600'
            }}>
                Select Booth Location
            </h3>
            
            {!selectedDate && (
                <div style={{
                    padding: '2rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#6c757d'
                }}>
                    Please select a date first to view available booths
                </div>
            )}

            {selectedDate && (
                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: '1rem',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    border: '2px solid var(--guc-red)',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                Checking availability...
                            </div>
                        </div>
                    )}

                    {/* Platform Map */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '600px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid var(--medium-gray)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundImage: `
                            linear-gradient(90deg, #e9ecef 1px, transparent 1px),
                            linear-gradient(180deg, #e9ecef 1px, transparent 1px)
                        `,
                        backgroundSize: '25px 25px'
                    }}>
                        {/* Platform Areas with proper grid layout */}
                        
                        {/* Main Entrance Area (Top Left) */}
                        <div style={{
                            position: 'absolute',
                            top: '5%',
                            left: '5%',
                            width: '35%',
                            height: '15%',
                            backgroundColor: 'rgba(210, 10, 10, 0.1)',
                            border: '2px solid var(--guc-red)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--guc-red)'
                        }}>
                            Main Entrance
                        </div>

                        {/* Garden Section (Top Center) */}
                        <div style={{
                            position: 'absolute',
                            top: '5%',
                            left: '45%',
                            width: '25%',
                            height: '15%',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            border: '2px solid #28a745',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#28a745'
                        }}>
                            Garden Section
                        </div>

                        {/* Central Plaza (Top Right) */}
                        <div style={{
                            position: 'absolute',
                            top: '5%',
                            left: '75%',
                            width: '20%',
                            height: '15%',
                            backgroundColor: 'rgba(255, 193, 7, 0.1)',
                            border: '2px solid #ffc107',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffc107'
                        }}>
                            Central Plaza
                        </div>

                        {/* Food Court (Middle Left) */}
                        <div style={{
                            position: 'absolute',
                            top: '25%',
                            left: '5%',
                            width: '30%',
                            height: '20%',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            border: '2px solid #dc3545',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#dc3545'
                        }}>
                            Food Court
                        </div>

                        {/* Student Center (Middle Center) */}
                        <div style={{
                            position: 'absolute',
                            top: '25%',
                            left: '40%',
                            width: '25%',
                            height: '20%',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            border: '2px solid #007bff',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#007bff'
                        }}>
                            Student Center
                        </div>

                        {/* Library Area (Middle Right) */}
                        <div style={{
                            position: 'absolute',
                            top: '25%',
                            left: '70%',
                            width: '25%',
                            height: '20%',
                            backgroundColor: 'rgba(108, 117, 125, 0.1)',
                            border: '2px solid #6c757d',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#6c757d'
                        }}>
                            Library Area
                        </div>

                        {/* Cafeteria Area (Bottom Left) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '5%',
                            width: '30%',
                            height: '20%',
                            backgroundColor: 'rgba(253, 126, 20, 0.1)',
                            border: '2px solid #fd7e14',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#fd7e14'
                        }}>
                            Cafeteria Area
                        </div>

                        {/* Auditorium Hall (Bottom Center) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '40%',
                            width: '25%',
                            height: '20%',
                            backgroundColor: 'rgba(111, 66, 193, 0.1)',
                            border: '2px solid #6f42c1',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#6f42c1'
                        }}>
                            Auditorium Hall
                        </div>

                        {/* Gym Entrance (Bottom Right) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '70%',
                            width: '25%',
                            height: '20%',
                            backgroundColor: 'rgba(32, 201, 151, 0.1)',
                            border: '2px solid #20c997',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#20c997'
                        }}>
                            Gym Entrance
                        </div>

                        {/* Parking Lot (Bottom) */}
                        <div style={{
                            position: 'absolute',
                            top: '75%',
                            left: '5%',
                            width: '90%',
                            height: '20%',
                            backgroundColor: 'rgba(108, 117, 125, 0.1)',
                            border: '2px solid #6c757d',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#6c757d'
                        }}>
                            Parking Lot
                        </div>

                        {/* Booth Markers */}
                        {availableBooths.map(booth => (
                            <div
                                key={booth.id}
                                onClick={() => handleBoothClick(booth)}
                                style={{
                                    position: 'absolute',
                                    left: `${booth.x}%`,
                                    top: `${booth.y}%`,
                                    width: getBoothSize(booth),
                                    height: getBoothSize(booth),
                                    backgroundColor: getBoothColor(booth),
                                    borderRadius: '50%',
                                    cursor: booth.status === 'available' ? 'pointer' : 'not-allowed',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '8px',
                                    fontWeight: '600',
                                    color: 'white',
                                    opacity: booth.status === 'unavailable' ? 0.5 : 1,
                                    transition: 'all 0.3s ease',
                                    transform: selectedBooth === booth.id ? 'scale(1.2)' : 'scale(1)'
                                }}
                                onMouseOver={(e) => {
                                    if (booth.status === 'available') {
                                        e.target.style.transform = 'scale(1.1)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (booth.status === 'available') {
                                        e.target.style.transform = selectedBooth === booth.id ? 'scale(1.2)' : 'scale(1)';
                                        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                                    }
                                }}
                                title={`${booth.name} - ${booth.size} - ${booth.status === 'available' ? 'Available' : 'Unavailable'}`}
                            >
                                {booth.name.split(' ')[1]}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#007bff',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Available</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#28a745',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Selected</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#dc3545',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Unavailable</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '15px',
                                height: '15px',
                                backgroundColor: '#007bff',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Large (4x4)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#007bff',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Small (2x2)</span>
                        </div>
                    </div>

                    {selectedBooth && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#d4edda',
                            border: '1px solid #c3e6cb',
                            borderRadius: '8px',
                            color: '#155724'
                        }}>
                            <strong>Selected Booth:</strong> {availableBooths.find(b => b.id === selectedBooth)?.name} 
                            ({availableBooths.find(b => b.id === selectedBooth)?.size})
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PlatformMapSelector;
