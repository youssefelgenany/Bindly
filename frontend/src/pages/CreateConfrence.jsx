import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConferenceForm from '../components/ConferenceForm';
import axios from 'axios';
import '../styles/CreateBazaar.css';

const CreateConference = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleCreateConference = async (conferenceData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await axios.post("http://localhost:5000/api/events/conference", conferenceData);
      
      if (result.data.msg && result.data.msg.includes('successfully')) {
        setMessage({ 
          type: 'success', 
          text: 'Conference created successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/events'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.data.msg || 'Error creating conference' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.msg || 'Network error. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-bazaar-page">
      <div className="page-header">
        <h1 className="page-title">Create New Conference</h1>
        <p className="page-subtitle">Add all the details for your new conference event</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <ConferenceForm 
          onSubmit={handleCreateConference}
          loading={loading}
          submitLabel="Create Conference"
          loadingLabel="Creating..."
        />
      </div>
    </div>
  );
};

export default CreateConference;