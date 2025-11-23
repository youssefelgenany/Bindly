import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    // Get event info from location state or sessionStorage
    const stateEvent = location.state?.event;
    const pendingReg = sessionStorage.getItem('pendingRegistration');
    const sessionId = searchParams.get('session_id');
    
    const loadPaymentInfo = async () => {
      try {
        if (stateEvent) {
          setEvent(stateEvent);
          setPaymentInfo({
            method: location.state.paymentMethod || 'card',
            amount: location.state.amount || 0
          });
          setLoading(false);
        } else if (pendingReg) {
          try {
            const data = JSON.parse(pendingReg);
            setEvent(data.event);
            setPaymentInfo({
              method: 'card',
              amount: data.event.price || 0
            });
            // Clear sessionStorage after use
            sessionStorage.removeItem('pendingRegistration');
          } catch (e) {
            console.error('Error parsing pending registration:', e);
          }
          setLoading(false);
        } else if (sessionId) {
          // For Stripe payments, verify the session and get event details
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/events/verify-payment?sessionId=${sessionId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.payment && data.event) {
                setEvent(data.event);
                setPaymentInfo({
                  method: 'card',
                  amount: data.payment.amount || 0
                });
              } else if (data.success && data.payment) {
                // If event not in response, fetch it separately
                try {
                  const eventResponse = await fetch(`http://localhost:5000/api/events/${data.payment.event}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  if (eventResponse.ok) {
                    const eventData = await eventResponse.json();
                    setEvent(eventData);
                    setPaymentInfo({
                      method: 'card',
                      amount: data.payment.amount || 0
                    });
                  }
                } catch (eventErr) {
                  console.error('Error fetching event:', eventErr);
                }
              }
            }
          } catch (err) {
            console.error('Error verifying payment:', err);
          }
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading payment info:', err);
        setLoading(false);
      }
    };
    
    loadPaymentInfo();
  }, [location, searchParams]);

  const handleClose = () => {
    // Navigate to "My Events" page
    if (user?.userType === 'TA' || user?.userType === 'Staff') {
      navigate('/staff/my-registrations');
    } else if (user?.userType === 'Professor') {
      navigate('/professor/events');
    } else if (user?.userType === 'Student') {
      navigate('/student/my-registrations');
    } else {
      navigate('/dashboard');
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
        maxWidth: '500px',
        width: '100%',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          backgroundColor: '#d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem'
        }}>
          ✅
        </div>
        <h3 style={{
          color: '#1D3557',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem',
          marginTop: 0
        }}>
          Registration Successful!
        </h3>
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          marginBottom: '0.5rem'
        }}>
          You have been successfully registered for <strong style={{ color: '#1D3557' }}>{event?.title || 'the event'}</strong>
        </p>
        {paymentInfo && (
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            Payment of <strong style={{ color: '#1D3557' }}>{paymentInfo.amount} EGP</strong> via {paymentInfo.method === 'wallet' ? 'wallet' : 'card'} has been processed.
          </p>
        )}
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          marginBottom: '1.5rem'
        }}>
          A payment receipt has been sent to <strong style={{ color: '#1D3557' }}>{user?.email}</strong>
        </p>
        <button
          onClick={handleClose}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '0.5rem',
            backgroundColor: '#1e40af',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#1e3a8a';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#1e40af';
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;

