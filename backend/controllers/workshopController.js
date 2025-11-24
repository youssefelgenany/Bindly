// controllers/workshopController.js
const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const Event = require('../models/eventModel');

// Events Office: list all workshops - NOW QUERIES EVENTS COLLECTION
const getAllWorkshops = async (req, res) => {
  try {
    // Query events collection for all workshops
    const workshops = await Event.find({ type: 'workshop' })
      .populate('createdBy', 'firstName lastName email userType')
      .sort({ createdAt: -1 });
    
    // Transform Event documents to match expected workshop format for backward compatibility
    const formattedWorkshops = workshops.map(event => ({
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      description: event.description,
      fullAgenda: event.agenda,
      agenda: event.agenda,
      facultyResponsible: event.faculty,
      faculty: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      professors: Array.isArray(event.professors) 
        ? event.professors.join(', ') 
        : (event.professors || ''),
      requiredBudget: event.budget,
      budget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      extraResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy?._id || event.createdBy,
      createdBy: event.createdBy,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      rejectionReason: event.rejectionReason,
      editRequests: event.editRequests,
      // Include populated creator info if available
      creatorName: event.createdBy?.firstName && event.createdBy?.lastName
        ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
        : event.createdBy?.name || event.createdBy?.email || 'Unknown'
    }));
    
    res.json(formattedWorkshops);
  } catch (e) {
    console.error('❌ Error fetching workshops:', e);
    res.status(500).json({ error: 'Failed to fetch workshops', details: e.message });
  }
};

// Professor: list *my* workshops - NOW QUERIES EVENTS COLLECTION
const getMyWorkshops = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view their workshops' });
    }
    // Query events collection for workshops created by this professor
    const workshops = await Event.find({ 
      type: 'workshop',
      createdBy: req.user._id 
    }).sort({ createdAt: -1 });
    
    // Transform Event documents to match expected workshop format for backward compatibility
    const formattedWorkshops = workshops.map(event => ({
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      description: event.description,
      fullAgenda: event.agenda,
      agenda: event.agenda,
      facultyResponsible: event.faculty,
      faculty: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      professors: Array.isArray(event.professors) 
        ? event.professors.join(', ') 
        : (event.professors || ''),
      requiredBudget: event.budget,
      budget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      extraResources: event.extraResources,
      capacity: event.capacity,
      registeredCount: event.registeredCount || 0,
      professorId: event.createdBy,
      createdBy: event.createdBy,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      rejectionReason: event.rejectionReason,
      editRequests: event.editRequests
    }));
    
    res.json(formattedWorkshops);
  } catch (e) {
    console.error('❌ Error fetching workshops:', e);
    res.status(500).json({ error: 'Failed to fetch workshops', details: e.message });
  }
};

// Professor: view status and requested edits for submitted workshops - NOW ONLY USES EVENT MODEL
const getMyWorkshopsStatus = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view their workshop status' });
    }

    // Get workshops from Event model (type: 'workshop')
    const eventWorkshops = await Event.find({ 
      type: 'workshop',
      createdBy: req.user._id 
    })
      .select('title status description rejectionReason editRequests createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Format Event model workshops
    const formattedWorkshops = eventWorkshops.map(workshop => ({
      id: workshop._id,
      title: workshop.title,
      status: workshop.status,
      rejectionReason: workshop.rejectionReason || null,
      editRequests: workshop.editRequests || null,
      hasEditRequests: !!(workshop.editRequests && workshop.editRequests.trim()),
      hasRejectionReason: !!(workshop.rejectionReason && workshop.rejectionReason.trim()),
      submittedAt: workshop.createdAt,
      lastUpdated: workshop.updatedAt || workshop.createdAt
    }));

    res.json({
      success: true,
      message: 'Workshop status and edits retrieved successfully',
      workshops: formattedWorkshops,
      count: formattedWorkshops.length,
      summary: {
        pending: formattedWorkshops.filter(w => w.status === 'pending').length,
        approved: formattedWorkshops.filter(w => w.status === 'approved').length,
        rejected: formattedWorkshops.filter(w => w.status === 'rejected').length,
        needsEdits: formattedWorkshops.filter(w => w.status === 'needs_edits').length,
        withEditRequests: formattedWorkshops.filter(w => w.hasEditRequests).length
      }
    });
  } catch (err) {
    console.error('Error fetching workshop status:', err);
    res.status(500).json({ error: 'Failed to fetch workshop status', details: err.message });
  }
};

// Professor: create workshop - SAVES DIRECTLY TO EVENTS COLLECTION
const createWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can create workshops' });
    }

    const {
      workshopName,
      location,
      startDate,
      endDate,
      startTime,
      endTime,
      registrationDeadline,
      shortDescription,
      fullAgenda,
      facultyResponsible,
      professorsParticipating,
      requiredBudget,
      fundingSource,
      extraRequiredResources,
      capacity
    } = req.body;

    // Validate required fields
    if (!workshopName || !location || !startDate || !endDate || 
        !registrationDeadline || !shortDescription || !fullAgenda || !facultyResponsible || 
        !professorsParticipating || requiredBudget === undefined || !fundingSource || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse dates - frontend sends ISO strings
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const registrationDeadlineDate = new Date(registrationDeadline);

    // Validate dates
    if (isNaN(startDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    if (isNaN(endDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }
    if (isNaN(registrationDeadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid registration deadline format' });
    }

    // Validate date logic
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    if (registrationDeadlineDate >= startDateTime) {
      return res.status(400).json({ error: 'Registration deadline must be before the workshop start date' });
    }

    // Create Event directly in events collection (not workshops collection)
    const newEvent = new Event({
      title: workshopName,
      description: shortDescription,
      type: 'workshop',
      startDate: startDateTime,
      endDate: endDateTime,
      registrationDeadline: registrationDeadlineDate,
      location: location,
      capacity: capacity,
      createdBy: req.user._id,
      status: 'pending', // Professors submit for approval
      // Workshop-specific fields
      agenda: fullAgenda,
      faculty: facultyResponsible,
      professors: Array.isArray(professorsParticipating) 
        ? professorsParticipating 
        : (professorsParticipating ? professorsParticipating.split(',').map(p => p.trim()).filter(p => p) : []),
      extraResources: extraRequiredResources || '',
      fundingSource: fundingSource || 'GUC',
      budget: requiredBudget
    });

    await newEvent.save();
    
    console.log('✅ Workshop created as Event in events collection:', newEvent._id);
    
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
      console.log(`🔔 Professor: ${professorFullName} (ID: ${professorUser?._id})`);
      console.log(`🔔 Workshop: ${workshopName}`);
      
      for (const eventsOfficeUser of eventsOfficeUsers) {
        try {
          // Check if notification already exists for this event
          const existingNotification = await Notification.findOne({
            recipient: eventsOfficeUser._id,
            type: 'workshop_submission',
            relatedEvent: newEvent._id
          });
          
          if (existingNotification) {
            // Update existing notification with professor name if missing
            if (!existingNotification.metadata?.professorName) {
              existingNotification.metadata = existingNotification.metadata || {};
              existingNotification.metadata.professorName = professorFullName;
              existingNotification.metadata.professorFirstName = professorFirstName;
              existingNotification.metadata.professorLastName = professorLastName;
              existingNotification.message = `Professor ${professorFullName} created a new workshop "${workshopName}"`;
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
            title: `New Workshop Request: ${workshopName}`,
            message: `Professor ${professorFullName} created a new workshop "${workshopName}"`,
            relatedEvent: newEvent._id,
            priority: 'high',
            metadata: {
              workshopName: workshopName,
              workshopDate: startDateTime,
              location: location,
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
                relatedEvent: newEvent._id
              });
              if (existing && !existing.metadata?.professorName) {
                existing.metadata = existing.metadata || {};
                existing.metadata.professorName = professorFullName;
                existing.metadata.professorFirstName = professorFirstName;
                existing.metadata.professorLastName = professorLastName;
                existing.message = `Professor ${professorFullName} created a new workshop "${workshopName}"`;
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
    
    // Return event data in workshop format for backward compatibility
    res.status(201).json({
      _id: newEvent._id,
      workshopName: newEvent.title,
      location: newEvent.location,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      registrationDeadline: newEvent.registrationDeadline,
      shortDescription: newEvent.description,
      fullAgenda: newEvent.agenda,
      facultyResponsible: newEvent.faculty,
      professorsParticipating: newEvent.professors,
      requiredBudget: newEvent.budget,
      fundingSource: newEvent.fundingSource,
      extraRequiredResources: newEvent.extraResources,
      capacity: newEvent.capacity,
      professorId: newEvent.createdBy,
      status: newEvent.status,
      createdAt: newEvent.createdAt,
      updatedAt: newEvent.updatedAt
    });
  } catch (e) {
    console.error('❌ Error creating workshop as event:', e);
    res.status(400).json({ error: 'Failed to create workshop', details: e.message });
  }
};

// Professor: update own workshop - NOW UPDATES EVENT MODEL
const updateWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can update workshops' });
    }

    // Validate required fields
    const { workshopName, location, startDate, endDate, startTime, endTime, registrationDeadline, 
            shortDescription, fullAgenda, facultyResponsible, professorsParticipating, 
            requiredBudget, fundingSource, capacity } = req.body;

    if (!workshopName || !location || !startDate || !endDate || 
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

    // Parse dates - frontend sends ISO strings
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const registrationDeadlineDate = new Date(registrationDeadline);

    // Validate dates
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || isNaN(registrationDeadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Validate date logic
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    if (registrationDeadlineDate >= startDateTime) {
      return res.status(400).json({ error: 'Registration deadline must be before the workshop start date' });
    }

    // First, find the existing event to check if it has edit requests
    const existingEvent = await Event.findOne({
      _id: req.params.id,
      type: 'workshop',
      createdBy: req.user._id
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }

    // Prepare update data
    const updateData = {
      title: workshopName,
      description: shortDescription,
      location: location,
      startDate: startDateTime,
      endDate: endDateTime,
      registrationDeadline: registrationDeadlineDate,
      capacity: capacity,
      // Workshop-specific fields
      agenda: fullAgenda,
      faculty: facultyResponsible,
      professors: Array.isArray(professorsParticipating) 
        ? professorsParticipating 
        : (professorsParticipating ? professorsParticipating.split(',').map(p => p.trim()).filter(p => p) : []),
      extraResources: req.body.extraRequiredResources || '',
      fundingSource: fundingSource || 'GUC',
      budget: requiredBudget,
      updatedAt: new Date()
    };

    // If workshop has edit requests (status is 'needs_edits'), clear them and reset status to 'pending'
    if (existingEvent.status === 'needs_edits' && existingEvent.editRequests) {
      updateData.editRequests = '';
      updateData.status = 'pending';
      console.log('✅ Clearing edit requests and resetting status to pending for workshop:', req.params.id);
    }

    // Find and update the Event document (workshops are stored in Event model)
    const event = await Event.findOneAndUpdate(
      { 
        _id: req.params.id, 
        type: 'workshop',
        createdBy: req.user._id 
      },
      updateData,
      { new: true, runValidators: true }
    );


    // Transform Event document back to workshop format for backward compatibility
    const formattedWorkshop = {
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      description: event.description,
      fullAgenda: event.agenda,
      agenda: event.agenda,
      facultyResponsible: event.faculty,
      faculty: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      professors: Array.isArray(event.professors) 
        ? event.professors.join(', ') 
        : (event.professors || ''),
      requiredBudget: event.budget,
      budget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      extraResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy,
      createdBy: event.createdBy,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      rejectionReason: event.rejectionReason,
      editRequests: event.editRequests
    };

    res.json(formattedWorkshop);
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

// Professor: delete own workshop - NOW USES EVENT MODEL
const deleteWorkshop = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can delete workshops' });
    }

    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      type: 'workshop',
      createdBy: req.user._id
    });

    if (!event) return res.status(404).json({ error: 'Workshop not found or not authorized' });
    
    // Transform to workshop format for backward compatibility
    const deletedWorkshop = {
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      fullAgenda: event.agenda,
      facultyResponsible: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      requiredBudget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy,
      status: event.status
    };
    
    res.json({ message: 'Workshop deleted successfully', deletedWorkshop });
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete workshop' });
  }
};

// Events Office/Admin: approve - NOW USES EVENT MODEL ONLY
const approveWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    const { allowedUserTypes } = req.body; // Get user type restrictions from request
    console.log('🔍 Approving workshop:', workshopId);
    console.log('🔍 Allowed user types:', allowedUserTypes);
    
    // Find workshop in Event model
    let event = await Event.findOne({
      _id: workshopId,
      type: 'workshop'
    });
    
    if (!event) {
      console.log('❌ Workshop not found in Event model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist.'
      });
    }
    
    // Update the event status
    const updateData = {
      status: 'approved',
      rejectionReason: '',
      editRequests: '',
      updatedAt: new Date()
    };
    
    // Add user type restrictions if provided
    if (allowedUserTypes && allowedUserTypes.length > 0) {
      updateData.isRestricted = true;
      updateData.allowedUserTypes = allowedUserTypes;
    }
    
    event = await Event.findByIdAndUpdate(
      workshopId,
      updateData,
      { new: true, runValidators: false }
    );
    
    console.log('✅ Workshop approved:', event._id, 'Title:', event.title);
    console.log('📅 Workshop dates:', {
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline
    });
    
    // Send notifications to all eligible users about the newly approved event
    const { notifyNewEventCreated } = require("../services/notificationService");
    console.log(`📢 Workshop ${event._id} is approved, triggering notifications...`);
    try {
      await notifyNewEventCreated(event);
      console.log(`✅ Notifications triggered successfully for workshop ${event._id}`);
    } catch (notifError) {
      console.error(`❌ Error triggering notifications for workshop ${event._id}:`, notifError);
    }
    
    // Create notification for the professor
    try {
      const recipientId = event.createdBy instanceof mongoose.Types.ObjectId 
        ? event.createdBy 
        : new mongoose.Types.ObjectId(event.createdBy);
      
      console.log('🔔 Creating notification for professor:', recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_approved',
        title: 'Workshop Approved',
        message: `Your workshop "${event.title}" has been approved and is now available for student registration.`,
        relatedEvent: event._id,
        priority: 'high'
      });
      console.log('✅ Notification created successfully:', notification._id);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      // Don't fail the approval if notification fails
    }
    
    // Transform to workshop format for backward compatibility
    const formattedWorkshop = {
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      fullAgenda: event.agenda,
      facultyResponsible: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      requiredBudget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
    
    res.json(formattedWorkshop);
  } catch (e) {
    console.error('❌ Error approving workshop:', e);
    res.status(400).json({ error: 'Failed to approve workshop', details: e.message });
  }
};

// Events Office/Admin: reject - NOW USES EVENT MODEL ONLY
const rejectWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    console.log('🔍 Rejecting workshop:', workshopId);
    
    // Find workshop in Event model
    let event = await Event.findOne({
      _id: workshopId,
      type: 'workshop'
    });
    
    if (!event) {
      console.log('❌ Workshop not found in Event model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist.'
      });
    }
    
    // Update the event status
    const rejectionReason = req.body.rejectionReason || '';
    event = await Event.findByIdAndUpdate(
      workshopId,
      {
        status: 'rejected',
        rejectionReason: rejectionReason,
        editRequests: '',
        updatedAt: new Date()
      },
      { new: true, runValidators: false }
    );
    
    console.log('✅ Workshop rejected:', event._id, 'Title:', event.title);
    
    // Create notification for the professor
    try {
      const recipientId = event.createdBy instanceof mongoose.Types.ObjectId 
        ? event.createdBy 
        : new mongoose.Types.ObjectId(event.createdBy);
      
      const reasonText = rejectionReason || 'No reason provided';
      console.log('🔔 Creating rejection notification for professor:', recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_rejected',
        title: 'Workshop Rejected',
        message: `Your workshop "${event.title}" has been rejected. Reason: ${reasonText}`,
        relatedEvent: event._id,
        priority: 'high',
        metadata: {
          rejectionReason: reasonText
        }
      });
      console.log('✅ Notification created successfully:', notification._id);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      // Don't fail the rejection if notification fails
    }
    
    // Transform to workshop format for backward compatibility
    const formattedWorkshop = {
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      fullAgenda: event.agenda,
      facultyResponsible: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      requiredBudget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy,
      status: event.status,
      rejectionReason: event.rejectionReason,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
    
    res.json(formattedWorkshop);
  } catch (e) {
    console.error('❌ Error rejecting workshop:', e);
    res.status(400).json({ error: 'Failed to reject workshop', details: e.message });
  }
};

// Events Office/Admin: request edits - NOW USES EVENT MODEL ONLY
const requestEdits = async (req, res) => {
  try {
    const workshopId = req.params.id;
    console.log('🔍 Requesting edits for workshop:', workshopId);
    
    // Find workshop in Event model
    let event = await Event.findOne({
      _id: workshopId,
      type: 'workshop'
    });
    
    if (!event) {
      console.log('❌ Workshop not found in Event model, ID:', workshopId);
      return res.status(404).json({ 
        error: 'Workshop not found',
        message: 'The workshop with the provided ID does not exist.'
      });
    }
    
    // Update the event status
    const editRequests = req.body.editRequests || '';
    event = await Event.findByIdAndUpdate(
      workshopId,
      {
        status: 'needs_edits',
        editRequests: editRequests,
        rejectionReason: '',
        updatedAt: new Date()
      },
      { new: true, runValidators: false }
    );
    
    console.log('✅ Workshop edit requested:', event._id, 'Title:', event.title);
    
    // Create notification for the professor
    try {
      const recipientId = event.createdBy instanceof mongoose.Types.ObjectId 
        ? event.createdBy 
        : new mongoose.Types.ObjectId(event.createdBy);
      
      const editRequestsText = editRequests || 'Please review and update your workshop submission.';
      console.log('🔔 Creating edit request notification for professor:', recipientId);
      
      const notification = await Notification.create({
        recipient: recipientId,
        type: 'workshop_edits_requested',
        title: 'Workshop Edits Requested',
        message: `Your workshop "${event.title}" requires edits. Please review the requested changes and update your submission.`,
        relatedEvent: event._id,
        priority: 'high',
        metadata: {
          editRequests: editRequestsText
        }
      });
      console.log('✅ Notification created successfully:', notification._id);
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      // Don't fail the edit request if notification fails
    }
    
    // Transform to workshop format for backward compatibility
    const formattedWorkshop = {
      _id: event._id,
      workshopName: event.title,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      shortDescription: event.description,
      fullAgenda: event.agenda,
      facultyResponsible: event.faculty,
      professorsParticipating: Array.isArray(event.professors) 
        ? event.professors 
        : (event.professors && typeof event.professors === 'string' ? event.professors.split(',').map(p => p.trim()).filter(p => p) : []),
      requiredBudget: event.budget,
      fundingSource: event.fundingSource,
      extraRequiredResources: event.extraResources,
      capacity: event.capacity,
      professorId: event.createdBy,
      status: event.status,
      editRequests: event.editRequests,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
    
    res.json(formattedWorkshop);
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
    
    // Get workshops from Event model that belong to this professor
    const professorWorkshops = await Event.find({ 
      type: 'workshop',
      createdBy: recipientId 
    }).select('_id createdBy').lean();
    let professorWorkshopIds = professorWorkshops.map(w => w._id.toString());
    let professorWorkshopObjectIds = professorWorkshopIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    console.log('🔔 Workshops belonging to professor (from Event model):', professorWorkshops.length);
    console.log('🔔 Workshop IDs:', professorWorkshopIds);
    
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
    
    // Step 3: Lookup event details (workshops are now in events collection)
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
    
    // Step 4: Unwind event array (they're single-item arrays from lookup)
    // Also handle relatedWorkshop by looking it up in events collection
    pipeline.push({
      $lookup: {
        from: 'events',
        let: { workshopId: '$relatedWorkshop' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ['$$workshopId', null] },
                  { $eq: ['$_id', '$$workshopId'] },
                  { $eq: ['$type', 'workshop'] }
                ]
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
        as: 'workshopDetails'
      }
    });
    
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
                { $ne: ['$relatedWorkshop.createdBy', null] }
              ]
            },
            then: { $toString: '$relatedWorkshop.createdBy' },
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
              title: '$relatedWorkshop.title',
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


// Professor: view participants for their own workshop - NOW USES EVENT MODEL ONLY
const getWorkshopParticipants = async (req, res) => {
  try {
    if (req.user.userType !== 'Professor') {
      return res.status(403).json({ error: 'Only professors can view participants' });
    }

    const workshopId = req.params.id;
    
    // Find workshop in Event model
    const eventWorkshop = await Event.findOne({
      _id: workshopId,
      type: 'workshop',
      createdBy: req.user._id
    });
    
    if (!eventWorkshop) {
      console.log('Workshop not found or professor mismatch. Workshop ID:', workshopId, 'Professor ID:', req.user._id);
      return res.status(404).json({ error: 'Workshop not found or not authorized' });
    }
    
    // Get participants from StudentRegistration (which references Event model)
    const participants = await StudentRegistration.find({ 
      event: workshopId,
      eventType: 'workshop'
    }).sort({ registeredAt: -1 });

    const remainingSpots = Math.max(0, (eventWorkshop.capacity || 0) - participants.length);

    res.json({
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
