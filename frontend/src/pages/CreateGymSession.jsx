import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GymSessionForm from '../components/GymSessionForm';
import { gymSessionApi } from '../api/gymSessionApi';
import '../styles/CreateGymSession.css';

const CreateGymSession = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleCreateGymSession = async (gymSessionData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await gymSessionApi.create(gymSessionData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Gym session created successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/student/events'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Error creating gym session' 
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
    <div className="create-gym-session-page">
      <div className="page-header">
        <h1 className="page-title">Create Gym Session</h1>
        <p className="page-subtitle">Add all the details for your new gym session</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <GymSessionForm 
          onSubmit={handleCreateGymSession}
          loading={loading}
          submitLabel="Create Gym Session"
          loadingLabel="Creating..."
        />
      </div>
    </div>
  );
};

export default CreateGymSession;
