import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EventsOfficeNotificationBell from './EventsOfficeNotificationBell';
import axios from 'axios';

const EventsOfficeVendors = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [documentPreview, setDocumentPreview] = useState({
    visible: false,
    url: '',
    type: '',
    title: ''
  });

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadVendors = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/vendor', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.success) {
        setVendors(response.data.vendors || []);
      } else {
        setVendors([]);
        setError('Failed to load vendors');
      }
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError(err.response?.data?.message || 'Failed to load vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    return () => {
      if (documentPreview.url) {
        window.URL.revokeObjectURL(documentPreview.url);
      }
    };
  }, [documentPreview.url]);

  const toggleRow = (vendorId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId);
      } else {
        newSet.add(vendorId);
      }
      return newSet;
    });
  };

  const closeDocumentPreview = () => {
    if (documentPreview.url) {
      window.URL.revokeObjectURL(documentPreview.url);
    }
    setDocumentPreview({
      visible: false,
      url: '',
      type: '',
      title: ''
    });
  };

  const handleViewDocument = async (vendorId, documentType) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/vendor/${vendorId}/documents/${documentType}`;
      
      // Fetch document with authorization header
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const vendor = vendors.find(v => (v.id || v._id) === vendorId);
        const vendorName = vendor?.companyName || 'Vendor Document';
        const contentType = blob.type || '';
        const type = contentType.includes('pdf') ? 'pdf' : 'image';

        // Revoke previous preview URL before setting a new one
        if (documentPreview.url) {
          window.URL.revokeObjectURL(documentPreview.url);
        }

        setDocumentPreview({
          visible: true,
          url: blobUrl,
          type,
          title: `${vendorName} — ${documentType === 'logo' ? 'Logo' : 'Tax Card'}`
        });
      } else {
        alert('Failed to load document');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (vendorId, documentType) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/vendor/${vendorId}/documents/${documentType}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Get content type from response headers
        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        
        // Determine file extension from content type
        let extension = '';
        if (contentType.includes('pdf')) {
          extension = 'pdf';
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          extension = 'jpg';
        } else if (contentType.includes('png')) {
          extension = 'png';
        } else if (contentType.includes('gif')) {
          extension = 'gif';
        } else if (contentType.includes('webp')) {
          extension = 'webp';
        } else {
          // Fallback based on document type
          extension = documentType === 'logo' ? 'png' : 'pdf';
        }
        
        // Create a new blob with the correct MIME type
        const typedBlob = new Blob([blob], { type: contentType || blob.type });
        const blobUrl = window.URL.createObjectURL(typedBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const vendor = vendors.find(v => (v.id || v._id) === vendorId);
        const companyName = vendor?.companyName || 'vendor';
        const safeName = companyName.replace(/[^a-z0-9]/gi, '_');
        link.download = `${safeName}_${documentType}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up after a short delay to ensure download starts
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Events Office';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f8f6f6'
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: sidebarOpen ? '16rem' : '0',
        flexShrink: 0,
        backgroundColor: '#1D3557',
        padding: sidebarOpen ? '1.5rem' : '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'width 0.3s ease, padding 0.3s ease',
        minWidth: sidebarOpen ? '16rem' : '0'
      }}>
        {/* Top Section - Logo and Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Logo and Branding */}
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#457B9D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Events Office
                </h1>
                <p style={{
                  color: 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  University Portal
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {sidebarOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/event-office"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office') ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
                  dashboard
                </span>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </Link>

              <Link
                to="/event-office/events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/events') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/events')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  explore
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/events') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/events') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Discover Events
                </p>
              </Link>

              <Link
                to="/event-office/vendors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/vendors') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/vendors')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  storefront
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/vendors') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/vendors') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Vendors
                </p>
              </Link>

              <Link
                to="/event-office/loyalty-partners"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/loyalty-partners') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/loyalty-partners')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  card_giftcard
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/loyalty-partners') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/loyalty-partners') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Loyalty Partners
                </p>
              </Link>

              <Link
                to="/event-office/workshops"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/workshops') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/workshops')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  school
                </span>
                <p style={{
                  color: isActiveRoute('/event-office/workshops') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: isActiveRoute('/event-office/workshops') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                  Professor Workshops
                </p>
              </Link>

              <Link
                to="/event-office/platform-booth-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/event-office/platform-booth-requests') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/event-office/platform-booth-requests')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  location_on
                </span>
                {sidebarOpen && (
                <p style={{
                    color: isActiveRoute('/event-office/platform-booth-requests') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/event-office/platform-booth-requests') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                    Platform Booths
                </p>
                )}
              </Link>

              <Link
                to="/gym-schedule"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActiveRoute('/gym-schedule') ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute('/gym-schedule')) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                  color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)', 
                  fontSize: '1.25rem' 
                }}>
                  calendar_month
                </span>
                {sidebarOpen && (
                <p style={{
                    color: isActiveRoute('/gym-schedule') ? '#FFFFFF' : 'rgba(241, 250, 238, 0.7)',
                  fontSize: '0.875rem',
                    fontWeight: isActiveRoute('/gym-schedule') ? '700' : '500',
                  lineHeight: 'normal',
                  margin: 0
                }}>
                    View Gym Sessions
                  </p>
                )}
              </Link>
            </nav>
          )}
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'rgba(241, 250, 238, 0.7)', fontSize: '1.25rem' }}>
              logout
            </span>
            {sidebarOpen && (
              <p style={{
                color: 'rgba(241, 250, 238, 0.7)',
                fontSize: '0.875rem',
                fontWeight: '500',
                lineHeight: 'normal',
                margin: 0
              }}>
                Logout
              </p>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f8f6f6'
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2.5rem',
          backgroundColor: '#1D3557',
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? '16rem' : '0',
          width: sidebarOpen ? 'calc(100% - 16rem)' : '100%',
          zIndex: 100,
          transition: 'left 0.3s ease, width 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                menu
              </span>
            </button>
            <Link to="/event-office" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{
                color: '#FFFFFF',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell */}
            <EventsOfficeNotificationBell />
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#FFFFFF',
                margin: 0
              }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0
              }}>
                Events Office
              </p>
            </div>
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
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D3557',
                fontWeight: '600'
              }}>
                {(user?.firstName?.[0] || user?.name?.[0] || 'E').toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          paddingLeft: '6rem',
          paddingRight: '6rem',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8',
          marginTop: '73px'
        }}>
          {/* Page Title Banner */}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(30px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div style={{
            position: 'relative',
            height: '160px',
            borderRadius: '1rem',
            overflow: 'hidden',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/images/bazaar-background.jpg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              filter: 'blur(2px)',
              animation: 'pulse 4s ease-in-out infinite'
            }}></div>
            {/* Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(29, 53, 87, 0.75)'
            }}></div>
            {/* Floating Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '50px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              animation: 'float 3s ease-in-out infinite',
              zIndex: 5
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '30px',
              right: '100px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              animation: 'float 2.5s ease-in-out infinite 0.5s',
              zIndex: 5
            }}></div>
            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '2.5rem',
              color: '#FFFFFF'
            }}>
              <h1 style={{
                color: '#FFFFFF',
                fontSize: '2rem',
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem',
                animation: 'slideInRight 0.8s ease-out'
              }}>
                Vendors
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '1rem',
                margin: 0,
                animation: 'slideInRight 0.8s ease-out 0.2s both'
              }}>
                View and manage all registered vendors
              </p>
            </div>
          </div>

          {/* Vendors Table */}
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '3rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ color: '#6b7280' }}>Loading vendors...</div>
            </div>
          ) : error ? (
            <div style={{
              padding: '2rem',
              backgroundColor: '#fee2e2',
              borderRadius: '0.5rem',
              color: '#991b1b',
              textAlign: 'center'
            }}>
              {error}
            </div>
          ) : vendors.length === 0 ? (
            <div style={{
              padding: '3rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No vendors found
            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <th style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Company Name
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Email
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Documents
                    </th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => {
                    const vendorId = vendor.id || vendor._id;
                    const isExpanded = expandedRows.has(vendorId);
                    const hasLogo = vendor.hasLogo || vendor.vendorLogoPath;
                    const hasTaxCard = vendor.hasTaxCard || vendor.vendorTaxCardPath;
                    
                    return (
                      <React.Fragment key={vendorId}>
                        <tr style={{
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleRow(vendorId)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                        >
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#111827',
                            fontWeight: '500'
                          }}>
                            {vendor.companyName || 'N/A'}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {vendor.email}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {hasLogo && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  Logo
                                </span>
                              )}
                              {hasTaxCard && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  backgroundColor: '#d1fae5',
                                  color: '#065f46'
                                }}>
                                  Tax Card
                                </span>
                              )}
                              {!hasLogo && !hasTaxCard && (
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>No documents</span>
                              )}
                            </div>
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'center'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(vendorId);
                              }}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ 
                                fontSize: '1.25rem',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }}>
                                expand_more
                              </span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="4" style={{
                              padding: '1.5rem',
                              backgroundColor: '#f9fafb',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                              }}>
                                <h4 style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: 0
                                }}>
                                  Documents
                                </h4>
                                <div style={{
                                  display: 'flex',
                                  gap: '1rem',
                                  flexWrap: 'wrap'
                                }}>
                                  {hasLogo && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.75rem',
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '0.5rem',
                                      border: '1px solid #e5e7eb'
                                    }}>
                                      <span className="material-symbols-outlined" style={{ 
                                        fontSize: '1.25rem',
                                        color: '#3b82f6'
                                      }}>
                                        image
                                      </span>
                                      <span style={{
                                        fontSize: '0.875rem',
                                        color: '#111827',
                                        fontWeight: '500'
                                      }}>
                                        Logo
                                      </span>
                                      <button
                                        onClick={() => handleViewDocument(vendorId, 'logo')}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          borderRadius: '0.375rem',
                                          border: '1px solid #3b82f6',
                                          backgroundColor: 'transparent',
                                          color: '#3b82f6',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          marginLeft: '0.5rem'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#eff6ff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleDownloadDocument(vendorId, 'logo')}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          borderRadius: '0.375rem',
                                          border: 'none',
                                          backgroundColor: '#3b82f6',
                                          color: '#FFFFFF',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#2563eb';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = '#3b82f6';
                                        }}
                                      >
                                        Download
                                      </button>
                                    </div>
                                  )}
                                  {hasTaxCard && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.75rem',
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '0.5rem',
                                      border: '1px solid #e5e7eb'
                                    }}>
                                      <span className="material-symbols-outlined" style={{ 
                                        fontSize: '1.25rem',
                                        color: '#10b981'
                                      }}>
                                        description
                                      </span>
                                      <span style={{
                                        fontSize: '0.875rem',
                                        color: '#111827',
                                        fontWeight: '500'
                                      }}>
                                        Tax Card
                                      </span>
                                      <button
                                        onClick={() => handleViewDocument(vendorId, 'tax-card')}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          borderRadius: '0.375rem',
                                          border: '1px solid #10b981',
                                          backgroundColor: 'transparent',
                                          color: '#10b981',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          marginLeft: '0.5rem'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#ecfdf5';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleDownloadDocument(vendorId, 'tax-card')}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          borderRadius: '0.375rem',
                                          border: 'none',
                                          backgroundColor: '#10b981',
                                          color: '#FFFFFF',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#059669';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = '#10b981';
                                        }}
                                      >
                                        Download
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {documentPreview.visible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
          onClick={closeDocumentPreview}
        >
          <div
            style={{
              width: '65%',
              maxWidth: '720px',
              backgroundColor: '#fff',
              borderRadius: '0.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{documentPreview.title}</h3>
              <button
                onClick={closeDocumentPreview}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#6b7280'
                }}
                aria-label="Close document preview"
              >
                ×
              </button>
            </div>
            <div style={{
              padding: '1rem',
              minHeight: '50vh',
              maxHeight: '75vh',
              backgroundColor: '#f9fafb'
            }}>
              {documentPreview.type === 'pdf' ? (
                <iframe
                  src={documentPreview.url}
                  title={documentPreview.title}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fff'
                  }}
                />
              ) : (
                <img
                  src={documentPreview.url}
                  alt={documentPreview.title}
                  style={{
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fff'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsOfficeVendors;

