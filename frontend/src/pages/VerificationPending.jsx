import React from 'react';
import { Link } from 'react-router-dom';

const VerificationPending = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--light-gray) 0%, #E9ECEF 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div className="card-header">
          <div style={{ 
            fontSize: '64px', 
            marginBottom: '20px',
            color: 'var(--guc-red)'
          }}>
            PENDING
          </div>
          <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>
            Account Pending Verification
          </h1>
          <p className="card-subtitle">
            Your account is being reviewed by our admin team
          </p>
        </div>

        <div style={{ padding: '20px 0' }}>
          <p style={{ 
            margin: '0 0 20px 0', 
            color: 'var(--text-light)',
            fontSize: '16px'
          }}>
            <strong>Check your email</strong> - We'll send you a notification once your account is verified.
          </p>

          <div style={{ marginTop: '30px' }}>
            <Link 
              to="/login" 
              style={{ 
                color: 'var(--guc-red)', 
                textDecoration: 'none', 
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
