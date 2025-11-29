import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsApiService } from '../api/eventsApi';

const ProfessorFavorites = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);

  const isActiveRoute = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutDropdown]);

  const loadFavoriteEvents = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const result = await eventsApiService.getFavoriteEvents();

      if (result.success) {
        const eventsList = Array.isArray(result.data.events) ? result.data.events : [];
        const mapped = eventsList
          .map(ev => ({
            id: ev._id || ev.id,
            title: ev.title,
            type: ev.type,
            status: ev.status || 'pending',
            location: ev.location,
            startDate: ev.startDate,
            endDate: ev.endDate,
            registrationDeadline: ev.registrationDeadline,
            description: ev.description,
            capacity: ev.capacity,
            price: ev.price,
            registeredCount: ev.registeredCount,
            agenda: ev.agenda,
            website: ev.website,
            budget: ev.budget,
            fundingSource: ev.fundingSource,
            extraResources: ev.extraResources,
            faculty: ev.faculty,
            professors: ev.professors,
            bannerFile: ev.bannerFile,
            creatorName: ev.creatorName,
            creatorRole: ev.creatorRole,
            vendors: ev.vendors || [],
            vendorRequests: ev.vendorRequests || []
          }))
          .filter(ev => {
            const type = (ev.type || '').toLowerCase();
            const validTypes = ['bazaar', 'trip', 'workshop', 'conference', 'booth'];
            return (
              validTypes.includes(type) &&
              ev.title &&
              ev.title.trim() !== '' &&
              ev.location &&
              ev.location.trim() !== ''
            );
          });
        setFavoriteEvents(mapped);
      } else {
        setFavoriteEvents([]);
        setError(result.message || 'Failed to fetch favorite events');
      }
    } catch (err) {
      setError(err?.message || 'Error loading favorite events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavoriteEvents();
  }, [loadFavoriteEvents]);

  const handleRemoveFavorite = async (eventId, e) => {
    e.stopPropagation();
    try {
      const result = await eventsApiService.removeFromFavorites(eventId);
      if (result.success) {
        setFavoriteEvents(prev => prev.filter(ev => String(ev.id) !== String(eventId)));
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      bazaar: '#F48FB1',
      trip: '#2196F3',
      workshop: '#607D8B',
      conference: '#795548',
      booth: '#3F51B5',
      other: '#757575'
    };
    return colors[type?.toLowerCase()] || colors.other;
  };

  const getEventTypeImage = (type) => {
    const imageMap = {
      conference: '/assets/images/conference-background.jpg',
      workshop: '/assets/images/workshop-background.jpg',
      bazaar: '/assets/images/bazaar-background.jpg',
      trip: '/assets/images/trip-background.png',
      booth: '/assets/images/booth-background.jpg'
    };
    return imageMap[type?.toLowerCase()] || null;
  };

  const getEventTypeFallbackText = (type) => {
    return type ? type.toUpperCase() : 'EVENT';
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

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Professor';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f6f7f8'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2.5rem',
        backgroundColor: '#1D3557'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#FFFFFF', flex: '0 0 auto' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={{
              color: '#FFFFFF',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0
            }}>
              Bindly
            </h2>
          </Link>
        </div>
        
        {/* Centered Navigation Menu */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '1.25rem'
        }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/dashboard') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/dashboard') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/dashboard') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              dashboard
            </span>
            Dashboard
          </Link>
          <Link
            to="/professor/all-events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/all-events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/all-events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/all-events') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              explore
            </span>
            Discover Events
          </Link>
          <Link
            to="/professor/events"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/professor/events') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/professor/events') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/professor/events') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              event
            </span>
            My Events
          </Link>
          <Link
            to="/gym"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/gym') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/gym') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/gym') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              fitness_center
            </span>
            Gym Sessions
          </Link>
          <Link
            to="/booth-polls"
            style={{
              textDecoration: 'none',
              color: isActiveRoute('/booth-polls') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: isActiveRoute('/booth-polls') ? '600' : '500',
              paddingBottom: '0.5rem',
              borderBottom: isActiveRoute('/booth-polls') ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              poll
            </span>
            Vendor Polls
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', flex: '0 0 auto' }}>
          {/* Heart Icon - Favorites */}
          <Link
            to="/professor/favorites"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              textDecoration: 'none',
              color: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: '1.5rem',
              color: '#FFFFFF'
            }}>
              favorite
            </span>
          </Link>

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
              Professor
            </p>
          </div>

          <div
            data-profile-dropdown
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              setShowLogoutDropdown(!showLogoutDropdown);
            }}
          >
            {user?.profilePicturePath ? (
              <img
                src={`http://localhost:5000${user.profilePicturePath}`}
                alt="User profile"
                style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }}
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
                {(user?.firstName?.[0] || user?.name?.[0] || 'P').toUpperCase()}
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
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setShowLogoutDropdown(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    account_balance_wallet
                  </span>
                  My Wallet
                </Link>
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

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          padding: '2rem 0',
          overflowY: 'auto',
          backgroundColor: '#f6f7f8'
        }}>
          <div style={{ marginLeft: '4rem', marginRight: '4rem' }}>
            <div style={{
              position: 'relative',
              height: '140px',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/assets/images/events-banner.jpeg)',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                filter: 'blur(2px)'
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(29, 53, 87, 0.75)'
              }} />
              <div style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '2rem 2.5rem',
                color: '#FFFFFF'
              }}>
                <h3 style={{
                  color: '#FFFFFF',
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}>
                  My Favorites
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  Your favorite events saved for later.
                </p>
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

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #1e40af',
                  borderRadius: '50%',
                  margin: '0 auto 1rem'
                }} className="spinner" />
                <p style={{ margin: 0, color: '#6b7280' }}>Loading favorite events...</p>
              </div>
            ) : favoriteEvents.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.75rem',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>❤️</div>
                <p style={{
                  color: '#374151',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  marginTop: 0
                }}>
                  No favorite events yet
                </p>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  marginTop: 0
                }}>
                  Start exploring events and add them to your favorites!
                </p>
                <Link
                  to="/professor/all-events"
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#1e40af',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'inline-block',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1e3a8a';
                    e.target.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#1e40af';
                    e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  Discover Events
                </Link>
              </div>
            ) : (
              <>
                <div style={{
                  marginBottom: '1.5rem',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {favoriteEvents.length} favorite event{favoriteEvents.length !== 1 ? 's' : ''}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {favoriteEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.75rem',
                        padding: 0,
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#1e40af';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      {getEventTypeImage(event.type) && (
                        <div style={{
                          width: '100%',
                          height: '180px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#f3f4f6',
                          flexShrink: 0
                        }}>
                          <img
                            src={getEventTypeImage(event.type)}
                            alt={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.style.backgroundColor = getEventTypeColor(event.type);
                              e.target.parentElement.style.display = 'flex';
                              e.target.parentElement.style.alignItems = 'center';
                              e.target.parentElement.style.justifyContent = 'center';
                              if (!e.target.parentElement.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text';
                                fallback.textContent = getEventTypeFallbackText(event.type);
                                fallback.style.color = '#FFFFFF';
                                fallback.style.fontSize = '1.5rem';
                                fallback.style.fontWeight = '700';
                                e.target.parentElement.appendChild(fallback);
                              }
                            }}
                          />
                          <button
                            onClick={(e) => handleRemoveFavorite(event.id, e)}
                            style={{
                              position: 'absolute',
                              top: '0.75rem',
                              right: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '2.5rem',
                              height: '2.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#ffffff';
                              e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '1.5rem',
                                color: '#ef4444'
                              }}
                            >
                              favorite
                            </span>
                          </button>
                        </div>
                      )}

                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '0.5rem',
                            backgroundColor: getEventTypeColor(event.type),
                            color: '#FFFFFF',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {event.type}
                          </div>
                        </div>

                        <h3 style={{
                          color: '#1D3557',
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          marginBottom: '0.75rem',
                          marginTop: 0,
                          lineHeight: '1.4'
                        }}>
                          {event.title}
                        </h3>

                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          flex: 1
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            fontSize: '0.8125rem',
                            color: '#6b7280'
                          }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '1.125rem',
                              color: '#9ca3af'
                            }}>
                              calendar_today
                            </span>
                            {formatDate(event.startDate)}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            fontSize: '0.8125rem',
                            color: '#6b7280'
                          }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '1.125rem',
                              color: '#9ca3af'
                            }}>
                              location_on
                            </span>
                            {event.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfessorFavorites;

