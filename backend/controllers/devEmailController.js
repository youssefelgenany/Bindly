const Email = require('../models/EmailModel');

// Get all emails (development only)
exports.getAllEmails = async (req, res) => {
  try {
    const emails = await Email.find().sort({ sentAt: -1 });
    res.json({
      success: true,
      emails: emails
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emails',
      error: error.message
    });
  }
};

// Get email by ID
exports.getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await Email.findById(id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }
    
    // Mark as read
    email.isRead = true;
    await email.save();
    
    res.json({
      success: true,
      email: email
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email',
      error: error.message
    });
  }
};

// Delete email
exports.deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    await Email.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Email deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting email',
      error: error.message
    });
  }
};

// Clear all emails
exports.clearAllEmails = async (req, res) => {
  try {
    await Email.deleteMany({});
    
    res.json({
      success: true,
      message: 'All emails cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing emails',
      error: error.message
    });
  }
};
