import React, { useState, useEffect } from 'react';
import courtsApiService from '../api/courtsApi';
import '../styles/StudentCourtsView.css';

const StudentCourtsView = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCourt, setSelectedCourt] = useState(null);

  useEffect(() => {
    loadCourts();
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        setLoading(true);
        loadCourts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Auto-filter when filterType changes
  useEffect(() => {
    if (filterType !== 'all') {
      setLoading(true);
      loadCourts();
    }
  }, [filterType]);

  const loadCourts = async () => {
    try {
      setError('');
      console.log('🏀 Loading courts with filters:', { searchQuery, filterType });
      
      // Build query parameters
      const queryParams = {};
      if (searchQuery.trim()) {
        queryParams.q = searchQuery.trim();
      }
      if (filterType !== 'all') {
        queryParams.type = filterType;
      }
      
      let result;
      if (filterType !== 'all') {
        result = await courtsApiService.getCourtsByType(filterType, queryParams);
      } else {
        result = await courtsApiService.getCourts(queryParams);
      }
      
      if (result.success) {
        console.log('🏀 Courts data:', result.data);
        setCourts(result.data.courts || []);
      } else {
        setCourts([]);
        setError(result.message || 'Failed to fetch courts');
        console.error('Failed to fetch courts:', result.message);
      }
    } catch (error) {
      setError(error?.message || 'Error loading courts');
      console.error('Error loading courts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadCourts();
  };

  const getCourtTypeColor = (type) => {
    const colors = {
      basketball: '#FF6B35',
      tennis: '#4ECDC4',
      volleyball: '#45B7D1',
      badminton: '#96CEB4',
      squash: '#FFEAA7',
      football: '#DDA0DD',
      other: '#95A5A6'
    };
    return colors[type] || colors.other;
  };

  const getCourtTypeIcon = (type) => {
    const icons = {
      basketball: '🏀',
      tennis: '🎾',
      volleyball: '🏐',
      badminton: '🏸',
      squash: '🏓',
      football: '⚽',
      other: '🏟️'
    };
    return icons[type] || icons.other;
  };

  const formatAvailability = (availability) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map((day, index) => {
      const dayData = availability[day];
      if (!dayData.isAvailable) {
        return { day: dayNames[index], status: 'Closed', color: '#e74c3c' };
      }
      return { 
        day: dayNames[index], 
        status: `${dayData.start} - ${dayData.end}`, 
        color: '#27ae60' 
      };
    });
  };

  const CourtCard = ({ court }) => (
    <div className="court-card" onClick={() => setSelectedCourt(court)}>
      <div className="court-header">
        <div className="court-type-badge" style={{ backgroundColor: getCourtTypeColor(court.type) }}>
          {getCourtTypeIcon(court.type)} {court.type.toUpperCase()}
        </div>
        <div className="court-status">
          {court.status === 'active' ? '✅ Available' : 
           court.status === 'maintenance' ? '🔧 Maintenance' : '❌ Closed'}
        </div>
      </div>
      
      <h3 className="court-title">{court.name}</h3>
      
      <div className="court-details">
        <div className="detail-item">
          <span className="detail-label">📍 Location:</span>
          <span>{court.location}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">👥 Capacity:</span>
          <span>{court.capacity} people</span>
        </div>
        {court.hourlyRate > 0 && (
          <div className="detail-item">
            <span className="detail-label">💰 Rate:</span>
            <span>${court.hourlyRate}/hour</span>
          </div>
        )}
      </div>

      {court.description && (
        <p className="court-description">{court.description}</p>
      )}

      {court.equipment && court.equipment.length > 0 && (
        <div className="equipment-section">
          <span className="equipment-label">🏀 Equipment:</span>
          <div className="equipment-tags">
            {court.equipment.map((item, index) => (
              <span key={index} className="equipment-tag">{item}</span>
            ))}
          </div>
        </div>
      )}

      <div className="availability-preview">
        <span className="availability-label">📅 This Week:</span>
        <div className="availability-days">
          {formatAvailability(court.availability).map((day, index) => (
            <span 
              key={index} 
              className="availability-day"
              style={{ color: day.color }}
            >
              {day.day}: {day.status}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const CourtModal = ({ court, onClose }) => {
    if (!court) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{court.name}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="court-type-badge" style={{ backgroundColor: getCourtTypeColor(court.type) }}>
              {getCourtTypeIcon(court.type)} {court.type.toUpperCase()}
            </div>
            
            <div className="court-info-grid">
              <div className="info-section">
                <h3>📍 Court Details</h3>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span>{court.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Capacity:</span>
                  <span>{court.capacity} people</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span>{court.status}</span>
                </div>
                {court.hourlyRate > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Hourly Rate:</span>
                    <span>${court.hourlyRate}/hour</span>
                  </div>
                )}
              </div>

              {court.description && (
                <div className="info-section">
                  <h3>📝 Description</h3>
                  <p className="court-description">{court.description}</p>
                </div>
              )}

              {court.equipment && court.equipment.length > 0 && (
                <div className="info-section">
                  <h3>🏀 Equipment Available</h3>
                  <div className="equipment-grid">
                    {court.equipment.map((item, index) => (
                      <div key={index} className="equipment-item">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {court.amenities && court.amenities.length > 0 && (
                <div className="info-section">
                  <h3>🏪 Amenities</h3>
                  <div className="amenities-grid">
                    {court.amenities.map((amenity, index) => (
                      <div key={index} className="amenity-item">
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="info-section">
              <h3>📅 Weekly Availability</h3>
              <div className="availability-schedule">
                {formatAvailability(court.availability).map((day, index) => (
                  <div key={index} className="schedule-day">
                    <span className="day-name">{day.day}</span>
                    <span className="day-time" style={{ color: day.color }}>
                      {day.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="student-courts-container">
        <div className="loading">Loading courts...</div>
      </div>
    );
  }

  return (
    <div className="student-courts-container">
      <div className="page-header">
        <h1>🏟️ View Courts</h1>
        <p>Browse available courts and check their availability</p>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by court name, location, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍 Search</button>
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setLoading(true);
                loadCourts();
              }}
              className="clear-search-btn"
            >
              ✕ Clear
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <button 
            className={filterType === 'all' ? 'active' : ''} 
            onClick={() => {
              setFilterType('all');
              setLoading(true);
              loadCourts();
            }}
          >
            All Courts
          </button>
          <button 
            className={filterType === 'basketball' ? 'active' : ''} 
            onClick={() => setFilterType('basketball')}
          >
            🏀 Basketball
          </button>
          <button 
            className={filterType === 'tennis' ? 'active' : ''} 
            onClick={() => setFilterType('tennis')}
          >
            🎾 Tennis
          </button>
          <button 
            className={filterType === 'volleyball' ? 'active' : ''} 
            onClick={() => setFilterType('volleyball')}
          >
            🏐 Volleyball
          </button>
          <button 
            className={filterType === 'badminton' ? 'active' : ''} 
            onClick={() => setFilterType('badminton')}
          >
            🏸 Badminton
          </button>
          <button 
            className={filterType === 'football' ? 'active' : ''} 
            onClick={() => setFilterType('football')}
          >
            ⚽ Football
          </button>
          <button 
            className={filterType === 'squash' ? 'active' : ''} 
            onClick={() => setFilterType('squash')}
          >
            🏓 Squash
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!loading && courts.length > 0 && (
        <div className="search-results-info">
          <p>Found {courts.length} court{courts.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
            {filterType !== 'all' && ` in ${filterType} category`}
          </p>
        </div>
      )}

      <div className="courts-grid">
        {courts.length === 0 ? (
          <div className="no-courts">
            <p>No courts found matching your criteria.</p>
            <button onClick={() => { setSearchQuery(''); setFilterType('all'); setLoading(true); loadCourts(); }}>
              Show All Courts
            </button>
          </div>
        ) : (
          courts.map(court => (
            <CourtCard key={court.id} court={court} />
          ))
        )}
      </div>

      <CourtModal court={selectedCourt} onClose={() => setSelectedCourt(null)} />
    </div>
  );
};

export default StudentCourtsView;
