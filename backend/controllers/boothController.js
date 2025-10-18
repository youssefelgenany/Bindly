const Booth = require('../models/boothModel');

// Get all standalone booths with optional filtering
const getAllBooths = async (req, res) => {
    try {
        const { q, location, status } = req.query;
        
        // Build query object
        const query = {};
        
        // Search query
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { location: { $regex: q, $options: 'i' } }
            ];
        }
        
        // Location filter
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        
        // Status filter
        if (status) {
            query.status = status;
        }
        
        // Only show upcoming and active booths to vendors
        query.status = { $in: ['upcoming', 'active'] };
        
        const booths = await Booth.find(query)
            .populate('createdBy', 'name email')
            .sort({ startDate: 1 })
            .lean();
            
        res.json({
            success: true,
            data: booths,
            count: booths.length
        });
        
    } catch (error) {
        console.error('Error fetching booths:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booths',
            error: error.message
        });
    }
};

// Get a single booth by ID
const getBoothById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const booth = await Booth.findById(id)
            .populate('createdBy', 'name email');
            
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }
        
        res.json({
            success: true,
            data: booth
        });
        
    } catch (error) {
        console.error('Error fetching booth:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booth',
            error: error.message
        });
    }
};

// Create a new booth (admin only)
const createBooth = async (req, res) => {
    try {
        const boothData = {
            ...req.body,
            createdBy: req.user.id
        };
        
        const booth = new Booth(boothData);
        await booth.save();
        
        await booth.populate('createdBy', 'name email');
        
        res.status(201).json({
            success: true,
            message: 'Booth created successfully',
            data: booth
        });
        
    } catch (error) {
        console.error('Error creating booth:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create booth',
            error: error.message
        });
    }
};

// Update a booth (admin only)
const updateBooth = async (req, res) => {
    try {
        const { id } = req.params;
        
        const booth = await Booth.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');
        
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Booth updated successfully',
            data: booth
        });
        
    } catch (error) {
        console.error('Error updating booth:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update booth',
            error: error.message
        });
    }
};

// Delete a booth (admin only)
const deleteBooth = async (req, res) => {
    try {
        const { id } = req.params;
        
        const booth = await Booth.findByIdAndDelete(id);
        
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Booth deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting booth:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete booth',
            error: error.message
        });
    }
};

module.exports = {
    getAllBooths,
    getBoothById,
    createBooth,
    updateBooth,
    deleteBooth
};
