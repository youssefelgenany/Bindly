import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BazaarForm from '../components/BazaarForm';
import { bazaarApi } from '../api/eventsApi';
import '../styles/CreateBazaar.css';

const CreateBazaar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleCreateBazaar = async (bazaarData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await bazaarApi.create(bazaarData);
      
      if (result.message && result.message.includes('successfully')) {
        setMessage({ 
          type: 'success', 
          text: 'Bazaar created successfully! Redirecting...' 
        });
        setTimeout(() => navigate('/student/events'), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Error creating bazaar' 
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
    <div className="create-bazaar-page">
      <div className="page-header">
        <h1 className="page-title">Create New Bazaar</h1>
        <p className="page-subtitle">Add all the details for your new bazaar event</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <BazaarForm 
          onSubmit={handleCreateBazaar}
          loading={loading}
          submitLabel="Create Bazaar"
          loadingLabel="Creating..."
        />
      </div>
    </div>
  );
};

export default CreateBazaar;