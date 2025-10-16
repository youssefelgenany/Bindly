import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VendorDashboard = () => {
    const { user } = useAuth();

    return (
        <div style={{ padding: '2rem' }}>
            <div className="container">
                <div className="card">
                    <div className="card-header">
                        <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>
                            Welcome, {user.firstName}!
                        </h1>
                        <p className="card-subtitle">
                            Welcome to the vendor portal. Manage your listings and bazaar participation.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                        marginTop: '2rem'
                    }}>
                        {/* Account Info */}
                        <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                            <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                                Account Information
                            </h3>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <div>
                                    <strong>Name:</strong> {user.firstName} {user.lastName}
                                </div>
                                <div>
                                    <strong>Email:</strong> {user.email}
                                </div>
                                <div>
                                    <strong>Account Type:</strong> Vendor
                                </div>
                                {user.companyName && (
                                    <div>
                                        <strong>Company:</strong> {user.companyName}
                                    </div>
                                )}
                                <div>
                                    <strong>Status:</strong>
                                    <span style={{
                                        color: user.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)',
                                        marginLeft: '0.5rem'
                                    }}>
                                        {user.isVerified ? '✓ Verified' : '⚠ Pending Verification'}
                                    </span>
                                </div>
                                <div>
                                    <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                            <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                                Quick Actions
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <button className="btn btn-outline" style={{ width: '100%' }}>
                                    My Listings
                                </button>
                                <button className="btn btn-outline" style={{ width: '100%' }}>
                                    Add New Listing
                                </button>
                                <button className="btn btn-outline" style={{ width: '100%' }}>
                                    View Analytics
                                </button>
                                <Link to="/vendor/accepted" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                                    My Accepted Upcoming
                                </Link>
                                <Link to="/vendor/requests" className="btn btn-outline" style={{ width: '100%', textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                                    Requests (Pending/Rejected)
                                </Link>
                                <Link to="/vendor/bazaars" className="btn btn-outline" style={{ width: '100%', textDecoration: 'none', display: 'inline-block' }}>
                                    Browse Upcoming Bazaars
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future vendor activity */}
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                            Recent Activity
                        </h3>
                        <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                            <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>
                                No recent activity to display yet.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;


