import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const VendorRequestPayment = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [request, setRequest] = useState(location.state?.selectedEvent || null);
  const [loading, setLoading] = useState(!location.state?.selectedEvent);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (request) return;
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/vendor-requests/${requestId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setRequest(data.request || data);
        } else {
          setError('Failed to load request details');
        }
      } catch (err) {
        console.error('Error loading vendor request:', err);
        setError('Error loading request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId, request]);

  const handlePayment = async () => {
    if (!request) return;
    try {
      setPaymentLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/vendor-requests/${requestId}/payment`,
        { paymentMethod: 'card' },
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' } }
      );

      if (res.status === 200 && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setError(res.data?.message || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Error initiating vendor payment:', err);
      setError(err.response?.data?.message || err.message || 'Error initiating payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f6f7f8'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f6f7f8',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p style={{ color: '#dc2626', fontSize: '1rem' }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            backgroundColor: '#1e40af',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const formatDate = (d) => {
    if (!d) return 'TBD';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f6f7f8',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        width: '100%',
        padding: '2rem'
      }}>
        <h2 style={{
          color: '#1D3557',
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          marginTop: 0
        }}>
          Complete Payment
        </h2>

        {/* Request Summary */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{
            color: '#1D3557',
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            marginTop: 0
          }}>
            {request.name || request.eventName || 'Participation'}
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>calendar_today</span>
              {formatDate(request.startDate || request.date)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
              {request.location || request.boothLocation || 'N/A'}
            </div>
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1D3557' }}>Total Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1D3557' }}>
                {request.participationFee || request.amount || 0} EGP
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            color: '#1D3557',
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            marginTop: 0
          }}>
            Select Payment Method
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Card Option */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                border: '2px solid #1e40af',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                backgroundColor: '#eff6ff',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={true}
                readOnly
                style={{ marginRight: '0.75rem', width: '1.25rem', height: '1.25rem' }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: '600', color: '#1D3557' }}>Credit/Debit Card</span>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  Secure payment via Stripe
                </p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            borderRadius: '0.375rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            disabled={paymentLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: paymentLoading ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: paymentLoading ? '#9ca3af' : '#1e40af',
              color: '#FFFFFF',
              border: 'none',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: paymentLoading ? 0.5 : 1
            }}
          >
            {paymentLoading ? 'Processing...' : `Pay ${request.participationFee || request.amount || 0} EGP`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorRequestPayment;
