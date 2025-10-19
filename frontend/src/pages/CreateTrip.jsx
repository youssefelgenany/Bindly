import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripForm from '../components/TripForm';
import { tripApi } from '../api/eventsApi';
import '../styles/CreateTrip.css';

const CreateTrip = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleCreateTrip = async (tripData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await tripApi.create(tripData);
      
      if (result.message && result.message.includes('successfully')) {
        setMessage({ 
          type: 'success', 
          text: 'Trip created successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/student/events'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Error creating trip' 
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

  return (
    <div className="create-trip-page">
      <div className="page-header">
        <h1 className="page-title">Create New Trip</h1>
        <p className="page-subtitle">Add all the details for your new trip event</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <TripForm 
          onSubmit={handleCreateTrip}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default CreateTrip;