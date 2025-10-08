// controllers/vendorRequestController.js
const VendorRequest = require('../models/vendorRequest');

// @desc View all vendor participation requests
// @route GET /api/vendor-requests
// @access Events Office / Admin
const getAllVendorRequests = async (req, res) => {
  try {
    const requests = await VendorRequest.find();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vendor requests", error });
  }
};

// @desc Get a specific vendor request by ID
// @route GET /api/vendor-requests/:id
// @access Events Office / Admin
const getVendorRequestById = async (req, res) => {
  try {
    const request = await VendorRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Vendor request not found" });
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vendor request", error });
  }
};

// @desc Accept or reject a vendor participation request
// @route PATCH /api/vendor-requests/:id/status
// @access Events Office / Admin
const updateVendorRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
  }

  try {
    const request = await VendorRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    res.status(200).json({
      message: `Vendor request ${status} successfully.`,
      updatedRequest: request,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating vendor request", error });
  }
};

module.exports = {
  getAllVendorRequests,
  getVendorRequestById,
  updateVendorRequestStatus,
};
