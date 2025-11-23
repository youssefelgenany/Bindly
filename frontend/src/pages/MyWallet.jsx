import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';

const MyWallet = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);

  useEffect(() => {
    loadWalletData();
    
    // Listen for wallet refresh events (e.g., after cancellation)
    const handleWalletRefresh = () => {
      loadWalletData();
    };
    window.addEventListener('walletRefresh', handleWalletRefresh);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('walletRefresh', handleWalletRefresh);
    };
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/events/wallet/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.walletBalance || 0);
        setTransactions(data.transactions || []);
      } else {
        console.error('Failed to load wallet data');
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'refund':
        return '#059669'; // green
      case 'payment':
        return '#dc2626'; // red
      case 'topup':
        return '#2563eb'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'refund':
        return 'arrow_back';
      case 'payment':
        return 'arrow_forward';
      case 'topup':
        return 'add';
      default:
        return 'swap_horiz';
    }
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || user?.email || 'User';

  const userRole = user?.userType || 'User';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f6f7f8' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.5rem',
              fontWeight: '700',
              lineHeight: '1.25',
              margin: 0,
              cursor: 'pointer'
            }}>
              Bindly
            </h2>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1D3557',
              margin: 0
            }}>
              {displayName}
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              margin: 0
            }}>
              {userRole}
            </p>
          </div>
          <div 
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
          >
            {user?.profilePicturePath ? (
              <img
                src={`http://localhost:5000${user.profilePicturePath}`}
                alt="User profile"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#1D3557',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '150px'
              }}>
                {user?.userType === 'TA' && (
                  <Link
                    to="/wallet"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#1D3557',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      backgroundColor: '#eff6ff'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#eff6ff';
                    }}
                    onClick={() => setShowLogoutDropdown(false)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                      account_balance_wallet
                    </span>
                    My Wallet
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#1D3557',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    logout
                  </span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '2rem',
        paddingLeft: '6rem',
        paddingRight: '6rem'
      }}>
        {/* Page Title Banner */}
        <div style={{
          position: 'relative',
          height: '140px',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1
          }} />
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '2rem',
            fontWeight: '700',
            margin: 0,
            zIndex: 1
          }}>
            My Wallet
          </h1>
        </div>

        {/* Wallet Balance Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              color: '#1D3557',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              Current Balance
            </h2>
            <span className="material-symbols-outlined" style={{
              fontSize: '2rem',
              color: '#1e40af'
            }}>
              account_balance_wallet
            </span>
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1D3557'
          }}>
            {walletBalance.toFixed(2)} EGP
          </div>
        </div>

        {/* Transactions */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            color: '#1D3557',
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            marginTop: 0
          }}>
            Transaction History
          </h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: getTransactionColor(tx.type) + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: '1.25rem',
                        color: getTransactionColor(tx.type)
                      }}>
                        {getTransactionIcon(tx.type)}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1D3557'
                      }}>
                        {tx.description || `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} Transaction`}
                      </p>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: getTransactionColor(tx.type)
                  }}>
                    {tx.type === 'payment' ? '-' : '+'}{Math.abs(tx.amount).toFixed(2)} EGP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyWallet;

