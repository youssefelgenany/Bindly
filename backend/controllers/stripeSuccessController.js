const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Payment = require('../models/paymentModel');
const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
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

    // Mark registration as paid
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

    // Send receipt email
    console.log('📧 Sending receipt email...');
    const user = await User.findById(payment.user);
    if (user) {
      const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
      const Event = require('../models/eventModel');
      const Trip = require('../models/tripModel');
      let event = await Event.findById(payment.event);
      if (!event) {
        event = await Trip.findById(payment.event);
      }
      const eventTitle = event ? (event.title || event.name || 'Event') : 'Event';
      
      try {
        const emailResult = await sendReceiptEmail(
          user.email,
          userName,
          eventTitle,
          payment.amount,
          'card',
          new Date()
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

    // Redirect to success page
    console.log('✅ Payment processing complete. Redirecting...');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/payment-success?session_id=${session_id}`);
  } catch (error) {
    console.error('❌ Error processing payment success:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/payment-error?error=${encodeURIComponent(error.message)}`);
  }
};

