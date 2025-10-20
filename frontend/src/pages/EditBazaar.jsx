import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BazaarForm from '../components/BazaarForm';
import { bazaarApi } from '../api/eventManagementApi';
import '../styles/EditBazaar.css';

const EditBazaar = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Gets the bazaar ID from URL
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [bazaarData, setBazaarData] = useState(null);

  // Load existing bazaar data when page loads
  useEffect(() => {
    const fetchBazaarData = async () => {
      setLoadingData(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/bazaars/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBazaarData({
            name: data.title || data.name,
            location: data.location || '',
            description: data.description || '',
            startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : '',
            endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : '',
            registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString().slice(0, 16) : ''
          });
        } else {
          setMessage({ type: 'error', text: 'Failed to load bazaar data' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Network error loading bazaar data' });
      } finally {
        setLoadingData(false);
      }
    };

    if (id) {
      fetchBazaarData();
    }
  }, [id]);

  const handleUpdateBazaar = async (updatedData) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await bazaarApi.update(id, updatedData);

      if (result.message && result.message.includes('successfully')) {
        setMessage({
          type: 'success',
          text: 'Bazaar updated successfully! Redirecting...'
        });
        setTimeout(() => navigate('/student/events'), 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Error updating bazaar'
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
      <div className="edit-bazaar-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading bazaar data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-bazaar-page">
      <div className="page-header">
        <h1 className="page-title">Edit Bazaar</h1>
        <p className="page-subtitle">Update the details for this bazaar event</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-container">
        <BazaarForm
          onSubmit={handleUpdateBazaar}
          loading={loading}
          initialData={bazaarData}
          submitText={loading ? "Updating..." : "Update Bazaar"}
        />
      </div>
    </div>
  );
};

export default EditBazaar;