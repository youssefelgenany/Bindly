import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';
import { studentRegistrationApi } from '../api/studentRegistrationApi';

const EventPayment = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'card'
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [registrationData, setRegistrationData] = useState(null);

  useEffect(() => {
    loadEventData();
    loadWalletBalance();
    
    // Check for pending registration data from sessionStorage
    const pendingReg = sessionStorage.getItem('pendingRegistration');
    if (pendingReg) {
      try {
        const data = JSON.parse(pendingReg);
        setRegistrationData(data);
        if (data.eventId !== eventId) {
          // Clear if event ID doesn't match
          sessionStorage.removeItem('pendingRegistration');
        }
      } catch (e) {
        console.error('Error parsing pending registration:', e);
      }
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const result = await eventsApiService.getStudentEvents({});
      if (result.success) {
        const eventsList = Array.isArray(result.data) ? result.data : (result.data.events || []);
        const foundEvent = eventsList.find(e => String(e._id || e.id) === String(eventId));
        if (foundEvent) {
          setEvent({
            id: foundEvent._id || foundEvent.id,
            title: foundEvent.title,
            type: foundEvent.type,
            price: foundEvent.price || 0,
            location: foundEvent.location,
            startDate: foundEvent.startDate
          });
        } else {
          setError('Event not found');
        }
      } else {
        setError('Failed to load event details');
      }
    } catch (err) {
      setError('Error loading event');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      // Use the wallet transactions endpoint which returns the current balance
      const response = await fetch('http://localhost:5000/api/events/wallet/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.walletBalance || 0);
        console.log('💰 Wallet balance loaded:', data.walletBalance);
      } else {
        // Fallback to /api/auth/me if wallet endpoint fails
        const meResponse = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          const currentUser = meData.user || meData;
          setWalletBalance(currentUser.walletBalance || 0);
          console.log('💰 Wallet balance from /me:', currentUser.walletBalance);
        }
      }
    } catch (err) {
      console.error('Error loading wallet balance:', err);
    }
  };

  const handlePayment = async () => {
    if (!event || !user) return;
    
    setProcessing(true);
    setError('');

    try {
      if (paymentMethod === 'wallet') {
        // Check wallet balance
        if (walletBalance < event.price) {
          setError(`Insufficient wallet balance. You have ${walletBalance} EGP, but need ${event.price} EGP.`);
          setProcessing(false);
          return;
        }

        // Process wallet payment
        const result = await eventsApiService.payForEvent(eventId, { paymentMethod: 'wallet' });
        
        if (result.success) {
          // Mark registration as paid
          if (registrationData?.registrationId) {
            // Update StudentRegistration to mark as paid
            // This will be handled by the payment endpoint
          }
          
          // Clear pending registration
          sessionStorage.removeItem('pendingRegistration');
          
          // Show success and redirect
          navigate('/payment-success', {
            state: {
              event: event,
              paymentMethod: 'wallet',
              amount: event.price
            }
          });
        } else {
          setError(result.message || 'Payment failed');
        }
      } else if (paymentMethod === 'card') {
        // Process card payment via Stripe
        const result = await eventsApiService.payForEvent(eventId, { paymentMethod: 'card' });
        
        if (result.success && result.data.url) {
          // Redirect to Stripe checkout
          window.location.href = result.data.url;
        } else {
          setError(result.message || 'Failed to initiate card payment');
        }
      }
    } catch (err) {
      setError('An error occurred during payment');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error && !event) {
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

        {/* Event Summary */}
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
            {event?.title}
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
              {formatDate(event?.startDate)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
              {event?.location}
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
                {event?.price || 0} EGP
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
            {/* Wallet Option */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                border: `2px solid ${paymentMethod === 'wallet' ? '#1e40af' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                backgroundColor: paymentMethod === 'wallet' ? '#eff6ff' : '#FFFFFF',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ marginRight: '0.75rem', width: '1.25rem', height: '1.25rem' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#1D3557' }}>Wallet</span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Balance: {walletBalance} EGP
                  </span>
                </div>
                {walletBalance < (event?.price || 0) && (
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    margin: '0.25rem 0 0 0'
                  }}>
                    Insufficient balance. Please use card payment or top up your wallet.
                  </p>
                )}
              </div>
            </label>

            {/* Card Option */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                border: `2px solid ${paymentMethod === 'card' ? '#1e40af' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                backgroundColor: paymentMethod === 'card' ? '#eff6ff' : '#FFFFFF',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
            disabled={processing}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: processing ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={processing || (paymentMethod === 'wallet' && walletBalance < (event?.price || 0))}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: processing ? '#9ca3af' : '#1e40af',
              color: '#FFFFFF',
              border: 'none',
              cursor: (processing || (paymentMethod === 'wallet' && walletBalance < (event?.price || 0))) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: (processing || (paymentMethod === 'wallet' && walletBalance < (event?.price || 0))) ? 0.5 : 1
            }}
          >
            {processing ? 'Processing...' : `Pay ${event?.price || 0} EGP`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPayment;

