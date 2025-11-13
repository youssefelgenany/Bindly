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
  }
};

export default vendorRequestApi;

