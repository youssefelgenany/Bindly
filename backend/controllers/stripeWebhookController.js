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
const VendorRequest = require('../models/vendorRequest');
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

      // Fetch user once for both registration check, wallet transaction, and email
      const user = await User.findById(payment.user);
      
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
      }

      // Send receipt email
      console.log('📧 Sending receipt email...');
      if (user) {
        // Get vendor's personal name for greeting
        const vendorPersonalName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.companyName || user.email;
        let eventTitle = 'Event';
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

      console.log('✅ Payment completed successfully for session:', session.id);
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  res.json({ received: true });
};

