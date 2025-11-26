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
  
  // Schedule workshop completion emails to run daily at 9:00 AM
  // This checks for workshops that ended yesterday or earlier and sends completion emails
  let isCompletionEmailJobRunning = false;
  const completionEmailJob = cron.schedule('0 9 * * *', async () => {
    // Skip if previous execution is still running
    if (isCompletionEmailJobRunning) {
      console.log('⏭️  [Scheduled Task] Workshop completion email job skipped - previous execution still running');
      return;
    }
    
    isCompletionEmailJobRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('📧 [Scheduled Task] Checking for workshops that ended and need completion emails...');
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
      const executionTime = Date.now() - startTime;
      console.log(`✅ [Scheduled Task] Workshop completion email job completed in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [Scheduled Task] Error in workshop completion email job after ${executionTime}ms:`, error);
    } finally {
      isCompletionEmailJobRunning = false;
    }
  }, {
    scheduled: true,
    timezone: "Africa/Cairo"
  });
  
  console.log('✅ Notification scheduler initialized');
  console.log('   - Event reminders: Every minute');
  console.log('   - Workshop completion emails: Daily at 9:00 AM');
  
  return { reminderJob, completionEmailJob };
};
