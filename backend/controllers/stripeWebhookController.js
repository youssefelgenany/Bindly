let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.warn('⚠️ Stripe module not installed. Stripe webhook functionality will be disabled.');
  console.warn('   To enable Stripe, run: npm install stripe');
}
const Payment = require('../models/paymentModel');
const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const User = require('../models/userModel');
const { sendReceiptEmail } = require('../utils/sendReceiptEmail');

// Stripe webhook handler
module.exports = async (req, res) => {
  if (!stripe) {
    return res.status(500).send('Stripe is not configured');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured. Webhook verification disabled.');
    // In development, allow webhook without verification
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).send('Webhook secret not configured');
    }
  }

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development, parse event without verification
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('🔔 Webhook: checkout.session.completed received for session:', session.id);
    console.log('📋 Session payment status:', session.payment_status);

    try {
      // Find the pending payment
      const payment = await Payment.findOne({ stripeSessionId: session.id });
      
      if (!payment) {
        console.error('❌ Payment not found for session:', session.id);
        return res.status(404).json({ error: 'Payment not found' });
      }

      console.log('💳 Found payment record. Current status:', payment.status);

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

      console.log('✅ Payment completed successfully for session:', session.id);
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  res.json({ received: true });
};

