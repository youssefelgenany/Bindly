const Event = require('../models/eventModel');
const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const User = require('../models/userModel');
const { sendWorkshopCompletionEmail } = require('../utils/sendWorkshopCompletionEmail');

// Send completion emails for workshops that ended (checks for workshops whose endDate is today or earlier)
exports.sendWorkshopCompletionEmails = async (req, res) => {
  try {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date (to use as upper bound)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find workshops that ended today (or earlier) and haven't sent completion emails yet
    // This catches workshops whose endDate is today or any previous day
    const endedWorkshops = await Event.find({
      type: 'workshop',
      endDate: {
        $lt: tomorrow  // End date is before tomorrow (i.e., today or earlier)
      },
      completionEmailSent: { $ne: true },
      status: 'approved'
    });

    if (endedWorkshops.length === 0) {
      return res.json({
        success: true,
        message: 'No workshops ended that need completion emails',
        workshopsProcessed: 0,
        emailsSent: 0
      });
    }

    console.log(`📧 Found ${endedWorkshops.length} workshop(s) that ended and need completion emails`);

    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;

    for (const workshop of endedWorkshops) {
      console.log(`\n📚 Processing workshop: ${workshop.title}`);

      // Get all registered users (both regular registrations and student registrations)
      const regularRegistrations = await Registration.find({
        event: workshop._id,
        status: { $in: ['approved', 'registered'] }
      }).populate('user', 'email firstName lastName userType');

      const studentRegistrations = await StudentRegistration.find({
        event: workshop._id,
        eventType: 'workshop',
        status: { $in: ['approved', 'registered'] }
      });

      // Combine all registrations
      const allRegistrations = [];

      // Add regular registrations (staff, TA, professors)
      for (const reg of regularRegistrations) {
        if (reg.user && reg.user.email) {
          const userType = reg.user.userType || reg.role;
          // Only send to students, staff, TA, professors
          if (['Student', 'Staff', 'TA', 'Professor'].includes(userType)) {
            allRegistrations.push({
              email: reg.user.email,
              name: reg.user.firstName 
                ? `${reg.user.firstName} ${reg.user.lastName || ''}`.trim() 
                : reg.user.email,
              userType: userType
            });
          }
        }
      }

      // Add student registrations
      for (const reg of studentRegistrations) {
        if (reg.studentEmail) {
          allRegistrations.push({
            email: reg.studentEmail,
            name: reg.studentName || reg.studentEmail,
            userType: 'Student'
          });
        }
      }

      // Remove duplicates (same email)
      const uniqueRegistrations = [];
      const seenEmails = new Set();
      for (const reg of allRegistrations) {
        if (!seenEmails.has(reg.email.toLowerCase())) {
          seenEmails.add(reg.email.toLowerCase());
          uniqueRegistrations.push(reg);
        }
      }

      console.log(`   Found ${uniqueRegistrations.length} registered participants`);

      let emailsSent = 0;
      let emailsFailed = 0;

      // Send emails to all registered participants
      for (const participant of uniqueRegistrations) {
        try {
          const emailResult = await sendWorkshopCompletionEmail(
            participant.email,
            participant.name,
            workshop.title,
            workshop.endDate,
            workshop.location
          );

          if (emailResult.sent) {
            emailsSent++;
            totalEmailsSent++;
            console.log(`   ✅ Email sent to ${participant.email}`);
          } else {
            emailsFailed++;
            totalEmailsFailed++;
            console.error(`   ❌ Failed to send email to ${participant.email}:`, 
              emailResult.reason || emailResult.error);
          }
        } catch (emailError) {
          emailsFailed++;
          totalEmailsFailed++;
          console.error(`   ❌ Exception sending email to ${participant.email}:`, 
            emailError.message);
        }
      }

      // Mark workshop as having sent completion emails
      await Event.findByIdAndUpdate(workshop._id, {
        completionEmailSent: true
      });

      console.log(`   ✅ Workshop marked as completion emails sent`);
      console.log(`   📊 Summary: ${emailsSent} sent, ${emailsFailed} failed`);
    }

    res.json({
      success: true,
      message: `Processed ${endedWorkshops.length} workshop(s)`,
      workshopsProcessed: endedWorkshops.length,
      emailsSent: totalEmailsSent,
      emailsFailed: totalEmailsFailed
    });

  } catch (error) {
    console.error('❌ Error sending workshop completion emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending workshop completion emails',
      error: error.message
    });
  }
};

