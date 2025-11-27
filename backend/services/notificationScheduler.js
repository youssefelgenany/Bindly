const cron = require('node-cron');
const { createEventReminders } = require('./notificationService');
const { sendWorkshopCompletionEmails } = require('../controllers/workshopCompletionController');

// Lock to prevent overlapping executions
let isReminderJobRunning = false;

exports.initializeNotificationScheduler = () => {
  // Schedule event reminders to run every minute
  // Using timezone and preventing overlapping executions
  const reminderJob = cron.schedule('*/1 * * * *', async () => {
    // Skip if previous execution is still running
    if (isReminderJobRunning) {
      console.log('⏭️  [Scheduled Task] Event reminder job skipped - previous execution still running');
      return;
    }
    
    isReminderJobRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('⏰ [Scheduled Task] Starting event reminder job...');
      await createEventReminders();
      const executionTime = Date.now() - startTime;
      console.log(`✅ [Scheduled Task] Event reminder job completed in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [Scheduled Task] Error in event reminder job after ${executionTime}ms:`, error);
    } finally {
      isReminderJobRunning = false;
    }
  }, {
    scheduled: true,
    timezone: "Africa/Cairo"
  });
  
  // Workshop completion email job function
  const runWorkshopCompletionJob = async (triggerSource) => {
    console.log(`📧 [Scheduled Task] Checking for workshops that ended and need completion emails (trigger: ${triggerSource})...`);
    const startTime = Date.now();
    try {
      // Create a mock request/response object for the controller
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
      const executionTime = Date.now() - startTime;
      console.log(`✅ [Scheduled Task] Workshop completion email job completed in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [Scheduled Task] Error in workshop completion email job after ${executionTime}ms:`, error);
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
