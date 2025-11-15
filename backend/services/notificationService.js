const Notification = require('../models/notificationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const Event = require('../models/eventModel');
const Workshop = require('../models/Workshop');
const Trip = require('../models/tripModel');
const GymSession = require('../models/gymSessionModel');
const User = require('../models/userModel');

exports.createEventReminders = async () => {
  try {
    const now = new Date();
    
    const oneDayBefore = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const oneDayAfter = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    const oneHourBefore = new Date(now.getTime() + 50 * 60 * 1000);
    const oneHourAfter = new Date(now.getTime() + 70 * 60 * 1000);
    
    // Events
    const eventsIn1Day = await Event.find({
      startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
    });
    
    const eventsIn1Hour = await Event.find({
      startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
    });
    
    // Workshops
    const workshopsIn1Day = await Workshop.find({
      startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
    });
    
    const workshopsIn1Hour = await Workshop.find({
      startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
    });
    
    // Trips
    const tripsIn1Day = await Trip.find({
      startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
    });
    
    const tripsIn1Hour = await Trip.find({
      startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
    });
    
    // Gym Sessions
    const gymSessionsIn1Day = await GymSession.find({
      startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
    });
    
    const gymSessionsIn1Hour = await GymSession.find({
      startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
    });
    
    await processEventReminders(eventsIn1Day, '1 day');
    await processEventReminders(eventsIn1Hour, '1 hour');
    await processWorkshopReminders(workshopsIn1Day, '1 day');
    await processWorkshopReminders(workshopsIn1Hour, '1 hour');
    await processTripReminders(tripsIn1Day, '1 day');
    await processTripReminders(tripsIn1Hour, '1 hour');
    await processGymSessionReminders(gymSessionsIn1Day, '1 day');
    await processGymSessionReminders(gymSessionsIn1Hour, '1 hour');
    
  } catch (error) {
    console.error('Error in createEventReminders:', error);
  }
};

async function processEventReminders(events, timeframe) {
  for (const event of events) {
    try {
      const registrations = await StudentRegistration.find({
        event: event._id
      });
      
      for (const registration of registrations) {
        const existingNotification = await Notification.findOne({
          type: 'event_reminder',
          'metadata.studentEmail': registration.studentEmail,
          'metadata.timeframe': timeframe,
          'metadata.eventId': event._id.toString()
        });
        
        if (!existingNotification) {
          const user = await User.findOne({ email: registration.studentEmail });
          
          if (user) {
            await Notification.create({
              recipient: user._id,
              type: 'event_reminder',
              title: `Reminder: ${event.title} starts in ${timeframe}`,
              message: `The event "${event.title}" will start in ${timeframe} at ${event.location}`,
              relatedEvent: event._id,
              priority: timeframe === '1 hour' ? 'high' : 'medium',
              metadata: {
                eventTitle: event.title,
                eventDate: event.startDate,
                location: event.location,
                studentEmail: registration.studentEmail,
                timeframe: timeframe,
                eventId: event._id.toString()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing event ${event._id}:`, error);
    }
  }
}

async function processWorkshopReminders(workshops, timeframe) {
  for (const workshop of workshops) {
    try {
      const registrations = await StudentRegistration.find({
        event: workshop._id
      });
      
      for (const registration of registrations) {
        const existingNotification = await Notification.findOne({
          type: 'workshop_reminder',
          'metadata.studentEmail': registration.studentEmail,
          'metadata.timeframe': timeframe,
          'metadata.workshopId': workshop._id.toString()
        });
        
        if (!existingNotification) {
          const user = await User.findOne({ email: registration.studentEmail });
          
          if (user) {
            await Notification.create({
              recipient: user._id,
              type: 'workshop_reminder',
              title: `Reminder: ${workshop.workshopName} starts in ${timeframe}`,
              message: `The workshop "${workshop.workshopName}" will start in ${timeframe} at ${workshop.location}`,
              relatedWorkshop: workshop._id,
              priority: timeframe === '1 hour' ? 'high' : 'medium',
              metadata: {
                workshopName: workshop.workshopName,
                workshopDate: workshop.startDate,
                location: workshop.location,
                studentEmail: registration.studentEmail,
                timeframe: timeframe,
                workshopId: workshop._id.toString()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing workshop ${workshop._id}:`, error);
    }
  }
}

async function processTripReminders(trips, timeframe) {
  for (const trip of trips) {
    try {
      const registrations = await StudentRegistration.find({
        event: trip._id
      });
      
      for (const registration of registrations) {
        const existingNotification = await Notification.findOne({
          type: 'trip_reminder',
          'metadata.studentEmail': registration.studentEmail,
          'metadata.timeframe': timeframe,
          'metadata.tripId': trip._id.toString()
        });
        
        if (!existingNotification) {
          const user = await User.findOne({ email: registration.studentEmail });
          
          if (user) {
            await Notification.create({
              recipient: user._id,
              type: 'trip_reminder',
              title: `Reminder: ${trip.name} starts in ${timeframe}`,
              message: `The trip "${trip.name}" will start in ${timeframe} at ${trip.location}`,
              priority: timeframe === '1 hour' ? 'high' : 'medium',
              metadata: {
                tripName: trip.name,
                tripDate: trip.startDate,
                location: trip.location,
                studentEmail: registration.studentEmail,
                timeframe: timeframe,
                tripId: trip._id.toString()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing trip ${trip._id}:`, error);
    }
  }
}

async function processGymSessionReminders(gymSessions, timeframe) {
  for (const gymSession of gymSessions) {
    try {
      const registrations = await StudentRegistration.find({
        event: gymSession._id
      });
      
      for (const registration of registrations) {
        const existingNotification = await Notification.findOne({
          type: 'gym_session_reminder',
          'metadata.studentEmail': registration.studentEmail,
          'metadata.timeframe': timeframe,
          'metadata.gymSessionId': gymSession._id.toString()
        });
        
        if (!existingNotification) {
          const user = await User.findOne({ email: registration.studentEmail });
          
          if (user) {
            await Notification.create({
              recipient: user._id,
              type: 'gym_session_reminder',
              title: `Reminder: Gym session starts in ${timeframe}`,
              message: `Your gym session will start in ${timeframe}`,
              relatedGymSession: gymSession._id,
              priority: timeframe === '1 hour' ? 'high' : 'medium',
              metadata: {
                gymSessionDate: gymSession.startDate,
                studentEmail: registration.studentEmail,
                timeframe: timeframe,
                gymSessionId: gymSession._id.toString()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing gym session ${gymSession._id}:`, error);
    }
  }
}

exports.getUserNotifications = async (userId, options = {}) => {
  const { limit = 50, skip = 0, unreadOnly = false } = options;
  
  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('relatedWorkshop', 'workshopName startDate location')
    .populate('relatedEvent', 'title startDate location')
    .populate('relatedGymSession', 'name startDate');
  
  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ 
    recipient: userId, 
    isRead: false 
  });
  
  return { notifications, total, unreadCount, limit, skip };
};

// Notify all eligible users when a new event is created
exports.notifyNewEventCreated = async (event) => {
  try {
    // Find all users (Students, Staff, TAs, Professors, Events Office)
    const allUsers = await User.find({
      userType: { $in: ['Student', 'Staff', 'TA', 'Professor', 'event_office'] }
    });
    
    for (const user of allUsers) {
      // Check if notification already exists for this user and event
      const existingNotification = await Notification.findOne({
        recipient: user._id,
        type: 'event_announcement',
        'metadata.eventId': event._id.toString()
      });
      
      if (!existingNotification) {
        await Notification.create({
          recipient: user._id,
          type: 'event_announcement',
          title: `New Event: ${event.title}`,
          message: `A new event "${event.title}" has been added on ${new Date(event.startDate).toLocaleDateString()} at ${event.location}`,
          relatedEvent: event._id,
          priority: 'medium',
          metadata: {
            eventTitle: event.title,
            eventDate: event.startDate,
            eventType: event.type,
            location: event.location,
            description: event.description,
            eventId: event._id.toString(),
            createdBy: event.createdBy?.toString(),
            createdAt: new Date()
          }
        });
      }
    }
  } catch (error) {
    console.error('Error notifying new event created:', error);
  }
};

exports.notifyWorkshopSubmitted = async (event, submitter) => {
  try {
    // Find all events office users
    const eventsOfficeUsers = await User.find({ userType: 'event_office' });
    
    for (const user of eventsOfficeUsers) {
      await Notification.create({
        recipient: user._id,
        type: 'workshop_submission',
        title: `New Workshop Request: ${event.title}`,
        message: `Dr. ${submitter.firstName} ${submitter.lastName} has submitted a workshop request: "${event.title}" scheduled for ${new Date(event.startDate).toLocaleDateString()}`,
        relatedEvent: event._id,
        priority: 'high',
        metadata: {
          eventTitle: event.title,
          eventDate: event.startDate,
          eventType: event.type,
          location: event.location,
          description: event.description,
          eventId: event._id.toString(),
          submittedBy: submitter._id.toString(),
          submitterName: `${submitter.firstName} ${submitter.lastName}`,
          submitterEmail: submitter.email,
          createdAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error notifying workshop submission:', error);
  }
};
