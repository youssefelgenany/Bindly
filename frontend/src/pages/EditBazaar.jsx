import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BazaarForm from '../components/BazaarForm';
<<<<<<< HEAD
import { bazaarApi } from '../api/eventsApi';
=======
import { bazaarApi } from '../api/eventManagementApi';
>>>>>>> 3d44e049b711fdc9901d70135416234d35764b85
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
    // In a real app, you'd fetch the bazaar data by ID
    // For now, we'll simulate loading existing data
    setLoadingData(true);
    
    // Simulate API call to get bazaar data
    setTimeout(() => {
      setBazaarData({
        name: "Sample Bazaar",
        location: "Sample Location",
        description: "Sample description",
        startDate: "2024-12-01T10:00",
        endDate: "2024-12-01T18:00",
        registrationDeadline: "2024-11-25T23:59"
      });
      setLoadingData(false);
    }, 500);
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
        setTimeout(() => navigate('/events'), 2000);
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