const API_BASE = 'http://localhost:5000/api';

export const vendorRequestApi = {
  // Get all vendor requests (for Events Office)
  getAll: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || data.msg || 'Failed to fetch vendor requests',
          error: data
        };
      }

      return {
        success: true,
        requests: data.requests || []
      };
    } catch (error) {
      console.error('Error fetching vendor requests:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch vendor requests',
        error: error
      };
    }
  },

  getPendingNotifications: async (limit = 10) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/pending/notifications?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to fetch pending notifications',
          error: data
        };
      }

      return {
        success: true,
        notifications: data.notifications || [],
        totalPending: data.totalPending ?? (data.notifications?.length || 0)
      };
    } catch (error) {
      console.error('Error fetching pending vendor notifications:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch pending notifications',
        error
      };
    }
  },

  // Get vendor requests for a specific event
  getByEvent: async (eventId, eventType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      // Get all vendor requests and filter by event
      const allRequests = await vendorRequestApi.getAll();
      if (!allRequests.success) {
        return allRequests;
      }

      const eventIdStr = String(eventId);
      const filtered = allRequests.requests.filter(req => {
        if (eventType === 'bazaar') {
          const bazaarId = req.bazaar ? String(req.bazaar) : null;
          const eventIdFromEvent = req.event && req.event._id ? String(req.event._id) : null;
          return bazaarId === eventIdStr || eventIdFromEvent === eventIdStr;
        } else if (eventType === 'booth') {
          const boothId = req.booth ? String(req.booth) : null;
          const eventIdFromEvent = req.event && req.event._id ? String(req.event._id) : null;
          return boothId === eventIdStr || eventIdFromEvent === eventIdStr;
        }
        return false;
      });

      return {
        success: true,
        requests: filtered
      };
    } catch (error) {
      console.error('Error fetching vendor requests for event:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch vendor requests for event',
        error: error
      };
    }
  },

  // Update vendor request status (accept/reject)
  updateStatus: async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      if (!['accepted', 'rejected'].includes(status)) {
        return {
          success: false,
          message: "Status must be 'accepted' or 'rejected'"
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || data.msg || 'Failed to update vendor request status',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || `Vendor request ${status} successfully.`,
        updatedRequest: data.updatedRequest
      };
    } catch (error) {
      console.error('Error updating vendor request status:', error);
      return {
        success: false,
        message: error.message || 'Failed to update vendor request status',
        error: error
      };
    }
  },

  // Upload individual IDs for a vendor request
  uploadIndividualIds: async (requestId, files) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      if (!files || files.length === 0) {
        return {
          success: false,
          message: 'Please select at least one file to upload.'
        };
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('individualIds', file);
      });

      const response = await fetch(`${API_BASE}/vendor-requests/${requestId}/upload-ids`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to upload individual IDs',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || 'Individual IDs uploaded successfully',
        vendorRequest: data.vendorRequest
      };
    } catch (error) {
      console.error('Error uploading individual IDs:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload individual IDs',
        error: error
      };
    }
  },

  // Poll functions
  // Create a booth poll (Events Office/Admin)
  createPoll: async (pollData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pollData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to create poll',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || 'Poll created successfully',
        poll: data.poll
      };
    } catch (error) {
      console.error('Error creating poll:', error);
      return {
        success: false,
        message: error.message || 'Failed to create poll',
        error: error
      };
    }
  },

  // Get all polls (Events Office/Admin)
  getAllPolls: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to fetch polls',
          error: data
        };
      }

      return {
        success: true,
        polls: data.polls || []
      };
    } catch (error) {
      console.error('Error fetching polls:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch polls',
        error: error
      };
    }
  },

  // Get public polls (Students/Staff/TA/Professor)
  getPublicPolls: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to fetch polls',
          error: data
        };
      }

      return {
        success: true,
        polls: data.polls || []
      };
    } catch (error) {
      console.error('Error fetching public polls:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch polls',
        error: error
      };
    }
  },

  // Vote in a poll (Students/Staff/TA/Professor)
  voteInPoll: async (pollId, optionIndex) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionIndex })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to vote',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || 'Vote recorded successfully'
      };
    } catch (error) {
      console.error('Error voting in poll:', error);
      return {
        success: false,
        message: error.message || 'Failed to vote',
        error: error
      };
    }
  },

  // Close a poll (Events Office/Admin)
  closePoll: async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls/${pollId}/close`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to close poll',
          error: data
        };
      }

      return {
        success: true,
        message: data.message || 'Poll closed successfully',
        poll: data.poll
      };
    } catch (error) {
      console.error('Error closing poll:', error);
      return {
        success: false,
        message: error.message || 'Failed to close poll',
        error: error
      };
    }
  },

  // Get poll results (Events Office/Admin)
  getPollResults: async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found. Please log in again.'
        };
      }

      const response = await fetch(`${API_BASE}/vendor-requests/polls/${pollId}/results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return {
            success: false,
            message: 'Invalid/expired token. Please log in again.',
            requiresLogin: true
          };
        }

        return {
          success: false,
          message: data.message || data.error || 'Failed to fetch poll results',
          error: data
        };
      }

      return {
        success: true,
        poll: data.poll
      };
    } catch (error) {
      console.error('Error fetching poll results:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch poll results',
        error: error
      };
    }
  }
};

export default vendorRequestApi;

