const cron = require('node-cron');
const { createEventReminders } = require('./notificationService');

exports.initializeNotificationScheduler = () => {
  const job = cron.schedule('*/1 * * * *', async () => {
    await createEventReminders();
  });
  
  return job;
};
