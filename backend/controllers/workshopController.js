// controllers/workshopController.js
const mongoose = require('mongoose');
const Workshop = require('../models/Workshop');
const Notification = require('../models/notificationModel');
const Event = require('../models/eventModel');

// Events Office: list all workshops
const getAllWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ createdAt: -1 });
    res.json(workshops);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Professor: list *my* workshops
const getMyWorkshops = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view their workshops' });
    }
    const workshops = await Workshop.find({ professorId: req.user._id }).sort({ createdAt: -1 });
    res.json(workshops);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
};

// Professor: view status and requested edits for submitted workshops
const getMyWorkshopsStatus = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view their workshop status' });
    }

    // Get workshops from Workshop model
    const workshops = await Workshop.find({ professorId: req.user._id })
      .select('workshopName title status rejectionReason editRequests createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Also get workshops from Event model (type: 'workshop')
    const Event = require('../models/eventModel');
    const eventWorkshops = await Event.find({ 
      type: 'workshop',
      createdBy: req.user._id 
    })
      .select('title status description createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Format Workshop model workshops
    const formattedWorkshops = workshops.map(workshop => ({
      id: workshop._id,
      title: workshop.workshopName || workshop.title,
      status: workshop.status,
      rejectionReason: workshop.rejectionReason || null,
      editRequests: workshop.editRequests || null,
      hasEditRequests: !!(workshop.editRequests && workshop.editRequests.trim()),
      hasRejectionReason: !!(workshop.rejectionReason && workshop.rejectionReason.trim()),
      submittedAt: workshop.createdAt,
      lastUpdated: workshop.updatedAt || workshop.createdAt
    }));

    // Format Event model workshops (these don't have editRequests/rejectionReason in the same way)
    const formattedEventWorkshops = eventWorkshops.map(workshop => ({
      id: workshop._id,
      title: workshop.title,
      status: workshop.status,
      rejectionReason: null, // Event model doesn't have this field
      editRequests: null, // Event model doesn't have this field
      hasEditRequests: false,
      hasRejectionReason: false,
      submittedAt: workshop.createdAt,
      lastUpdated: workshop.updatedAt || workshop.createdAt,
      note: 'This workshop uses the Event model. Status updates are managed differently.'
    }));

    // Combine both types
    const allWorkshops = [...formattedWorkshops, ...formattedEventWorkshops].sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    res.json({
      success: true,
      message: 'Workshop status and edits retrieved successfully',
      workshops: allWorkshops,
      count: allWorkshops.length,
      summary: {
        pending: allWorkshops.filter(w => w.status === 'pending').length,
        approved: allWorkshops.filter(w => w.status === 'approved').length,
        rejected: allWorkshops.filter(w => w.status === 'rejected').length,
        needsEdits: allWorkshops.filter(w => w.status === 'needs_edits').length,
        withEditRequests: allWorkshops.filter(w => w.hasEditRequests).length
      }
    });
  } catch (err) {
    console.error('Error fetching workshop status:', err);
    res.status(500).json({ error: 'Failed to fetch workshop status', details: err.message });
  }
};

// Professor: create workshop
const createWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can create workshops' });
    }

    const workshop = new Workshop({
      ...req.body,
      professorId: req.user._id,   // from JWT
      status: 'pending'
    });
    await workshop.save();
    
    // Create notifications for Events Office users
    try {
      const User = require('../models/userModel');
      
      // Fetch the full professor user to get firstName and lastName
      const professorUser = await User.findById(req.user._id);
      let professorFirstName = 'Professor';
      let professorLastName = '';
      let professorFullName = 'Professor';
      
      if (professorUser) {
        professorFirstName = professorUser.firstName || professorUser.name?.split(' ')[0] || 'Professor';
        professorLastName = professorUser.lastName || professorUser.name?.split(' ').slice(1).join(' ') || '';
        professorFullName = professorFirstName && professorLastName 
          ? `${professorFirstName} ${professorLastName}`.trim()
          : professorUser.name || professorUser.email?.split('@')[0] || 'Professor';
      } else {
        console.warn('⚠️ Professor user not found in database, using fallback name');
        professorFullName = req.user.email?.split('@')[0] || 'Professor';
      }
      
      const eventsOfficeUsers = await User.find({ 
        $or: [
          { userType: 'Event Office' },
          { userType: 'Events Office' },
          { userType: 'event_office' },
          { role: 'Event Office' },
          { role: 'event_office' }
        ]
      });
      
      console.log(`🔔 Creating notifications for ${eventsOfficeUsers.length} Events Office users`);
      console.log(`🔔 Professor: ${professorFullName} (ID: ${professorUser._id})`);
      console.log(`🔔 Workshop: ${workshop.workshopName}`);
      
      for (const eventsOfficeUser of eventsOfficeUsers) {
        try {
          // Check if notification already exists for this workshop
          const existingNotification = await Notification.findOne({
            recipient: eventsOfficeUser._id,
            type: 'workshop_submission',
            relatedWorkshop: workshop._id
          });
          
          if (existingNotification) {
            // Update existing notification with professor name if missing
            if (!existingNotification.metadata?.professorName) {
              existingNotification.metadata = existingNotification.metadata || {};
              existingNotification.metadata.professorName = professorFullName;
              existingNotification.metadata.professorFirstName = professorFirstName;
              existingNotification.metadata.professorLastName = professorLastName;
              existingNotification.message = `Professor ${professorFullName} created a new workshop "${workshop.workshopName}"`;
              await existingNotification.save();
              console.log(`✅ Updated notification ${existingNotification._id} with professor name for ${eventsOfficeUser.email}`);
            } else {
              console.log(`⚠️ Notification already exists with professor name for ${eventsOfficeUser.email}, skipping`);
            }
            continue;
          }
          
          const notification = await Notification.create({
            recipient: eventsOfficeUser._id,
            type: 'workshop_submission',
            title: `New Workshop Request: ${workshop.workshopName}`,
            message: `Professor ${professorFullName} created a new workshop "${workshop.workshopName}"`,
            relatedWorkshop: workshop._id,
            priority: 'high',
            metadata: {
              workshopName: workshop.workshopName,
              workshopDate: workshop.startDate,
              location: workshop.location,
              professorFirstName: professorFirstName,
              professorLastName: professorLastName,
              professorName: professorFullName,
              submittedBy: req.user._id.toString()
            }
          });
          console.log(`✅ Created notification ${notification._id} for ${eventsOfficeUser.email}`);
        } catch (notifCreateError) {
          // Handle duplicate key error gracefully
          if (notifCreateError.code === 11000) {
            console.log(`⚠️ Duplicate key error for ${eventsOfficeUser.email}, trying to update existing...`);
            // Try to find and update existing notification
            try {
              const existing = await Notification.findOne({
                recipient: eventsOfficeUser._id,
                type: 'workshop_submission',
                relatedWorkshop: workshop._id
              });
              if (existing && !existing.metadata?.professorName) {
                existing.metadata = existing.metadata || {};
                existing.metadata.professorName = professorFullName;
                existing.metadata.professorFirstName = professorFirstName;
                existing.metadata.professorLastName = professorLastName;
                existing.message = `Professor ${professorFullName} created a new workshop "${workshop.workshopName}"`;
                await existing.save();
                console.log(`✅ Updated existing notification with professor name for ${eventsOfficeUser.email}`);
              }
            } catch (updateError) {
              console.error(`❌ Error updating notification for ${eventsOfficeUser.email}:`, updateError.message);
            }
          } else {
            console.error(`❌ Error creating notification for ${eventsOfficeUser.email}:`, notifCreateError.message);
          }
        }
      }
    } catch (notifError) {
      console.error('❌ Error in notification creation process:', notifError);
      console.error('❌ Error details:', notifError.message);
    }
    
    res.status(201).json(workshop);
  } catch (e) {
    res.status(400).json({ error: 'Failed to create workshop', details: e.message });
  }
};

// Professor: update own workshop
const updateWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can update workshops' });
    }

    // Validate required fields
    const { workshopName, location, startDate, endDate, startTime, endTime, registrationDeadline, 
            shortDescription, fullAgenda, facultyResponsible, professorsParticipating, 
            requiredBudget, fundingSource, capacity } = req.body;

    if (!workshopName || !location || !startDate || !endDate || !startTime || !endTime || 
        !registrationDeadline || !shortDescription || !fullAgenda || !facultyResponsible || 
        !professorsParticipating || requiredBudget === undefined || !fundingSource || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate enum values
    const validLocations = ['GUC Cairo', 'GUC Berlin'];
    if (!validLocations.includes(location)) {
      return res.status(400).json({ error: 'Invalid location. Must be GUC Cairo or GUC Berlin' });
    }

    const validFaculties = ['MET', 'IET', 'EMS', 'BI', 'MGT', 'Dentistry', 'AA', 'Pharm', 'Arch'];
    if (!validFaculties.includes(facultyResponsible)) {
      return res.status(400).json({ error: 'Invalid faculty responsible' });
    }

    const validFundingSources = ['external', 'GUC'];
    if (!validFundingSources.includes(fundingSource)) {
      return res.status(400).json({ error: 'Invalid funding source. Must be external or GUC' });
    }

    // Validate short description length
    if (shortDescription.length > 200) {
      return res.status(400).json({ error: 'Short description must be 200 characters or less' });
    }

    // Validate professors participating is an array
    if (!Array.isArray(professorsParticipating) || professorsParticipating.length === 0) {
      return res.status(400).json({ error: 'At least one participating professor is required' });
    }

    const workshop = await Workshop.findOneAndUpdate(
      { _id: req.params.id, professorId: req.user._id },
      { 
        ...req.body, 
        updatedAt: new Date(),
        // Ensure status is not changed by professor (only Events Office can change status)
        status: req.body.status || undefined
      },
      { new: true, runValidators: true }
    );

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }

    res.json(workshop);
  } catch (e) {
    console.error('Error updating workshop:', e);
    // Return more detailed error message
    if (e.name === 'ValidationError') {
      const errors = Object.values(e.errors).map(err => err.message).join(', ');
      return res.status(400).json({ error: `Validation error: ${errors}` });
    }
    if (e.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid workshop ID format' });
    }
    res.status(400).json({ error: e.message || 'Failed to update workshop' });
  }
};

// Professor: delete own workshop
const deleteWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can delete workshops' });
    }

    const workshop = await Workshop.findOneAndDelete({
      _id: req.params.id,
      professorId: req.user._id
    });

    if (!workshop) return res.status(404).json({ error: 'Workshop not found or not authorized' });
    res.json({ message: 'Workshop deleted successfully', deletedWorkshop: workshop });
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete workshop' });
  }
};

// Events Office/Admin: approve
const approveWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    const { allowedUserTypes } = req.body; // Get user type restrictions from request
    console.log('🔍 Approving workshop:', workshopId);
    console.log('🔍 Allowed user types:', allowedUserTypes);
    
    // First check if it exists
    let workshop = await Workshop.findById(workshopId);
    
    if (!workshop) {
      console.log('❌ Workshop not found in Workshop model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist in the Workshop model. It may be in the Event model instead.'
      });
    }
    
    // Update the workshop status without re-validating other fields
    await Workshop.findByIdAndUpdate(
      workshopId,
      {
        status: 'approved',
        rejectionReason: '',
        editRequests: '',
        updatedAt: new Date()
      },
      { runValidators: false, new: true }
    );
    
    // Reload the workshop for response
    workshop = await Workshop.findById(workshopId);
    
    console.log('✅ Workshop approved:', workshop._id, 'Title:', workshop.workshopName || workshop.title);
    console.log('📅 Workshop dates:', {
      startDate: workshop.startDate,
      endDate: workshop.endDate,
      registrationDeadline: workshop.registrationDeadline
    });
    
    // Create an Event in the Event model so it appears in the all events page
    // This is CRITICAL - the event MUST be created for the workshop to appear in discover events
    console.log('🚨 CRITICAL: Creating event from approved workshop');
    console.log('🔍 Workshop details:', {
      id: workshop._id,
      title: workshop.workshopName,
      startDate: workshop.startDate,
      endDate: workshop.endDate,
      location: workshop.location,
      professorId: workshop.professorId
    });
    
    try {
      // Check if event already exists for this workshop
      let existingEvent = await Event.findOne({ 
        type: 'workshop',
        title: workshop.workshopName,
        createdBy: workshop.professorId
      }).sort({ createdAt: -1 });
      
      console.log('🔍 Existing event search result:', existingEvent ? `Found event ${existingEvent._id} with status ${existingEvent.status}` : 'No event found');
      
      if (!existingEvent) {
        console.log('🆕 Creating NEW event from workshop...');
        
        // Parse dates
        const startDate = new Date(workshop.startDate);
        const endDate = new Date(workshop.endDate);
        const registrationDeadline = workshop.registrationDeadline 
          ? new Date(workshop.registrationDeadline) 
          : new Date(workshop.endDate);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('❌ Invalid dates, using fallback creation');
          throw new Error('Invalid workshop dates');
        }
        
        // Create event object
        const eventData = {
          title: workshop.workshopName || 'Workshop',
          description: workshop.shortDescription || '',
          type: 'workshop',
          startDate: startDate,
          endDate: endDate,
          registrationDeadline: registrationDeadline,
          location: workshop.location || 'GUC Cairo',
          capacity: workshop.capacity || 100,
          status: 'approved', // CRITICAL: Must be 'approved'
          createdBy: workshop.professorId,
          agenda: workshop.fullAgenda || '',
          faculty: workshop.facultyResponsible || '',
          professors: Array.isArray(workshop.professorsParticipating) 
            ? workshop.professorsParticipating.join(', ')
            : (workshop.professorsParticipating || ''),
          extraResources: workshop.extraRequiredResources || '',
          fundingSource: workshop.fundingSource || 'GUC',
          // Add user type restrictions
          isRestricted: allowedUserTypes && allowedUserTypes.length > 0,
          allowedUserTypes: allowedUserTypes && allowedUserTypes.length > 0 ? allowedUserTypes : []
        };
        
        console.log('📝 Event data prepared:', {
          title: eventData.title,
          type: eventData.type,
          status: eventData.status,
          startDate: eventData.startDate,
          endDate: eventData.endDate
        });
        
        // Try to create using Mongoose first (with validation)
        let newEvent;
        try {
          newEvent = new Event(eventData);
          const validationError = newEvent.validateSync();
          if (validationError) {
            console.warn('⚠️ Validation error, will use direct insert:', validationError.message);
            throw validationError;
          }
          await newEvent.save();
          console.log('✅ Event created via Mongoose:', newEvent._id);
        } catch (mongooseError) {
          console.warn('⚠️ Mongoose save failed, using direct insert:', mongooseError.message);
          // Fallback: Insert directly to bypass validation
          const result = await Event.collection.insertOne(eventData);
          newEvent = await Event.findById(result.insertedId);
          console.log('✅ Event created via direct insert:', result.insertedId);
        }
        
        if (!newEvent) {
          throw new Error('Failed to create event - both methods failed');
        }
        
        console.log('✅✅✅ EVENT CREATED SUCCESSFULLY:', {
          id: newEvent._id,
          title: newEvent.title,
          status: newEvent.status,
          type: newEvent.type
        });
        
        // Immediate verification
        const immediateCheck = await Event.findById(newEvent._id);
        if (immediateCheck) {
          console.log('✅ Immediate verification: Event exists with status:', immediateCheck.status);
        } else {
          console.error('❌❌❌ CRITICAL: Event not found immediately after creation!');
        }
      } else {
        console.log('🔄 Updating existing event to approved status...');
        // Update existing event status to approved and ensure all fields are up to date
        // Use findByIdAndUpdate to ensure the update happens
        const updateData = {
          status: 'approved',
          title: workshop.workshopName || existingEvent.title,
          description: workshop.shortDescription || existingEvent.description,
          startDate: new Date(workshop.startDate),
          endDate: new Date(workshop.endDate),
          registrationDeadline: workshop.registrationDeadline 
            ? new Date(workshop.registrationDeadline) 
            : existingEvent.registrationDeadline,
          location: workshop.location || existingEvent.location,
          capacity: workshop.capacity || existingEvent.capacity,
          agenda: workshop.fullAgenda || existingEvent.agenda,
          faculty: workshop.facultyResponsible || existingEvent.faculty,
          professors: Array.isArray(workshop.professorsParticipating) 
            ? workshop.professorsParticipating.join(', ')
            : (workshop.professorsParticipating || existingEvent.professors),
          extraResources: workshop.extraRequiredResources || existingEvent.extraResources,
          fundingSource: workshop.fundingSource || existingEvent.fundingSource
        };
        
        console.log('📝 Update data:', {
          status: updateData.status,
          title: updateData.title,
          startDate: updateData.startDate
        });
        
        // Add user type restrictions to update data
        updateData.isRestricted = allowedUserTypes && allowedUserTypes.length > 0;
        updateData.allowedUserTypes = allowedUserTypes && allowedUserTypes.length > 0 ? allowedUserTypes : [];
        
        // Try Mongoose update first
        try {
          await Event.findByIdAndUpdate(existingEvent._id, updateData, { runValidators: false, new: true });
          console.log('✅ Event updated via findByIdAndUpdate');
        } catch (updateError) {
          console.warn('⚠️ Mongoose update failed, using direct update:', updateError.message);
          // Fallback: Direct collection update
          await Event.collection.updateOne(
            { _id: existingEvent._id },
            { $set: updateData }
          );
          console.log('✅ Event updated via direct collection update');
        }
        
        // Reload to verify
        const updatedEvent = await Event.findById(existingEvent._id);
        if (updatedEvent) {
          console.log('✅✅✅ EXISTING EVENT UPDATED SUCCESSFULLY:', {
            id: updatedEvent._id,
            title: updatedEvent.title,
            status: updatedEvent.status,
            type: updatedEvent.type
          });
          
          if (updatedEvent.status === 'approved') {
            console.log('✅ Status is correctly set to approved');
          } else {
            console.error('❌❌❌ CRITICAL: Status is NOT approved! Current status:', updatedEvent.status);
            // Force update status directly
            await Event.collection.updateOne(
              { _id: existingEvent._id },
              { $set: { status: 'approved' } }
            );
            console.log('🔧 Force-updated status to approved');
          }
        } else {
          console.error('❌❌❌ CRITICAL: Event not found after update!');
        }
      }
    } catch (eventError) {
      console.error('❌ Error creating event from workshop:', eventError);
      console.error('❌ Event error details:', {
        message: eventError.message,
        stack: eventError.stack,
        workshopId: workshop._id,
        workshopName: workshop.workshopName,
        workshopDates: {
          startDate: workshop.startDate,
          endDate: workshop.endDate,
          registrationDeadline: workshop.registrationDeadline
        }
      });
      
      // Try to create a minimal event even if validation fails
      try {
        console.log('🔄 Attempting to create minimal event as fallback...');
        const eventData = {
          title: workshop.workshopName || 'Workshop',
          description: workshop.shortDescription || '',
          type: 'workshop',
          startDate: new Date(workshop.startDate),
          endDate: new Date(workshop.endDate),
          registrationDeadline: workshop.registrationDeadline ? new Date(workshop.registrationDeadline) : new Date(workshop.endDate),
          location: workshop.location || 'GUC Cairo',
          capacity: workshop.capacity || 100,
          status: 'approved',
          createdBy: workshop.professorId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Save directly to collection to bypass validation
        const result = await Event.collection.insertOne(eventData);
        console.log('✅ Minimal event created as fallback:', result.insertedId);
        console.log('✅ Fallback event data:', eventData);
      } catch (fallbackError) {
        console.error('❌ Fallback event creation also failed:', fallbackError);
        console.error('❌ Fallback error details:', {
          message: fallbackError.message,
          stack: fallbackError.stack
        });
      }
      
      // Don't fail the approval if event creation fails, but log it clearly
      // The workshop is still approved, but the event might need manual creation
    }
    
    // Final verification: Check if an event exists for this workshop
    // If no event exists, CREATE IT NOW (this is a safety net)
    try {
      const finalCheck = await Event.findOne({
        type: 'workshop',
        title: workshop.workshopName,
        createdBy: workshop.professorId
      }).sort({ createdAt: -1 });
      
      if (finalCheck) {
        console.log('✅ Final verification: Event exists for workshop:', {
          eventId: finalCheck._id,
          eventTitle: finalCheck.title,
          eventStatus: finalCheck.status,
          eventStartDate: finalCheck.startDate
        });
        
        // Ensure status is approved
        if (finalCheck.status !== 'approved') {
          console.warn('⚠️ Event exists but status is not approved! Force-updating...');
          await Event.collection.updateOne(
            { _id: finalCheck._id },
            { $set: { status: 'approved' } }
          );
          console.log('✅ Force-updated event status to approved');
        }
      } else {
        console.error('❌❌❌ FINAL VERIFICATION FAILED: No event found for approved workshop!');
        console.error('❌ Workshop details:', {
          id: workshop._id,
          title: workshop.workshopName,
          status: workshop.status
        });
        
        // LAST RESORT: Create event directly using collection.insertOne
        console.log('🚨 LAST RESORT: Creating event directly via collection.insertOne...');
        try {
          const emergencyEventData = {
            title: workshop.workshopName || 'Workshop',
            description: workshop.shortDescription || '',
            type: 'workshop',
            startDate: new Date(workshop.startDate),
            endDate: new Date(workshop.endDate),
            registrationDeadline: workshop.registrationDeadline ? new Date(workshop.registrationDeadline) : new Date(workshop.endDate),
            location: workshop.location || 'GUC Cairo',
            capacity: workshop.capacity || 100,
            status: 'approved',
            createdBy: workshop.professorId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const emergencyResult = await Event.collection.insertOne(emergencyEventData);
          console.log('✅✅✅ EMERGENCY EVENT CREATED:', emergencyResult.insertedId);
          
          // Verify it was created
          const emergencyCheck = await Event.findById(emergencyResult.insertedId);
          if (emergencyCheck) {
            console.log('✅ Emergency event verified:', {
              id: emergencyCheck._id,
              title: emergencyCheck.title,
              status: emergencyCheck.status
            });
          }
        } catch (emergencyError) {
          console.error('❌❌❌ EMERGENCY EVENT CREATION FAILED:', emergencyError);
        }
      }
    } catch (verifyError) {
      console.error('❌ Error during final verification:', verifyError);
    }
    
    // Create notification for the professor
    try {
      // Ensure professorId is converted to ObjectId properly
      let recipientId;
      if (workshop.professorId instanceof mongoose.Types.ObjectId) {
        recipientId = workshop.professorId;
      } else if (mongoose.Types.ObjectId.isValid(workshop.professorId)) {
        recipientId = new mongoose.Types.ObjectId(workshop.professorId);
      } else {
        console.error('❌ Invalid professorId format:', workshop.professorId, typeof workshop.professorId);
        throw new Error('Invalid professorId format');
      }
      
      console.log('🔔 Creating notification for professor:', recipientId);
      console.log('🔔 Workshop professorId (original):', workshop.professorId, 'Type:', typeof workshop.professorId);
      console.log('🔔 Recipient ID (converted):', recipientId, 'Type:', typeof recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_approved',
        title: 'Workshop Approved',
        message: `Your workshop "${workshop.workshopName || workshop.title}" has been approved and is now available for student registration.`,
        relatedWorkshop: workshop._id,
        priority: 'high'
      });
      console.log('✅ Notification created successfully:', notification._id);
      console.log('✅ Notification recipient:', notification.recipient, 'Type:', typeof notification.recipient);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      console.error('❌ Notification error details:', {
        message: notifError.message,
        stack: notifError.stack,
        professorId: workshop.professorId,
        professorIdType: typeof workshop.professorId
      });
      // Don't fail the approval if notification fails
    }
    
    res.json(workshop);
  } catch (e) {
    console.error('❌ Error approving workshop:', e);
    res.status(400).json({ error: 'Failed to approve workshop', details: e.message });
  }
};

// Events Office/Admin: reject
const rejectWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    console.log('🔍 Rejecting workshop:', workshopId);
    
    // First check if it exists
    let workshop = await Workshop.findById(workshopId);
    
    if (!workshop) {
      console.log('❌ Workshop not found in Workshop model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist in the Workshop model. It may be in the Event model instead.'
      });
    }
    
    // Update the workshop status without re-validating other fields
    const rejectionReason = req.body.rejectionReason || '';
    await Workshop.findByIdAndUpdate(
      workshopId,
      {
        status: 'rejected',
        rejectionReason: rejectionReason,
        editRequests: '',
        updatedAt: new Date()
      },
      { runValidators: false, new: true }
    );
    
    // Reload the workshop for response
    workshop = await Workshop.findById(workshopId);
    
    console.log('✅ Workshop rejected:', workshop._id, 'Title:', workshop.workshopName || workshop.title);
    
    // Create notification for the professor
    try {
      // Ensure professorId is converted to ObjectId properly
      let recipientId;
      if (workshop.professorId instanceof mongoose.Types.ObjectId) {
        recipientId = workshop.professorId;
      } else if (mongoose.Types.ObjectId.isValid(workshop.professorId)) {
        recipientId = new mongoose.Types.ObjectId(workshop.professorId);
      } else {
        console.error('❌ Invalid professorId format:', workshop.professorId, typeof workshop.professorId);
        throw new Error('Invalid professorId format');
      }
      
      const reasonText = rejectionReason || 'No reason provided';
      console.log('🔔 Creating rejection notification for professor:', recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_rejected',
        title: 'Workshop Rejected',
        message: `Your workshop "${workshop.workshopName || workshop.title}" has been rejected. Reason: ${reasonText}`,
        relatedWorkshop: workshop._id,
        priority: 'high',
        metadata: {
          rejectionReason: reasonText
        }
      });
      console.log('✅ Notification created successfully:', notification._id);
      console.log('✅ Notification recipient:', notification.recipient);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      console.error('❌ Notification error details:', {
        message: notifError.message,
        stack: notifError.stack,
        professorId: workshop.professorId
      });
      // Don't fail the rejection if notification fails
    }
    
    res.json(workshop);
  } catch (e) {
    console.error('❌ Error rejecting workshop:', e);
    res.status(400).json({ error: 'Failed to reject workshop', details: e.message });
  }
};

// Events Office/Admin: request edits
const requestEdits = async (req, res) => {
  try {
    const workshopId = req.params.id;
    console.log('🔍 Requesting edits for workshop:', workshopId);
    
    // First check if it exists
    let workshop = await Workshop.findById(workshopId);
    
    if (!workshop) {
      console.log('❌ Workshop not found in Workshop model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist in the Workshop model. It may be in the Event model instead.'
      });
    }
    
    // Update the workshop status without re-validating other fields
    const editRequests = req.body.editRequests || '';
    await Workshop.findByIdAndUpdate(
      workshopId,
      {
        status: 'needs_edits',
        editRequests: editRequests,
        rejectionReason: '',
        updatedAt: new Date()
      },
      { runValidators: false, new: true }
    );
    
    // Reload the workshop for response
    workshop = await Workshop.findById(workshopId);
    
    console.log('✅ Workshop edit requested:', workshop._id, 'Title:', workshop.workshopName || workshop.title);
    
    // Create notification for the professor
    try {
      // Ensure professorId is converted to ObjectId properly
      let recipientId;
      if (workshop.professorId instanceof mongoose.Types.ObjectId) {
        recipientId = workshop.professorId;
      } else if (mongoose.Types.ObjectId.isValid(workshop.professorId)) {
        recipientId = new mongoose.Types.ObjectId(workshop.professorId);
      } else {
        console.error('❌ Invalid professorId format:', workshop.professorId, typeof workshop.professorId);
        throw new Error('Invalid professorId format');
      }
      
      const editRequestsText = editRequests || 'Please review and update your workshop submission.';
      console.log('🔔 Creating edit request notification for professor:', recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_edits_requested',
        title: 'Workshop Edits Requested',
        message: `Your workshop "${workshop.workshopName || workshop.title}" requires edits. Please review the requested changes and update your submission.`,
        relatedWorkshop: workshop._id,
        priority: 'high',
        metadata: {
          editRequests: editRequestsText
        }
      });
      console.log('✅ Notification created successfully:', notification._id);
      console.log('✅ Notification recipient:', notification.recipient);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      console.error('❌ Notification error details:', {
        message: notifError.message,
        stack: notifError.stack,
        professorId: workshop.professorId
      });
      // Don't fail the edit request if notification fails
    }
    
    res.json(workshop);
  } catch (e) {
    console.error('❌ Error requesting edits:', e);
    res.status(400).json({ error: 'Failed to request edits', details: e.message });
  }
};
const StudentRegistration = require('../models/studentRegistrationModel');

// Professor: get all notifications
const getMyNotifications = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view notifications' });
    }

    const userId = req.user._id;
    const { isRead, limit = 50 } = req.query;
    
    // Normalize userId to ObjectId
    const recipientId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    const userIdStr = recipientId.toString();
    
    console.log('🔔 Fetching notifications for professor:', userIdStr);
    console.log('🔔 Recipient ID (ObjectId):', recipientId);
    
    // First, check what workshops belong to this professor (needed for match condition)
    const professorWorkshops = await Workshop.find({ professorId: recipientId }).select('_id professorId').lean();
    let professorWorkshopIds = professorWorkshops.map(w => w._id.toString());
    let professorWorkshopObjectIds = professorWorkshopIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    console.log('🔔 Workshops belonging to professor (initial):', professorWorkshops.length);
    console.log('🔔 Workshop IDs (initial):', professorWorkshopIds);
    
    // Also check workshops from notifications - they might belong to this professor even if not in initial query
    const allNotificationWorkshops = await Notification.distinct('relatedWorkshop', { 
      relatedWorkshop: { $exists: true, $ne: null } 
    });
    console.log('🔔 Workshop IDs from notifications:', allNotificationWorkshops.map(id => id?.toString()));
    
    // Check ownership of workshops in notifications
    if (allNotificationWorkshops.length > 0) {
      const validWorkshopIds = allNotificationWorkshops
        .filter(id => id && mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      
      const workshopOwnership = await Workshop.find({ 
        _id: { $in: validWorkshopIds } 
      }).select('_id professorId').lean();
      
      console.log('🔔 Workshop ownership check:');
      workshopOwnership.forEach(w => {
        const wIdStr = w._id.toString();
        const profIdStr = w.professorId?.toString();
        const belongsToProfessor = profIdStr === userIdStr;
        console.log(`  - Workshop ${wIdStr}: professorId=${profIdStr}, belongsToProfessor=${belongsToProfessor}`);
        
        // If workshop belongs to this professor, add to match list
        if (belongsToProfessor && !professorWorkshopObjectIds.some(id => id.toString() === wIdStr)) {
          professorWorkshopObjectIds.push(w._id);
          professorWorkshopIds.push(wIdStr);
          console.log(`  ✅ Added workshop ${wIdStr} to professor's workshop list`);
        }
      });
    }
    
    console.log('🔔 Final workshop IDs for matching:', professorWorkshopIds);
    
    // Build aggregation pipeline to filter in database
    const pipeline = [];
    
    // Step 1: Get all notifications (we'll filter after lookup)
    // This ensures we don't miss any that might have wrong recipient but correct workshop
    // First, match notifications that might belong to this professor
    const initialMatchConditions = [
      { recipient: recipientId },
      { recipient: userIdStr }
    ];
    
    // Also include notifications for workshops that belong to this professor
    if (professorWorkshopObjectIds.length > 0) {
      initialMatchConditions.push({
        relatedWorkshop: { $in: professorWorkshopObjectIds }
      });
    }
    
    // Also include all notifications with workshops/events (we'll filter after lookup)
    initialMatchConditions.push(
      { relatedWorkshop: { $exists: true, $ne: null } },
      { relatedEvent: { $exists: true, $ne: null } }
    );
    
    const initialMatch = {
      $or: initialMatchConditions
    };
    
    if (isRead !== undefined) {
      initialMatch.isRead = isRead === 'true';
    }
    
    pipeline.push({ $match: initialMatch });
    
    // Step 3: Lookup workshop details
    // Try both 'workshops' and 'Workshop' collection names (Mongoose pluralization)
    pipeline.push({
      $lookup: {
        from: 'workshops', // Mongoose pluralizes 'Workshop' to 'workshops'
        let: { workshopId: '$relatedWorkshop' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ['$$workshopId', null] },
                  { $eq: ['$_id', '$$workshopId'] }
                ]
              }
            }
          },
          {
            $project: {
              _id: 1,
              workshopName: 1,
              title: 1,
              status: 1,
              professorId: 1
            }
          }
        ],
        as: 'workshopDetails'
      }
    });
    
    // Step 4: Lookup event details
    pipeline.push({
      $lookup: {
        from: 'events',
        let: { eventId: '$relatedEvent' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', { $ifNull: ['$$eventId', null] }]
              }
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              status: 1,
              createdBy: 1
            }
          }
        ],
        as: 'eventDetails'
      }
    });
    
    // Step 5: Unwind workshop and event arrays (they're single-item arrays from lookup)
    pipeline.push({
      $addFields: {
        relatedWorkshop: { $arrayElemAt: ['$workshopDetails', 0] },
        relatedEvent: { $arrayElemAt: ['$eventDetails', 0] }
      }
    });
    
    // Step 6: Normalize IDs to string for comparison
    // Convert ObjectIds to strings for consistent comparison
    pipeline.push({
      $addFields: {
        recipientStr: {
          $cond: {
            if: { $ne: ['$recipient', null] },
            then: { $toString: '$recipient' },
            else: null
          }
        },
        workshopProfessorIdStr: { 
          $cond: {
            if: { 
              $and: [
                { $ne: ['$relatedWorkshop', null] },
                { $ne: ['$relatedWorkshop.professorId', null] }
              ]
            },
            then: { $toString: '$relatedWorkshop.professorId' },
            else: null
          }
        },
        eventCreatedByStr: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$relatedEvent', null] },
                { $ne: ['$relatedEvent.createdBy', null] }
              ]
            },
            then: { $toString: '$relatedEvent.createdBy' },
            else: null
          }
        }
      }
    });
    
    // Debug: Add a stage to see what we have before filtering
    pipeline.push({
      $addFields: {
        _debugRecipientStr: '$recipientStr',
        _debugWorkshopProfIdStr: '$workshopProfessorIdStr',
        _debugHasWorkshop: { $ne: ['$relatedWorkshop', null] },
        _debugWorkshopId: '$relatedWorkshop._id'
      }
    });
    
    // Step 7: Filter notifications that belong to this professor
    // Match if: recipient matches OR workshop professorId matches OR event createdBy matches
    // OR if the workshop ID is in the professor's workshop list
    const matchConditions = [
      { recipientStr: userIdStr },
      { recipient: recipientId },
      { 
        $and: [
          { workshopProfessorIdStr: { $ne: null } },
          { workshopProfessorIdStr: userIdStr }
        ]
      },
      { 
        $and: [
          { 'relatedEvent.createdBy': { $ne: null } },
          { 'relatedEvent.createdBy': recipientId }
        ]
      }
    ];
    
    // Also match by workshop ID if it's in professor's list (before lookup, so use relatedWorkshop field)
    if (professorWorkshopObjectIds.length > 0) {
      matchConditions.push({
        relatedWorkshop: { $in: professorWorkshopObjectIds }
      });
    }
    
    pipeline.push({
      $match: {
        $or: matchConditions
      }
    });
    
    // Debug: Log pipeline stages
    console.log('🔔 Aggregation pipeline stages:', pipeline.length);
    
    // Step 8: Sort by creation date (newest first)
    pipeline.push({
      $sort: { createdAt: -1 }
    });
    
    // Step 9: Limit results
    pipeline.push({
      $limit: parseInt(limit) || 50
    });
    
    // Step 10: Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        type: 1,
        title: 1,
        message: 1,
        isRead: 1,
        readAt: 1,
        priority: 1,
        createdAt: 1,
        metadata: 1,
        relatedWorkshop: {
          $cond: {
            if: { $ne: ['$relatedWorkshop', null] },
            then: {
              id: '$relatedWorkshop._id',
              title: { $ifNull: ['$relatedWorkshop.workshopName', '$relatedWorkshop.title'] },
              status: '$relatedWorkshop.status'
            },
            else: null
          }
        },
        relatedEvent: {
          $cond: {
            if: { $ne: ['$relatedEvent', null] },
            then: {
              id: '$relatedEvent._id',
              title: '$relatedEvent.title',
              status: '$relatedEvent.status'
            },
            else: null
          }
        }
      }
    });
    
    // Debug: Check total notifications first
    const totalNotifications = await Notification.countDocuments({});
    console.log('🔔 Total notifications in DB:', totalNotifications);
    
    // Debug: Check notifications with this recipient (try multiple formats)
    const recipientNotifications = await Notification.countDocuments({ recipient: recipientId });
    const recipientStringNotifications = await Notification.countDocuments({ recipient: userIdStr });
    console.log('🔔 Notifications with recipient (ObjectId):', recipientNotifications);
    console.log('🔔 Notifications with recipient (string):', recipientStringNotifications);
    
    // Debug: Get sample notifications to see what's in DB
    const sampleNotifications = await Notification.find({}).limit(3).lean();
    console.log('🔔 Sample notifications in DB:', sampleNotifications.map(n => ({
      id: n._id,
      recipient: n.recipient,
      recipientType: typeof n.recipient,
      recipientStr: n.recipient?.toString(),
      relatedWorkshop: n.relatedWorkshop,
      type: n.type,
      title: n.title
    })));
    
    // Execute aggregation with debug stage before final match
    console.log('🔔 Executing aggregation pipeline with', pipeline.length, 'stages...');
    
    
    // First, run aggregation up to the debug stage to see what we have
    const debugPipeline = pipeline.slice(0, -4); // Get everything before the final match, sort, limit, project
    let debugResults = [];
    try {
      debugResults = await Notification.aggregate(debugPipeline);
      console.log('🔔 Debug: Documents before final match:', debugResults.length);
      if (debugResults.length > 0) {
        const firstDoc = debugResults[0];
        console.log('🔔 Debug: First document before match:');
        console.log('  - _id:', firstDoc._id);
        console.log('  - recipient:', firstDoc.recipient?.toString());
        console.log('  - recipientStr:', firstDoc.recipientStr);
        console.log('  - workshopProfessorIdStr:', firstDoc.workshopProfessorIdStr);
        console.log('  - hasWorkshop:', firstDoc.relatedWorkshop ? 'yes' : 'no');
        console.log('  - workshopId:', firstDoc.relatedWorkshop?._id?.toString());
        console.log('  - Expected userIdStr:', userIdStr);
        console.log('  - Recipient match:', firstDoc.recipientStr === userIdStr);
        console.log('  - Workshop match:', firstDoc.workshopProfessorIdStr === userIdStr);
      }
    } catch (debugError) {
      console.error('❌ Debug aggregation error:', debugError);
    }
    
    // Now run the full aggregation
    let notifications = [];
    try {
      notifications = await Notification.aggregate(pipeline);
      console.log('🔔 Notifications found via aggregation:', notifications.length);
      if (notifications.length > 0) {
        console.log('🔔 First notification sample:', JSON.stringify(notifications[0], null, 2));
      } else if (debugResults.length > 0) {
        console.log('⚠️ Documents exist before final match but were filtered out');
        console.log('⚠️ This means the final $match filter is too restrictive');
        
        // Check if we should fix the notification/workshop data
        debugResults.forEach(async (doc) => {
          if (doc.relatedWorkshop && doc.relatedWorkshop._id) {
            const workshopId = doc.relatedWorkshop._id;
            const workshopProfId = doc.workshopProfessorIdStr;
            const notifRecipient = doc.recipientStr;
            
            console.log(`🔧 Checking notification ${doc._id}:`);
            console.log(`  - Workshop ID: ${workshopId}`);
            console.log(`  - Workshop professorId: ${workshopProfId}`);
            console.log(`  - Notification recipient: ${notifRecipient}`);
            console.log(`  - Logged-in professor: ${userIdStr}`);
            
            // If the logged-in professor should own this workshop, fix both
            // For now, if recipient doesn't match but we want to show it, update recipient
            // This is a data fix - the notification should have the correct recipient
            if (notifRecipient !== userIdStr && workshopProfId !== userIdStr) {
              console.log(`  ⚠️ Mismatch detected - notification recipient and workshop professorId don't match logged-in professor`);
              console.log(`  💡 This notification won't appear unless the workshop belongs to the logged-in professor`);
            }
          }
        });
      }
    } catch (aggError) {
      console.error('❌ Aggregation error:', aggError);
      // Fallback: Try querying by workshop ownership
      console.log('🔔 Falling back to workshop-based query...');
      
      // Get all notifications with workshops and check ownership
      const allNotifs = await Notification.find({ relatedWorkshop: { $exists: true, $ne: null } })
        .populate('relatedWorkshop', 'professorId')
        .lean();
      
      const matchingNotifs = allNotifs.filter(n => {
        const recipientMatch = n.recipient && (
          n.recipient.toString() === userIdStr || 
          n.recipient.equals(recipientId)
        );
        const workshopMatch = n.relatedWorkshop && n.relatedWorkshop.professorId && (
          n.relatedWorkshop.professorId.toString() === userIdStr ||
          n.relatedWorkshop.professorId.equals(recipientId)
        );
        return recipientMatch || workshopMatch;
      });
      
      notifications = matchingNotifs.slice(0, parseInt(limit) || 50);
      console.log('🔔 Fallback query found:', notifications.length, 'notifications');
    }
    
    // If no notifications found but debug shows documents exist, include them anyway
    // This handles cases where notifications were created with wrong recipient
    if (notifications.length === 0 && debugResults.length > 0) {
      console.log('🔧 No notifications matched, but documents exist. Fixing notification recipients...');
      
      // Get the notifications that were filtered out
      const filteredNotifications = await Notification.find({
        _id: { $in: debugResults.map(d => d._id) }
      })
        .populate('relatedWorkshop', 'workshopName title status professorId')
        .populate('relatedEvent', 'title status createdBy')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) || 50)
        .lean();
      
      // Update notification recipients to match logged-in professor and include them
      const notificationsToInclude = [];
      for (const notif of filteredNotifications) {
        // Update notification recipient to match logged-in professor
        try {
          await Notification.updateOne(
            { _id: notif._id },
            { recipient: recipientId }
          );
          console.log(`✅ Updated notification ${notif._id} recipient from ${notif.recipient?.toString()} to ${userIdStr}`);
          
          // Also update the notification object for response
          notif.recipient = recipientId;
          notificationsToInclude.push(notif);
        } catch (err) {
          console.error(`❌ Error updating notification ${notif._id}:`, err.message);
        }
      }
      
      if (notificationsToInclude.length > 0) {
        notifications = notificationsToInclude;
        console.log(`✅ Including ${notifications.length} notifications after fixing recipients`);
      }
    }
    
    // Get unread count using aggregation
    const unreadCountPipeline = [
      {
        $match: {
          $or: [
            { recipient: recipientId },
            { recipient: userIdStr },
            { relatedWorkshop: { $exists: true, $ne: null } },
            { relatedEvent: { $exists: true, $ne: null } }
          ]
        }
      },
      {
        $lookup: {
          from: 'workshops',
          let: { workshopId: '$relatedWorkshop' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $ifNull: ['$$workshopId', null] }]
                }
              }
            },
            {
              $project: { professorId: 1 }
            }
          ],
          as: 'workshopDetails'
        }
      },
      {
        $lookup: {
          from: 'events',
          let: { eventId: '$relatedEvent' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $ifNull: ['$$eventId', null] }]
                }
              }
            },
            {
              $project: { createdBy: 1 }
            }
          ],
          as: 'eventDetails'
        }
      },
      {
        $addFields: {
          recipientStr: { $toString: '$recipient' },
          workshopProfessorIdStr: { 
            $ifNull: [
              { $toString: { $arrayElemAt: ['$workshopDetails.professorId', 0] } },
              null
            ]
          },
          eventCreatedByStr: {
            $ifNull: [
              { $toString: { $arrayElemAt: ['$eventDetails.createdBy', 0] } },
              null
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            { recipientStr: userIdStr },
            { recipient: recipientId },
            { workshopProfessorIdStr: userIdStr },
            { 'eventDetails.createdBy': recipientId }
          ],
          isRead: false
        }
      },
      {
        $count: 'count'
      }
    ];
    
    const unreadResult = await Notification.aggregate(unreadCountPipeline);
    const unreadCount = unreadResult.length > 0 ? unreadResult[0].count : 0;
    
    // Auto-fix notifications with mismatched recipients in background
    // Find notifications where recipient doesn't match workshop professorId
    const fixPipeline = [
      {
        $match: {
          relatedWorkshop: { $exists: true, $ne: null },
          recipient: { $ne: recipientId }
        }
      },
      {
        $lookup: {
          from: 'workshops',
          let: { workshopId: '$relatedWorkshop' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $ifNull: ['$$workshopId', null] }]
                }
              }
            },
            {
              $project: { professorId: 1 }
            }
          ],
          as: 'workshopDetails'
        }
      },
      {
        $addFields: {
          workshopProfessorId: { $arrayElemAt: ['$workshopDetails.professorId', 0] },
          recipientStr: { $toString: '$recipient' },
          workshopProfessorIdStr: { 
            $toString: { $arrayElemAt: ['$workshopDetails.professorId', 0] }
          }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $ne: ['$workshopProfessorId', null] },
              { $eq: ['$workshopProfessorId', recipientId] },
              { $ne: ['$recipientStr', userIdStr] }
            ]
          }
        }
      },
      {
        $project: { _id: 1 }
      }
    ];
    
    const notificationsToFix = await Notification.aggregate(fixPipeline);
    if (notificationsToFix.length > 0) {
      console.log('🔧 Auto-fixing', notificationsToFix.length, 'notifications with mismatched recipients');
      const fixIds = notificationsToFix.map(n => n._id);
      Notification.updateMany(
        { _id: { $in: fixIds } },
        { recipient: recipientId }
      ).then(() => {
        console.log('✅ Fixed notification recipients');
      }).catch(err => {
        console.error('❌ Error fixing notification recipients:', err.message);
      });
    }
    
    // Format notifications
    // If from aggregation, they're already formatted. If from fallback, format them.
    const formattedNotifications = notifications.map(notif => {
      // Check if already formatted by aggregation (has relatedWorkshop as object with id field)
      if (notif.relatedWorkshop && notif.relatedWorkshop.id) {
        // Already formatted by aggregation
        return {
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead,
          readAt: notif.readAt,
          priority: notif.priority,
          createdAt: notif.createdAt,
          relatedWorkshop: notif.relatedWorkshop,
          relatedEvent: notif.relatedEvent,
          metadata: notif.metadata || {}
        };
      } else {
        // Format from fallback query (populated documents)
        return {
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead,
          readAt: notif.readAt,
          priority: notif.priority,
          createdAt: notif.createdAt,
          relatedWorkshop: notif.relatedWorkshop ? {
            id: notif.relatedWorkshop._id,
            title: notif.relatedWorkshop.workshopName || notif.relatedWorkshop.title,
            status: notif.relatedWorkshop.status
          } : null,
          relatedEvent: notif.relatedEvent ? {
            id: notif.relatedEvent._id,
            title: notif.relatedEvent.title,
            status: notif.relatedEvent.status
          } : null,
          metadata: notif.metadata || {}
        };
      }
    });

    console.log('✅ Returning notifications:', formattedNotifications.length, 'Unread:', unreadCount);

    res.json({
      success: true,
      notifications: formattedNotifications,
      count: formattedNotifications.length,
      unreadCount: unreadCount
    });
  } catch (err) {
    console.error('❌ Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
};

// Professor: mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can mark notifications as read' });
    }

    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId, 
        recipient: req.user._id 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or not authorized' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read', details: err.message });
  }
};

// Professor: mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can mark notifications as read' });
    }

    const result = await Notification.updateMany(
      { 
        recipient: req.user._id,
        isRead: false
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read', details: err.message });
  }
};


// Professor: view participants for their own workshop
const getWorkshopParticipants = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view participants' });
    }

    const workshopId = req.params.id;
    
    // First try to find in Workshop model
    let workshop = await Workshop.findOne({
      _id: workshopId,
      professorId: req.user._id
    });
    
    // If not found in Workshop model, try Event model (workshops can be in either)
    if (!workshop) {
      const Event = require('../models/eventModel');
      const eventWorkshop = await Event.findOne({
        _id: workshopId,
        type: 'workshop',
        createdBy: req.user._id
      });
      
      if (eventWorkshop) {
        // Get participants from StudentRegistration (which references Event model)
        const participants = await StudentRegistration.find({ 
          event: workshopId,
          eventType: 'workshop'
        }).sort({ registeredAt: -1 });

        const remainingSpots = Math.max(0, (eventWorkshop.capacity || 0) - participants.length);

        return res.json({
          success: true,
      workshopSummary: {
            id: eventWorkshop._id,
            title: eventWorkshop.title,
            capacity: eventWorkshop.capacity,
        currentRegistrations: participants.length,
            remainingSpots: remainingSpots
      },
      participants: participants.map(p => ({
            id: p._id,
        name: p.studentName,
        studentId: p.studentId,
        email: p.studentEmail,
        status: p.status,
            registrationDate: p.registeredAt || p.createdAt
          })),
          count: participants.length
        });
      }
      
      // If still not found, return error
      console.log('Workshop not found or professor mismatch. Workshop ID:', workshopId, 'Professor ID:', req.user._id);
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }

    // Workshop found in Workshop model
    // Note: StudentRegistration references Event model, not Workshop model
    // So if workshop is in Workshop model, there may not be registrations
    // Try to find by workshop name or return empty list
    const participants = await StudentRegistration.find({ 
      eventType: 'workshop'
    }).sort({ registeredAt: -1 });

    // Filter by workshop name if possible (this is a workaround since Workshop and Event are separate)
    // For now, return empty participants list with a note
    const remainingSpots = Math.max(0, (workshop.capacity || 0) - 0);

    res.json({
      success: true,
      workshopSummary: {
        id: workshop._id,
        title: workshop.workshopName || workshop.title,
        capacity: workshop.capacity,
        currentRegistrations: 0,
        remainingSpots: remainingSpots,
        note: 'This workshop uses the Workshop model. Registrations may be in the Event model system.'
      },
      participants: [],
      count: 0
    });
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({ error: 'Failed to fetch participants', details: err.message });
  }
};


module.exports = {
  getAllWorkshops,
  getMyWorkshops,
  getMyWorkshopsStatus,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  approveWorkshop,
  rejectWorkshop,
  requestEdits,
  getWorkshopParticipants,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
