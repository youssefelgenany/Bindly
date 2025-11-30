const Notification = require('../models/notificationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const Event = require('../models/eventModel');
const Trip = require('../models/tripModel');
const GymSession = require('../models/gymSessionModel');
const User = require('../models/userModel');

exports.createEventReminders = async () => {
  try {
    const now = new Date();
    
    const oneDayBefore = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const oneDayAfter = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    const oneHourBefore = new Date(now.getTime() + 59 * 60 * 1000);
    const oneHourAfter = new Date(now.getTime() + 61 * 60 * 1000);
    
    // Run all database queries in parallel for better performance
    const [
      eventsIn1Day,
      eventsIn1Hour,
      workshopsIn1Day,
      workshopsIn1Hour,
      tripsIn1Day,
      tripsIn1Hour,
      gymSessionsIn1Day,
      gymSessionsIn1Hour
    ] = await Promise.all([
      Event.find({
        startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
      }),
      Event.find({
        startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
      }),
      Event.find({
        type: 'workshop',
        startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
      }),
      Event.find({
        type: 'workshop',
        startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
      }),
      Trip.find({
        startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
      }),
      Trip.find({
        startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
      }),
      GymSession.find({
        startDate: { $gte: oneDayBefore, $lte: oneDayAfter }
      }),
      GymSession.find({
        startDate: { $gte: oneHourBefore, $lte: oneHourAfter }
      })
    ]);
    
    // Process all reminders in parallel since they're independent
    await Promise.all([
      processEventReminders(eventsIn1Day, '1 day'),
      processEventReminders(eventsIn1Hour, '1 hour'),
      processWorkshopReminders(workshopsIn1Day, '1 day'),
      processWorkshopReminders(workshopsIn1Hour, '1 hour'),
      processTripReminders(tripsIn1Day, '1 day'),
      processTripReminders(tripsIn1Hour, '1 hour'),
      processGymSessionReminders(gymSessionsIn1Day, '1 day'),
      processGymSessionReminders(gymSessionsIn1Hour, '1 hour')
    ]);
    
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
        // Use userId if available, otherwise fallback to email lookup
        let userId = registration.student;
        if (!userId && registration.studentEmail) {
          const user = await User.findOne({ email: registration.studentEmail });
          if (user) {
            userId = user._id;
            // Update registration to include userId
            await StudentRegistration.findByIdAndUpdate(registration._id, { student: userId });
          }
        }
        
        if (!userId) continue; // Skip if no user found
        
        const existingNotification = await Notification.findOne({
          type: 'event_reminder',
          recipient: userId,
          'metadata.timeframe': timeframe,
          'metadata.eventId': event._id.toString()
        });
        
        if (!existingNotification) {
          await Notification.create({
            recipient: userId,
            type: 'event_reminder',
            title: `Reminder: ${event.title} starts in ${timeframe}`,
            message: `The event "${event.title}" will start in ${timeframe} at ${event.location}`,
            relatedEvent: event._id,
            priority: timeframe === '1 hour' ? 'high' : 'medium',
            metadata: {
              eventTitle: event.title,
              eventDate: event.startDate,
              location: event.location,
              timeframe: timeframe,
              eventId: event._id.toString()
            }
          });
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
        // Use userId if available, otherwise fallback to email lookup
        let userId = registration.student;
        if (!userId && registration.studentEmail) {
          const user = await User.findOne({ email: registration.studentEmail });
          if (user) {
            userId = user._id;
            // Update registration to include userId
            await StudentRegistration.findByIdAndUpdate(registration._id, { student: userId });
          }
        }
        
        if (!userId) continue; // Skip if no user found
        
        const existingNotification = await Notification.findOne({
          type: 'workshop_reminder',
          recipient: userId,
          'metadata.timeframe': timeframe,
          'metadata.workshopId': workshop._id.toString()
        });
        
        if (!existingNotification) {
          await Notification.create({
            recipient: userId,
            type: 'workshop_reminder',
            title: `Reminder: ${workshop.title} starts in ${timeframe}`,
            message: `The workshop "${workshop.title}" will start in ${timeframe} at ${workshop.location}`,
            relatedEvent: workshop._id,
            priority: timeframe === '1 hour' ? 'high' : 'medium',
            metadata: {
              workshopName: workshop.title,
              workshopDate: workshop.startDate,
              location: workshop.location,
              timeframe: timeframe,
              workshopId: workshop._id.toString()
            }
          });
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
        // Use userId if available, otherwise fallback to email lookup
        let userId = registration.student;
        if (!userId && registration.studentEmail) {
          const user = await User.findOne({ email: registration.studentEmail });
          if (user) {
            userId = user._id;
            // Update registration to include userId
            await StudentRegistration.findByIdAndUpdate(registration._id, { student: userId });
          }
        }
        
        if (!userId) continue; // Skip if no user found
        
        const existingNotification = await Notification.findOne({
          type: 'trip_reminder',
          recipient: userId,
          'metadata.timeframe': timeframe,
          'metadata.tripId': trip._id.toString()
        });
        
        if (!existingNotification) {
          await Notification.create({
            recipient: userId,
            type: 'trip_reminder',
            title: `Reminder: ${trip.name} starts in ${timeframe}`,
            message: `The trip "${trip.name}" will start in ${timeframe} at ${trip.location}`,
            priority: timeframe === '1 hour' ? 'high' : 'medium',
            metadata: {
              tripName: trip.name,
              tripDate: trip.startDate,
              location: trip.location,
              timeframe: timeframe,
              tripId: trip._id.toString()
            }
          });
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
        // Use userId if available, otherwise fallback to email lookup
        let userId = registration.student;
        if (!userId && registration.studentEmail) {
          const user = await User.findOne({ email: registration.studentEmail });
          if (user) {
            userId = user._id;
            // Update registration to include userId
            await StudentRegistration.findByIdAndUpdate(registration._id, { student: userId });
          }
        }
        
        if (!userId) continue; // Skip if no user found
        
        const existingNotification = await Notification.findOne({
          type: 'gym_session_reminder',
          recipient: userId,
          'metadata.timeframe': timeframe,
          'metadata.gymSessionId': gymSession._id.toString()
        });
        
        if (!existingNotification) {
          await Notification.create({
            recipient: userId,
            type: 'gym_session_reminder',
            title: `Reminder: Gym session starts in ${timeframe}`,
            message: `Your gym session will start in ${timeframe}`,
            relatedGymSession: gymSession._id,
            priority: timeframe === '1 hour' ? 'high' : 'medium',
            metadata: {
              gymSessionDate: gymSession.startDate,
              timeframe: timeframe,
              gymSessionId: gymSession._id.toString()
            }
          });
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
    console.log(`📢 Creating notifications for new event: ${event.title} (ID: ${event._id})`);
    
    if (!event || !event._id) {
      console.error('❌ Invalid event object provided to notifyNewEventCreated');
      throw new Error('Invalid event object');
    }
    
    // Find all users (Students, Staff, TAs, Professors, Events Office)
    const allUsers = await User.find({
      userType: { $in: ['Student', 'Staff', 'TA', 'Professor', 'event_office'] }
    });
    
    console.log(`👥 Found ${allUsers.length} users to notify`);
    
    // Count users by type for debugging
    const userTypeCounts = {};
    allUsers.forEach(user => {
      userTypeCounts[user.userType] = (userTypeCounts[user.userType] || 0) + 1;
    });
    console.log(`📊 User type breakdown:`, userTypeCounts);
    
    // Specifically log TA users found
    const taUsers = allUsers.filter(u => u.userType === 'TA');
    console.log(`👨‍🏫 Found ${taUsers.length} TA users:`, taUsers.map(u => `${u.email} (${u.firstName} ${u.lastName})`));
    
    let notificationCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    const creatorIdStr = event.createdBy ? event.createdBy.toString() : null;
    for (const user of allUsers) {
      try {
        // Check if notification already exists for this user and event
        const existingNotification = await Notification.findOne({
          recipient: user._id,
          type: 'event_announcement',
          'metadata.eventId': event._id.toString()
        });

        // If the event is approved, the creator (professor) already receives a dedicated
        // 'workshop_approved' notification via the approval flow. To avoid duplicate
        // notifications for the creator, skip creating a generic event announcement
        // when the recipient is the creator and the event is approved.
        const isCreator = creatorIdStr && user._id.toString() === creatorIdStr;
        if (event.status === 'approved' && isCreator) {
          skippedCount++;
          continue;
        }

        if (!existingNotification) {
          // Generic announcement for other users (students, other professors, staff, etc.)
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
          notificationCount++;
          // Log specifically for TA users
          if (user.userType === 'TA') {
            console.log(`✅ Created notification for TA user: ${user.email} (${user.firstName} ${user.lastName})`);
          }
        } else {
          skippedCount++;
        }
      } catch (userError) {
        errorCount++;
        console.error(`❌ Error creating notification for user ${user.email} (${user.userType}):`, userError);
      }
    }
    
    console.log(`✅ Notification creation complete: ${notificationCount} created, ${skippedCount} skipped (duplicates), ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error notifying new event created:', error);
    throw error; // Re-throw to ensure calling code knows about the error
  }
};

exports.notifyWorkshopSubmitted = async (event, submitter) => {
  try {
    const recipientsRaw = await User.find({
      $or: [
        { userType: { $in: ['Event Office', 'Events Office', 'event_office'] } },
        { role: { $in: ['Event Office', 'event_office'] } },
        { userType: { $in: ['Admin', 'admin'] } },
        { role: { $in: ['Admin', 'admin'] } }
      ]
    });

    if (!recipientsRaw.length) return;

    const recipientMap = new Map();
    recipientsRaw.forEach((user) => {
      if (user && user._id) {
        recipientMap.set(String(user._id), user);
      }
    });
    const recipients = Array.from(recipientMap.values());

    for (const user of recipients) {
      const existingNotification = await Notification.findOne({
        recipient: user._id,
        type: 'workshop_submission',
        'metadata.eventId': event._id.toString()
      });

      if (existingNotification) continue;

      await Notification.create({
        recipient: user._id,
        type: 'workshop_submission',
        title: `New Workshop Request: ${event.title}`,
        message: `Professor ${submitter.firstName} ${submitter.lastName} created a new workshop "${event.title}" scheduled for ${new Date(event.startDate).toLocaleDateString()}.`,
        relatedEvent: event._id,
        priority: 'high',
        metadata: {
          eventTitle: event.title,
          workshopName: event.title,
          eventDate: event.startDate,
          eventType: event.type,
          location: event.location,
          description: event.description,
          eventId: event._id.toString(),
          submittedBy: submitter._id.toString(),
          professorName: `${submitter.firstName} ${submitter.lastName}`,
          professorFirstName: submitter.firstName,
          professorLastName: submitter.lastName,
          submitterEmail: submitter.email,
          createdAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error notifying workshop submission:', error);
  }
};

// Notify Events Office users and Admins about new vendor requests
exports.notifyVendorRequest = async (vendorRequest, vendor, event) => {
  try {
    if (!vendorRequest || !vendor || !event) {
      console.warn('notifyVendorRequest called with missing data', {
        hasRequest: !!vendorRequest,
        hasVendor: !!vendor,
        hasEvent: !!event
      });
    }

    // Find all Events Office users and Admins
    const potentialRecipients = await User.find({
      $or: [
        { userType: { $in: ['Event Office', 'Events Office', 'event_office'] } },
        { role: { $in: ['Event Office', 'event_office'] } },
        { userType: { $in: ['Admin', 'admin'] } },
        { role: { $in: ['Admin', 'admin'] } }
      ]
    });

    console.log(`📢 notifyVendorRequest: Found ${potentialRecipients.length} potential recipients`);
    potentialRecipients.forEach(user => {
      console.log(`  - ${user.userType || user.role}: ${user.email || user.name} (ID: ${user._id})`);
    });

    if (!potentialRecipients.length) {
      console.warn('notifyVendorRequest: no recipients found for vendor request notifications');
      return;
    }

    // Deduplicate recipients by _id
    const recipientMap = new Map();
    potentialRecipients.forEach(user => {
      if (user && user._id) {
        recipientMap.set(String(user._id), user);
      }
    });
    const recipients = Array.from(recipientMap.values());
    
    console.log(`📢 notifyVendorRequest: After deduplication, ${recipients.length} unique recipients`);
    
    const vendorName = vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.email;
    const eventName = event?.title || event?.name || vendorRequest?.eventName || 'Event';
    const eventType = (vendorRequest.eventType || event?.type || 'bazaar').toLowerCase();
    const formattedEventType = eventType.includes('booth') ? 'Platform Booth' : 'Bazaar';
    const message = `${vendorName} submitted a ${formattedEventType} vendor request for "${eventName}".`;
    
    let notificationCount = 0;
    for (const recipient of recipients) {
      // Check if notification already exists
      const existingNotification = await Notification.findOne({
        recipient: recipient._id,
        type: 'vendor_request',
        'metadata.requestId': vendorRequest._id.toString()
      });
      
      if (!existingNotification) {
        await Notification.create({
          recipient: recipient._id,
          type: 'vendor_request',
          title: `New Vendor Request: ${vendorName}`,
          message,
          priority: recipient.userType?.toLowerCase().includes('admin') ? 'high' : 'medium',
          metadata: {
            requestId: vendorRequest._id.toString(),
            vendorId: vendor._id.toString(),
            vendorName: vendorName,
            eventId: event?._id?.toString() || null,
            eventName: eventName,
            eventType: formattedEventType,
            status: vendorRequest.status || 'pending',
            createdAt: new Date()
          }
        });
        notificationCount++;
        console.log(`✅ Created vendor_request notification for ${recipient.userType || recipient.role}: ${recipient.email || recipient.name}`);
      } else {
        console.log(`⏭️  Skipped duplicate notification for ${recipient.userType || recipient.role}: ${recipient.email || recipient.name}`);
      }
    }
    console.log(`📢 notifyVendorRequest: Created ${notificationCount} notifications for vendor request ${vendorRequest._id}`);
  } catch (error) {
    console.error('Error notifying vendor request:', error);
  }
};

// Notify Staff, TA, Professor, and Student users about new loyalty program applications
exports.notifyLoyaltyProgramApplication = async (loyaltyApplication, vendor) => {
  try {
    if (!loyaltyApplication || !vendor) {
      console.warn('notifyLoyaltyProgramApplication called with missing data', {
        hasApplication: !!loyaltyApplication,
        hasVendor: !!vendor
      });
      return;
    }

    // Find all Staff, TA, Professor, and Student users
    const potentialRecipients = await User.find({
      userType: { $in: ['Staff', 'TA', 'Professor', 'Student'] }
    });

    console.log(`📢 notifyLoyaltyProgramApplication: Found ${potentialRecipients.length} potential recipients`);

    if (!potentialRecipients.length) {
      console.warn('notifyLoyaltyProgramApplication: no recipients found for loyalty program application notifications');
      return;
    }

    // Deduplicate recipients by _id
    const recipientMap = new Map();
    potentialRecipients.forEach(user => {
      if (user && user._id) {
        recipientMap.set(String(user._id), user);
      }
    });
    const recipients = Array.from(recipientMap.values());
    
    console.log(`📢 notifyLoyaltyProgramApplication: After deduplication, ${recipients.length} unique recipients`);
    
    const vendorName = loyaltyApplication.vendorName || vendor.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.email;
    const discountInfo = loyaltyApplication.discountType === 'percentage' 
      ? `${loyaltyApplication.discountRate}% off`
      : `${loyaltyApplication.discountRate} EGP off`;
    const message = `${vendorName} has applied to become a GUC Loyalty Program partner with ${discountInfo} discount (Promo Code: ${loyaltyApplication.promoCode}).`;
    
    let notificationCount = 0;
    for (const recipient of recipients) {
      // Check if notification already exists
      const existingNotification = await Notification.findOne({
        recipient: recipient._id,
        type: 'loyalty_program_application',
        'metadata.applicationId': loyaltyApplication._id.toString()
      });
      
      if (!existingNotification) {
        await Notification.create({
          recipient: recipient._id,
          type: 'loyalty_program_application',
          title: `New Loyalty Partner Application: ${vendorName}`,
          message,
          priority: 'medium',
          metadata: {
            applicationId: loyaltyApplication._id.toString(),
            vendorId: vendor._id.toString(),
            vendorName: vendorName,
            discountRate: loyaltyApplication.discountRate,
            discountType: loyaltyApplication.discountType,
            promoCode: loyaltyApplication.promoCode,
            isActive: loyaltyApplication.isActive,
            createdAt: new Date()
          }
        });
        notificationCount++;
        console.log(`✅ Created loyalty_program_application notification for ${recipient.userType}: ${recipient.email || recipient.name}`);
      } else {
        console.log(`⏭️  Skipped duplicate notification for ${recipient.userType}: ${recipient.email || recipient.name}`);
      }
    }
    console.log(`📢 notifyLoyaltyProgramApplication: Created ${notificationCount} notifications for loyalty application ${loyaltyApplication._id}`);
  } catch (error) {
    console.error('Error notifying loyalty program application:', error);
  }
};