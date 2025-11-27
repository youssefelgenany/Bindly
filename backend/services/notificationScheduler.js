const cron = require('node-cron');
const { createEventReminders } = require('./notificationService');
const { sendWorkshopCompletionEmails } = require('../controllers/workshopCompletionController');

exports.initializeNotificationScheduler = () => {
  // Schedule event reminders to run every minute
  const reminderJob = cron.schedule('*/1 * * * *', async () => {
    await createEventReminders();
  });

  const runWorkshopCompletionJob = async (triggerSource = 'scheduled') => {
    console.log(`📧 [${triggerSource}] Checking for workshops that ended and need completion emails...`);
    try {
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          console.log(`📧 [${triggerSource}] Workshop completion emails result:`, data);
        },
        status: (code) => ({
          json: (data) => {
            console.error(`❌ [${triggerSource}] Workshop completion emails error:`, data);
          }
        })
      };

      await sendWorkshopCompletionEmails(mockReq, mockRes);
    } catch (error) {
      console.error(`❌ [${triggerSource}] Error in workshop completion email job:`, error);
    }
  };
  
  // Run job shortly after bootstrapping so recently finished workshops get processed
  runWorkshopCompletionJob('startup');
  
  // Schedule workshop completion emails to run every 15 minutes
  const completionEmailJob = cron.schedule('*/15 * * * *', async () => {
    await runWorkshopCompletionJob('scheduled');
  }, {
    scheduled: true,
    timezone: "Africa/Cairo"
  });
  
  console.log('✅ Notification scheduler initialized');
  console.log('   - Event reminders: Every minute');
  console.log('   - Workshop completion emails: Every 15 minutes');
  
  return { reminderJob, completionEmailJob };
};
