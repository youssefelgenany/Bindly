const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');

/**
 * Clean up all registrations for a user
 * @param {String} userId - User ID (for Registration model)
 * @param {String} userEmail - User email (for StudentRegistration model)
 * @returns {Object} - { registrationCount, studentRegistrationCount }
 */
async function cleanupUserRegistrations(userId, userEmail) {
  const result = {
    registrationCount: 0,
    studentRegistrationCount: 0
  };

  try {
    // Delete registrations from Registration model (by user ID)
    if (userId) {
      const registrationResult = await Registration.deleteMany({ user: userId });
      result.registrationCount = registrationResult.deletedCount;
      if (result.registrationCount > 0) {
        console.log('🗑️ Cleaned up', result.registrationCount, 'registrations from Registration model for user:', userId);
      }
    }

    // Delete registrations from StudentRegistration model (by email)
    // This is critical - even if userId is null, we should clean up by email
    if (userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const studentRegResult = await StudentRegistration.deleteMany({ 
        studentEmail: normalizedEmail 
      });
      result.studentRegistrationCount = studentRegResult.deletedCount;
      if (result.studentRegistrationCount > 0) {
        console.log('🗑️ Cleaned up', result.studentRegistrationCount, 'registrations from StudentRegistration model for email:', normalizedEmail);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Error cleaning up user registrations:', error);
    throw error;
  }
}

module.exports = { cleanupUserRegistrations };

