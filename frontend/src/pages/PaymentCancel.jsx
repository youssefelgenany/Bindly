import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentCancel = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const type = searchParams.get('type');
    const requestId = searchParams.get('requestId');

    const handleRetry = () => {
        if (type === 'vendor-request') {
            navigate(`/vendor/accepted-events`);
        } else {
            navigate('/events');
        }
    };

    const handleGoHome = () => {
        if (user?.userType === 'TA' || user?.userType === 'Staff') {
            navigate('/staff/my-registrations');
        } else if (user?.userType === 'Professor') {
            navigate('/professor/events');
        } else if (user?.userType === 'Student') {
            navigate('/student/my-registrations');
        } else if (user?.userType === 'Vendor') {
            navigate('/vendor');
        } else {
            navigate('/dashboard');
        }
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
                maxWidth: '500px',
                width: '100%',
                padding: '3rem 2rem',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2rem'
                }}>
                    ✕
                </div>

                <h1 style={{
                    color: '#1D3557',
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    marginTop: 0,
                    marginBottom: '0.5rem'
                }}>
                    Payment Cancelled
                </h1>

                <p style={{
                    color: '#6b7280',
                    fontSize: '1rem',
                    marginTop: 0,
                    marginBottom: '1.5rem',
                    lineHeight: '1.5'
                }}>
                    Your payment was not completed. {type === 'vendor-request' ? 'Your participation fee has not been charged.' : 'Your registration has not been completed.'}
                </p>

                <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '2rem',
                    fontSize: '0.875rem',
                    color: '#92400e',
                    textAlign: 'left'
                }}>
                    <strong>What happens next:</strong>
                    <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                        <li>Your request remains in "Accepted" status</li>
                        <li>You can try paying again anytime before the deadline</li>
                        {type === 'vendor-request' && <li>The payment deadline is still 3 days from acceptance</li>}
                    </ul>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                }}>
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#1e40af',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
                    >
                        Retry Payment
                    </button>

                    <button
                        onClick={handleGoHome}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    >
                        Go to Dashboard
                    </button>
                </div>

                <p style={{
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                    marginTop: '2rem',
                    marginBottom: 0
                }}>
                    Need help? Contact events@guc.edu.eg
                </p>
            </div>
        </div>
    );
};

export default PaymentCancel;
