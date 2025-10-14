import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TripForm from '../components/TripForm';
import { tripApi } from '../api/eventAPI';
import '../styles/EditTrip.css';

const EditTrip = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Gets the trip ID from URL
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tripData, setTripData] = useState(null);

  // Load existing trip data when page loads
  useEffect(() => {
    setLoadingData(true);
    
    // Simulate API call to get trip data
    setTimeout(() => {
      setTripData({
        name: "Sample Trip",
        location: "Sample Location",
        price: 50,
        description: "Sample trip description",
        startDate: "2024-12-01T08:00",
        endDate: "2024-12-03T20:00",
        capacity: 30,
        registrationDeadline: "2024-11-20T23:59"
      });
      setLoadingData(false);
    }, 500);
  }, [id]);

  const handleUpdateTrip = async (updatedData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await tripApi.update(id, updatedData);
      
      if (result.message && result.message.includes('successfully')) {
        setMessage({ 
          type: 'success', 
          text: 'Trip updated successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/events'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Error updating trip' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="edit-trip-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading trip data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-trip-page">
      <div className="page-header">
        <h1 className="page-title">Edit Trip</h1>
        <p className="page-subtitle">Update the details for this trip event</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <TripForm 
          onSubmit={handleUpdateTrip}
          loading={loading}
          initialData={tripData}
          submitText={loading ? "Updating..." : "Update Trip"}
        />
      </div>
    </div>
  );
};

export default EditTrip;