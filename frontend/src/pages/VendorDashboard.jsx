import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VendorDashboard = () => {
    const { user } = useAuth();

    return (
        <div style={{
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            minHeight: '100vh'
        }}>
            <div className="container">
                {/* Welcome Header with Cool Animation */}
                <div className="card" style={{
                    marginBottom: '2rem',
                    background: 'var(--white)',
                    border: '2px solid var(--guc-red)',
                    borderRadius: '15px',
                    boxShadow: '0 8px 25px rgba(210, 10, 10, 0.15)',
                    transform: 'translateY(0)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 15px 35px rgba(210, 10, 10, 0.25)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(210, 10, 10, 0.15)';
                    }}
                >
                    {/* Decorative corner elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '40px',
                        height: '40px',
                        background: 'var(--guc-red)',
                        borderRadius: '50%',
                        opacity: 0.1
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-15px',
                        left: '-15px',
                        width: '60px',
                        height: '60px',
                        background: 'var(--guc-red)',
                        borderRadius: '50%',
                        opacity: 0.1
                    }}></div>

                    <div className="card-header" style={{ background: 'transparent', border: 'none' }}>
                        <h1 className="card-title" style={{
                            color: 'var(--guc-red)',
                            fontSize: '2.2rem',
                            fontWeight: '600',
                            margin: 0,
                            textShadow: '0 2px 4px rgba(210, 10, 10, 0.1)'
                        }}>
                            Vendor Dashboard
                        </h1>
                        <p className="card-subtitle" style={{
                            color: 'var(--text-dark)',
                            fontSize: '1rem',
                            marginTop: '0.5rem',
                            marginBottom: 0
                        }}>
                            Welcome, {user.firstName} {user.lastName}. Manage your vendor account and applications.
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '2rem',
                    marginTop: '1rem'
                }}>
                    {/* Account Info Card - Cool Design */}
                    <div className="card" style={{
                        backgroundColor: 'var(--white)',
                        borderRadius: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        border: '1px solid var(--medium-gray)',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
                            e.currentTarget.style.borderColor = 'var(--guc-red)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                            e.currentTarget.style.borderColor = 'var(--medium-gray)';
                        }}
                    >
                        {/* Card Header with GUC Theme */}
                        <div style={{
                            background: 'var(--guc-red)',
                            padding: '1.5rem',
                            color: 'white',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '60px',
                                height: '60px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%'
                            }}></div>
                            <div style={{
                                position: 'absolute',
                                bottom: '-15px',
                                left: '-15px',
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%'
                            }}></div>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.3rem',
                                fontWeight: '600',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                Account Information
                            </h3>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--light-gray)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--medium-gray)',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                                        e.currentTarget.style.borderColor = 'var(--guc-red)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--light-gray)';
                                        e.currentTarget.style.borderColor = 'var(--medium-gray)';
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: 'var(--guc-red)',
                                        borderRadius: '50%',
                                        marginRight: '1rem'
                                    }}></div>
                                    <div>
                                        <strong>Name:</strong> {user.firstName} {user.lastName}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--light-gray)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--medium-gray)',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                                        e.currentTarget.style.borderColor = 'var(--guc-red)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--light-gray)';
                                        e.currentTarget.style.borderColor = 'var(--medium-gray)';
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: 'var(--guc-red)',
                                        borderRadius: '50%',
                                        marginRight: '1rem'
                                    }}></div>
                                    <div>
                                        <strong>Email:</strong> {user.email}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--light-gray)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--medium-gray)',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                                        e.currentTarget.style.borderColor = 'var(--guc-red)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--light-gray)';
                                        e.currentTarget.style.borderColor = 'var(--medium-gray)';
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: 'var(--guc-red)',
                                        borderRadius: '50%',
                                        marginRight: '1rem'
                                    }}></div>
                                    <div>
                                        <strong>Account Type:</strong> Vendor
                                    </div>
                                </div>
                                {user.companyName && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        backgroundColor: 'var(--light-gray)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--medium-gray)',
                                        transition: 'all 0.2s ease'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                                            e.currentTarget.style.borderColor = 'var(--guc-red)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--light-gray)';
                                            e.currentTarget.style.borderColor = 'var(--medium-gray)';
                                        }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            backgroundColor: 'var(--guc-red)',
                                            borderRadius: '50%',
                                            marginRight: '1rem'
                                        }}></div>
                                        <div>
                                            <strong>Company:</strong> {user.companyName}
                                        </div>
                                    </div>
                                )}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: user.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)',
                                    borderRadius: '8px',
                                    border: `1px solid ${user.isVerified ? 'var(--success-green)' : 'var(--warning-yellow)'}`,
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.01)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: user.isVerified ? '#28a745' : '#ffc107',
                                        borderRadius: '50%',
                                        marginRight: '1rem'
                                    }}></div>
                                    <div>
                                        <strong>Status:</strong>
                                        <span style={{
                                            color: user.isVerified ? '#155724' : '#856404',
                                            marginLeft: '0.5rem',
                                            fontWeight: '600'
                                        }}>
                                            {user.isVerified ? 'Verified' : 'Pending Verification'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--light-gray)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--medium-gray)',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                                        e.currentTarget.style.borderColor = 'var(--guc-red)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--light-gray)';
                                        e.currentTarget.style.borderColor = 'var(--medium-gray)';
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: 'var(--guc-red)',
                                        borderRadius: '50%',
                                        marginRight: '1rem'
                                    }}></div>
                                    <div>
                                        <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card - Cool Design */}
                    <div className="card" style={{
                        backgroundColor: 'var(--white)',
                        borderRadius: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        border: '1px solid var(--medium-gray)',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
                            e.currentTarget.style.borderColor = 'var(--guc-red)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                            e.currentTarget.style.borderColor = 'var(--medium-gray)';
                        }}
                    >
                        {/* Card Header with GUC Theme */}
                        <div style={{
                            background: 'var(--guc-red)',
                            padding: '1.5rem',
                            color: 'white',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '60px',
                                height: '60px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%'
                            }}></div>
                            <div style={{
                                position: 'absolute',
                                bottom: '-15px',
                                left: '-15px',
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%'
                            }}></div>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.3rem',
                                fontWeight: '600',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                Quick Actions
                            </h3>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <Link
                                    to="/vendor/requests"
                                    style={{
                                        textDecoration: 'none',
                                        display: 'block'
                                    }}
                                >
                                    <div style={{
                                        padding: '1.25rem',
                                        background: 'var(--guc-red)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        boxShadow: '0 6px 20px rgba(210, 10, 10, 0.3)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(210, 10, 10, 0.4)';
                                            e.currentTarget.style.background = '#b80a0a';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(210, 10, 10, 0.3)';
                                            e.currentTarget.style.background = 'var(--guc-red)';
                                        }}
                                    >
                                        My Requests
                                    </div>
                                </Link>

                                <Link
                                    to="/vendor/bazaars"
                                    style={{
                                        textDecoration: 'none',
                                        display: 'block'
                                    }}
                                >
                                    <div style={{
                                        padding: '1.25rem',
                                        background: 'var(--guc-red)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        boxShadow: '0 6px 20px rgba(210, 10, 10, 0.3)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(210, 10, 10, 0.4)';
                                            e.currentTarget.style.background = '#b80a0a';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(210, 10, 10, 0.3)';
                                            e.currentTarget.style.background = 'var(--guc-red)';
                                        }}
                                    >
                                        Browse Upcoming Bazaars
                                    </div>
                                </Link>

                                <Link
                                    to="/vendor/platform-booth"
                                    style={{
                                        textDecoration: 'none',
                                        display: 'block'
                                    }}
                                >
                                    <div style={{
                                        padding: '1.25rem',
                                        background: 'var(--guc-red)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        boxShadow: '0 6px 20px rgba(210, 10, 10, 0.3)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(210, 10, 10, 0.4)';
                                            e.currentTarget.style.background = '#b80a0a';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(210, 10, 10, 0.3)';
                                            e.currentTarget.style.background = 'var(--guc-red)';
                                        }}
                                    >
                                        Platform Booth Reservation
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;


