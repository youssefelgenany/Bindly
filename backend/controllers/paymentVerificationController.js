const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Payment = require('../models/paymentModel');
const Registration = require('../models/registrationModel');
const StudentRegistration = require('../models/studentRegistrationModel');
const User = require('../models/userModel');
const { sendReceiptEmail } = require('../utils/sendReceiptEmail');

// Manual payment verification endpoint (for testing/debugging)
exports.verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        msg: 'sessionId is required'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        msg: 'Stripe is not configured'
      });
    }

    console.log('🔍 Verifying payment for session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('📋 Session payment status:', session.payment_status);

    // Find the payment record
    const payment = await Payment.findOne({ stripeSessionId: sessionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        msg: 'Payment record not found'
      });
    }

    // Check if payment is already successful
    if (payment.status === 'success') {
      return res.status(200).json({
        success: true,
        msg: 'Payment already verified and processed',
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          method: payment.paymentMethod
        }
      });
    }

    // If Stripe says it's paid but our DB says pending, update it
    if (session.payment_status === 'paid' && payment.status === 'pending') {
      console.log('🔄 Updating payment status from pending to success...');

      // Update payment status
      payment.status = 'success';
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      // Mark registration as paid
      let registration = await Registration.findOne({
        event: payment.event,
        user: payment.user
      });

      if (!registration) {
        const user = await User.findById(payment.user);
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
        registration.paid = true;
        await registration.save();
        console.log('✅ Registration marked as paid');
        
        // Create wallet transaction record for card payments (for transaction history)
        const user = await User.findById(payment.user);
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
      }

      // Send receipt email
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
          await sendReceiptEmail(
            user.email,
            userName,
            eventTitle,
            payment.amount,
            'card',
            new Date()
          );
          console.log('✅ Receipt email sent');
        } catch (emailError) {
          console.error('❌ Failed to send receipt email:', emailError);
        }
      }

      // Get event details for response
      const Event = require('../models/eventModel');
      const Trip = require('../models/tripModel');
      let event = await Event.findById(payment.event);
      if (!event) {
        event = await Trip.findById(payment.event);
      }

      return res.status(200).json({
        success: true,
        msg: 'Payment verified and processed successfully',
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          method: payment.paymentMethod,
          event: payment.event
        },
        event: event ? {
          _id: event._id,
          title: event.title || event.name,
          type: event.type
        } : null
      });
    }

    // Payment not yet completed in Stripe
    return res.status(200).json({
      success: false,
      msg: 'Payment not yet completed in Stripe',
      stripeStatus: session.payment_status,
      paymentStatus: payment.status
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      msg: 'Error verifying payment',
      error: error.message
    });
  }
};

