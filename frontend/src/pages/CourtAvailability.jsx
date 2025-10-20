import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import courtApiService from '../api/courtsApi';

const CourtAvailability = () => {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingData, setBookingData] = useState({
    startTime: '',
    endTime: '',
    purpose: '',
    participants: [{ name: '', email: '' }],
    notes: ''
  });

  useEffect(() => {
    loadCourts();
  }, [typeFilter]);

  useEffect(() => {
    if (selectedCourt) {
      loadCourtAvailability();
    }
  }, [selectedCourt, selectedDate]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = typeFilter !== 'all' ? { type: typeFilter } : {};
      
      // Use different API method based on user type
      let result;
      if (user?.userType === 'Staff') {
        // Staff users get all courts from the main courts collection
        result = await courtApiService.getAllCourts(params);
      } else {
        // Students and other users use the student-specific endpoint
        result = await courtApiService.getCourts(params);
      }
      
      if (result.success) {
        setCourts(result.data.courts || []);
        if (result.data.courts && result.data.courts.length > 0 && !selectedCourt) {
          setSelectedCourt(result.data.courts[0]);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load courts');
    } finally {
      setLoading(false);
    }
  };

  const loadCourtAvailability = async () => {
    if (!selectedCourt) return;
    
    try {
      setLoading(true);
      const result = await courtApiService.getCourtAvailability(selectedCourt._id, selectedDate);
      
      if (result.success) {
        setAvailability(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load court availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setBookingData({
      ...bookingData,
      startTime: slot.startTime,
      endTime: slot.endTime
    });
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const result = await courtApiService.bookCourt({
        courtId: selectedCourt._id,
        bookingDate: selectedDate,
        ...bookingData
      });
      
      if (result.success) {
        alert('Court booking request submitted successfully!');
        setShowBookingForm(false);
        setSelectedSlot(null);
        setBookingData({
          startTime: '',
          endTime: '',
          purpose: '',
          participants: [{ name: '', email: '' }],
          notes: ''
        });
        loadCourtAvailability(); // Refresh availability
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    setBookingData({
      ...bookingData,
      participants: [...bookingData.participants, { name: '', email: '' }]
    });
  };

  const removeParticipant = (index) => {
    const newParticipants = bookingData.participants.filter((_, i) => i !== index);
    setBookingData({
      ...bookingData,
      participants: newParticipants
    });
  };

  const updateParticipant = (index, field, value) => {
    const newParticipants = [...bookingData.participants];
    newParticipants[index][field] = value;
    setBookingData({
      ...bookingData,
      participants: newParticipants
    });
  };

  if (loading && courts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Loading courts...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Court Availability</h1>
            <p className="card-subtitle">View and book courts for basketball, tennis, and football</p>
          </div>

          {error && (
            <div style={{ 
              background: 'var(--guc-red)', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '8px', 
              margin: '1rem 0' 
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Court Type:
                </label>
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="form-input"
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">All Courts</option>
                  <option value="basketball">Basketball</option>
                  <option value="tennis">Tennis</option>
                  <option value="football">Football</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Select Court:
                </label>
                <select 
                  value={selectedCourt?._id || ''} 
                  onChange={(e) => {
                    const court = courts.find(c => c._id === e.target.value);
                    setSelectedCourt(court);
                  }}
                  className="form-input"
                  style={{ minWidth: '200px' }}
                >
                  <option value="">Select a court</option>
                  {courts.map(court => (
                    <option key={court._id} value={court._id}>
                      {court.name} ({court.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {selectedCourt && availability && (
            <div>
              <h3 style={{ marginBottom: '1rem' }}>
                {availability.court.name} - {new Date(availability.date).toLocaleDateString()}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {availability.availableSlots.map((slot, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'var(--success-green)',
                      color: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'var(--guc-red)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'var(--success-green)';
                    }}
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      Available
                    </div>
                  </div>
                ))}
              </div>

              {availability.availableSlots.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'var(--text-light)',
                  background: 'var(--light-gray)',
                  borderRadius: '8px'
                }}>
                  No available slots for this date
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Book Court</h3>
            
            <form onSubmit={handleBookingSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Time Slot:
                </label>
                <div style={{ 
                  background: 'var(--light-gray)', 
                  padding: '0.75rem', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  {selectedSlot?.startTime} - {selectedSlot?.endTime}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Purpose:
                </label>
                <input
                  type="text"
                  value={bookingData.purpose}
                  onChange={(e) => setBookingData({...bookingData, purpose: e.target.value})}
                  className="form-input"
                  placeholder="e.g., Basketball practice, Tennis match"
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Participants:
                </label>
                {bookingData.participants.map((participant, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      className="form-input"
                      placeholder="Name"
                      required
                    />
                    <input
                      type="email"
                      value={participant.email}
                      onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                      className="form-input"
                      placeholder="Email"
                      required
                    />
                    {bookingData.participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        style={{
                          background: 'var(--guc-red)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {bookingData.participants.length < 5 && (
                  <button
                    type="button"
                    onClick={addParticipant}
                    style={{
                      background: 'var(--success-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    + Add Participant
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Notes (Optional):
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                  className="form-input"
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtAvailability;
