const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./models/eventModel');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const events = await Event.find({ endDate: { $exists: true, $ne: null } }, 'title endDate archived').limit(5);
  console.log('Events with endDate:');
  events.forEach(event => {
    console.log('- ' + event.title + ': endDate=' + event.endDate + ' (type: ' + typeof event.endDate + '), archived=' + event.archived);
    const now = new Date();
    console.log('  Is past: ' + (event.endDate < now));
  });
  await mongoose.disconnect();
}
check();