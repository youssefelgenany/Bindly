import React from 'react';
import { Link } from 'react-router-dom';

const PendingVerification = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Account Pending Verification</h1>
            <p className="card-subtitle">Your account is awaiting admin approval.</p>
          </div>
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-light)' }}>
              Thank you for registering. An administrator must verify and activate your account before you can use the platform.
            </p>
            <p style={{ color: 'var(--text-light)' }}>
              If this takes too long, contact support or your administrator.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;





