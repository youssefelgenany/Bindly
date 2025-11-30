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

    // Fetch user once for all operations (registration, wallet transaction, email, redirect)
    const user = await User.findById(payment.user);
    let eventTitle = 'Event'; // Declare outside if block for redirect use

    // Check if this is a vendor request payment
    if (payment.vendorRequest) {
      console.log('🔍 Processing vendor request payment...');
      const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
      if (vendorRequest) {
        vendorRequest.paymentStatus = 'paid';
        vendorRequest.paidAt = new Date();
        await vendorRequest.save();
        console.log('✅ Vendor request marked as paid');
        
        // Build event title for vendor request
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
        if (user && user.email) {
          registration = await StudentRegistration.findOne({
            $or: [
              { event: payment.event, student: user._id },
              { event: payment.event, studentEmail: user.email.toLowerCase(), student: { $exists: false } } // Fallback for old records
            ]
          });
        }
      }

      if (registration) {
        console.log('✅ Found registration, marking as paid...');
        registration.paid = true;
        await registration.save();
        console.log('✅ Registration marked as paid');
        
        // Create wallet transaction record for card payments (for transaction history)
        if (user) {
          if (!user.walletTransactions) {
            user.walletTransactions = [];
          }
          // Check if transaction already exists to avoid duplicates
          const existingTx = user.walletTransactions.find(
            tx => tx.reference === payment._id.toString() && tx.type === 'payment'
          );
          
          if (!existingTx) {
            // Get event/trip title for description
            const Event = require('../models/eventModel');
            const Trip = require('../models/tripModel');
            let event = await Event.findById(payment.event);
            if (!event) {
              event = await Trip.findById(payment.event);
            }
            const eventTitle = event ? (event.title || event.name || 'Event') : 'Event';
            
            // Calculate current balance from existing transactions if walletBalance is null/undefined
            let currentBalance = user.walletBalance;
            if (currentBalance === null || currentBalance === undefined) {
              currentBalance = (user.walletTransactions || []).reduce((sum, tx) => {
                return sum + (parseFloat(tx.amount) || 0);
              }, 0);
              // Update walletBalance if it was null/undefined
              user.walletBalance = currentBalance;
            }
            // Ensure balance is a number
            currentBalance = typeof currentBalance === 'number' ? currentBalance : parseFloat(currentBalance) || 0;
            
            // For card payments, balance doesn't change, so balanceAfter = currentBalance
            user.walletTransactions.push({
              amount: -payment.amount, // Negative for payment
              type: 'payment',
              description: `Payment for ${eventTitle} (Card)`,
              balanceAfter: currentBalance, // Balance doesn't change for card payments
              reference: payment._id.toString(),
              createdAt: new Date()
            });
            await user.save();
            console.log('✅ Wallet transaction record created for card payment. Balance:', currentBalance);
          } else {
            console.log('ℹ️ Wallet transaction already exists for this payment');
          }
        }
      } else {
        console.error('❌ Registration not found for payment:', payment._id);
      }
      
      // Get event/trip title for email and redirect
      if (!eventTitle || eventTitle === 'Event') {
        const Event = require('../models/eventModel');
        const Trip = require('../models/tripModel');
        let event = await Event.findById(payment.event);
        if (!event) {
          event = await Trip.findById(payment.event);
        }
        eventTitle = event ? (event.title || event.name || 'Event') : 'Event';
      }
    }

    // Send receipt email
    console.log('📧 Sending receipt email...');
    if (user) {
      // Get user's name for greeting (works for all user types: Student, Staff, TA, Professor, Vendor)
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.companyName || user.email;
      console.log('📧 User type:', user.userType || 'Unknown', 'Email:', user.email);
      let receiptDetails = {};
      
      if (payment.vendorRequest) {
        const vendorRequest = await VendorRequest.findById(payment.vendorRequest);
        if (vendorRequest) {
          // Build additional details for receipt
          receiptDetails = {
            eventType: vendorRequest.eventType,
            boothSize: vendorRequest.boothSize,
            durationWeeks: vendorRequest.durationWeeks,
            boothLocation: vendorRequest.boothLocation
          };
        }
      }
        
      try {
        const emailResult = await sendReceiptEmail(
          user.email,
          userName,
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
    let redirectUrl = `${clientUrl}/payment-success?session_id=${session_id}`;
    
    if (user) {
      if (user.userType === 'TA' || user.userType === 'Staff') {
        redirectUrl = `${clientUrl}/staff/my-registrations?payment_success=true&event_title=${encodeURIComponent(eventTitle || 'the event')}`;
      } else if (user.userType === 'Professor') {
        redirectUrl = `${clientUrl}/professor/events?payment_success=true&event_title=${encodeURIComponent(eventTitle || 'the event')}`;
      } else if (user.userType === 'Student') {
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

