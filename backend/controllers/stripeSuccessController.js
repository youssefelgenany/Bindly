const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Payment = require('../models/paymentModel');
const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const VendorRequest = require('../models/vendorRequest');
const User = require('../models/userModel');
const { sendReceiptEmail } = require('../utils/sendReceiptEmail');

// Handle Stripe payment success callback
module.exports = async (req, res) => {
  if (!stripe) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}/payment-error?error=Stripe not configured`);
  }
  try {
    const { session_id } = req.query;

    console.log('🔔 Payment success callback received. Session ID:', session_id);

    if (!session_id) {
      console.error('❌ Missing session_id in payment success callback');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Missing session ID`);
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('📋 Stripe session retrieved. Payment status:', session.payment_status);

    if (session.payment_status !== 'paid') {
      console.warn('⚠️ Payment status is not paid:', session.payment_status);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Payment not completed`);
    }

    // Find the payment record
    const payment = await Payment.findOne({ stripeSessionId: session_id });

    if (!payment) {
      console.error('❌ Payment record not found for session:', session_id);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-error?error=Payment record not found`);
    }

    console.log('💳 Found payment record. Current status:', payment.status);

    // If already processed, just redirect
    if (payment.status === 'success') {
      console.log('✅ Payment already processed');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/payment-success?already_processed=true`);
    }

    // Update payment status
    console.log('🔄 Updating payment status to success...');
    payment.status = 'success';
    payment.stripePaymentIntentId = session.payment_intent;
    await payment.save();
    console.log('✅ Payment status updated');

    // Check if this is a vendor request payment
    if (payment.vendorRequest) {
      console.log('🔍 Processing vendor request payment...');
      const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
      if (vendorRequest) {
        vendorRequest.paymentStatus = 'paid';
        vendorRequest.paidAt = new Date();
        await vendorRequest.save();
        console.log('✅ Vendor request marked as paid');
      } else {
        console.error('❌ Vendor request not found for payment:', payment.vendorRequest);
      }
    } else {
      // Handle event registration payment
      console.log('🔍 Looking for registration...');
      let registration = await Registration.findOne({
        event: payment.event,
        user: payment.user
      });

      if (!registration) {
        console.log('🔍 Registration not found in Registration model, checking StudentRegistration...');
        const user = await User.findById(payment.user);
        if (user && user.email) {
          registration = await StudentRegistration.findOne({
            event: payment.event,
            studentEmail: user.email.toLowerCase()
          });
        }
      }

      if (registration) {
        console.log('✅ Found registration, marking as paid...');
        registration.paid = true;
        await registration.save();
        console.log('✅ Registration marked as paid');
      } else {
        console.error('❌ Registration not found for payment:', payment._id);
      }
    }

      // Send receipt email
      console.log('📧 Sending receipt email...');
      const user = await User.findById(payment.user);
      let eventTitle = 'Event'; // Declare outside if block for redirect use
      if (user) {
        // Get vendor's personal name for greeting
        const vendorPersonalName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.companyName || user.email;
        let receiptDetails = {};
        
        if (payment.vendorRequest) {
          const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
          if (vendorRequest) {
            // Build event title with more details
            if (vendorRequest.eventType) {
              const eventTypeDisplay = {
                'bazaar': 'Bazaar',
                'booth': 'Booth',
                'standaloneBooth': 'Standalone Booth',
                'platformBooth': 'Platform Booth'
              }[vendorRequest.eventType] || vendorRequest.eventType;
              
              if (vendorRequest.eventName) {
                eventTitle = `${eventTypeDisplay} - ${vendorRequest.eventName}`;
              } else {
                eventTitle = `${eventTypeDisplay} Participation`;
              }
            } else {
              eventTitle = vendorRequest.eventName || 'Vendor Request';
            }
            
            // Build additional details for receipt
            receiptDetails = {
              eventType: vendorRequest.eventType,
              boothSize: vendorRequest.boothSize,
              durationWeeks: vendorRequest.durationWeeks,
              boothLocation: vendorRequest.boothLocation
            };
          }
        } else {
          const Event = require('../models/eventModel');
          const Trip = require('../models/tripModel');
          let event = await Event.findById(payment.event);
          if (!event) {
            event = await Trip.findById(payment.event);
          }
          eventTitle = event ? (event.title || event.name || 'Event') : 'Event';
        }
        
        try {
          const emailResult = await sendReceiptEmail(
            user.email,
            vendorPersonalName,
            eventTitle,
            payment.amount,
            'card',
            new Date(),
            receiptDetails
          );
        if (emailResult.sent) {
          console.log('✅ Receipt email sent successfully');
        } else {
          console.error('❌ Receipt email not sent:', emailResult.reason || emailResult.error);
          if (emailResult.reason === 'SMTP not configured') {
            console.error('   ⚠️  Please configure SMTP settings in .env file');
          }
        }
      } catch (emailError) {
        console.error('❌ Exception while sending receipt email:', emailError);
        console.error('   Error details:', emailError.message);
        // Don't fail the whole process if email fails
      }
    } else {
      console.error('❌ User not found for payment:', payment.user);
    }

    // Redirect to My Events page with success message
    console.log('✅ Payment processing complete. Redirecting...');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    // Determine the correct My Events route based on user type
    // eventTitle and user are already set above in the email sending section
    let redirectUrl = `${clientUrl}/payment-success?session_id=${session_id}`;
    
    // Get user if not already fetched (for redirect logic)
    const redirectUser = user || await User.findById(payment.user);
    
    if (redirectUser) {
      if (redirectUser.userType === 'TA' || redirectUser.userType === 'Staff') {
        redirectUrl = `${clientUrl}/staff/my-registrations?payment_success=true&event_title=${encodeURIComponent(eventTitle || 'the event')}`;
      } else if (redirectUser.userType === 'Professor') {
        redirectUrl = `${clientUrl}/professor/events?payment_success=true&event_title=${encodeURIComponent(eventTitle || 'the event')}`;
      } else if (redirectUser.userType === 'Student') {
        redirectUrl = `${clientUrl}/student/my-registrations?payment_success=true&event_title=${encodeURIComponent(eventTitle || 'the event')}`;
      }
    }
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Error processing payment success:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/payment-error?error=${encodeURIComponent(error.message)}`);
  }
};

