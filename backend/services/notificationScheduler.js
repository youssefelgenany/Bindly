const cron = require('node-cron');
const { createEventReminders } = require('./notificationService');
const { sendWorkshopCompletionEmails } = require('../controllers/workshopCompletionController');

exports.initializeNotificationScheduler = () => {
  // Schedule event reminders to run every minute
  const reminderJob = cron.schedule('*/1 * * * *', async () => {
    await createEventReminders();
  });
  
  // Schedule workshop completion emails to run daily at 9:00 AM
  // This checks for workshops that ended yesterday or earlier and sends completion emails
  const completionEmailJob = cron.schedule('0 9 * * *', async () => {
    console.log('📧 [Scheduled Task] Checking for workshops that ended and need completion emails...');
    try {
      // Create a mock request/response object for the controller
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          console.log('📧 [Scheduled Task] Workshop completion emails result:', data);
        },
        status: (code) => ({
          json: (data) => {
            console.error('❌ [Scheduled Task] Workshop completion emails error:', data);
          }
        })
      };
      
      await sendWorkshopCompletionEmails(mockReq, mockRes);
    } catch (error) {
      console.error('❌ [Scheduled Task] Error in workshop completion email job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Cairo" // Adjust timezone as needed
  });
  
  console.log('✅ Notification scheduler initialized');
  console.log('   - Event reminders: Every minute');
  console.log('   - Workshop completion emails: Daily at 9:00 AM');
  
  return { reminderJob, completionEmailJob };
};
