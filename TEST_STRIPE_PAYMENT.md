# ✅ Stripe Payment - Ready to Test!

## Configuration Status

✅ **All systems ready!**

- Stripe Secret Key: Configured
- Stripe Webhook Secret: Configured  
- Client URL: http://localhost:3000
- Stripe Package: Installed v19.3.1
- MongoDB: Connected
- SMTP: Configured

## Test Payment Flow (Complete Guide)

### 1️⃣ Start Backend Server
```powershell
cd backend
npm start
```

Expected output:
```
✅ Server running on port 5000
✅ Stripe webhook endpoint registered
✅ Connected to MongoDB
```

### 2️⃣ Start Frontend Server (New Terminal)
```powershell
cd frontend
npm start
```

Frontend runs on: http://localhost:3000

### 3️⃣ Test as Admin - Accept Vendor Request

1. Navigate to: http://localhost:3000/login
2. Login as **Admin**
3. Go to **Admin Dashboard** → **Vendor Requests**
4. Find a vendor request (or create one)
5. Click **Accept** button
6. System automatically:
   - ✅ Calculates participation fee
   - ✅ Sets 3-day payment deadline
   - ✅ Sends acceptance email to vendor

### 4️⃣ Test as Vendor - Make Payment

1. **Logout** from admin account
2. Login as **Vendor** (the one whose request was accepted)
3. Navigate to: **My Accepted Events** or **Vendor Dashboard**
4. Find the accepted request
5. You should see:
   - Status: "Accepted"
   - Button: **Payment** (not "✓ Paid")
   - Participation fee amount

### 5️⃣ Click Payment Button

1. Click the **Payment** button
2. Modal opens showing:
   - 💰 Amount to Pay (e.g., "150 EGP")
   - 📅 Payment Deadline (e.g., "Dec 28, 2025")
   - ✓ Secure payment via Stripe message
3. Click **Pay Now**

### 6️⃣ Stripe Checkout Page

You'll be redirected to Stripe checkout. Fill in:

**Test Card Details:**
```
Card Number:     4242 4242 4242 4242
Expiration:      12/25 (any future date)
CVC:             123 (any 3 digits)
Name:            Any name
```

Click **Pay** to complete payment.

### 7️⃣ Payment Success

After successful payment:
1. ✅ Redirected to Success page
2. ✅ See: "Payment of 150 EGP via card has been processed"
3. ✅ Button now shows "✓ Paid" (disabled)
4. ✅ Email receipt sent to vendor

## Verify in Database

To confirm payment was recorded:

**MongoDB Query:**
```javascript
// View all payments
db.payments.find({})

// View specific vendor payment
db.payments.findOne({ vendorRequest: ObjectId("...") })

// Should show:
{
  user: ObjectId("..."),
  vendorRequest: ObjectId("..."),
  amount: 150,
  paymentMethod: "card",
  status: "success",
  stripeSessionId: "cs_test_...",
  stripePaymentIntentId: "pi_test_...",
  createdAt: ISODate("...")
}
```

## Test Different Scenarios

### Scenario 1: Successful Payment ✅
- Use card: **4242 4242 4242 4242**
- Result: Payment succeeds immediately
- Database: status = "success"

### Scenario 2: Declined Card ❌
- Use card: **4000 0000 0000 0002**
- Result: Payment declined
- Stripe shows error
- Vendor can retry

### Scenario 3: Cancel Payment
- During Stripe checkout, click browser back or "Cancel"
- Redirected to: http://localhost:3000/payment-cancel
- Shows: "Payment Cancelled" page
- Can retry payment
- Request stays in "Accepted" status

### Scenario 4: Retry Payment
- If payment failed or was cancelled
- Vendor returns to "My Accepted Events"
- Clicks Payment button again
- Can retry unlimited times before deadline

## Check Backend Logs

In the backend console, you should see:

```
✅ Payment endpoint called
🔄 Creating Stripe checkout session
💳 Session created: cs_test_...
🔔 Webhook: checkout.session.completed received
🔄 Updating payment status to success
✅ Payment marked as successful
📧 Receipt email sent to vendor
```

## Email Verification

If SMTP is configured:
- Vendor receives acceptance email when request accepted
- Vendor receives receipt email when payment completes

If SMTP not configured:
- Emails stored in database
- View at: `GET http://localhost:5000/api/dev/emails`

## Troubleshooting

### "Stripe checkout redirect fails"
- ✅ Check CLIENT_URL in .env is http://localhost:3000
- ✅ Restart backend server
- ✅ Check console for errors

### "Payment button doesn't appear"
- ✅ Make sure request status is "accepted"
- ✅ Refresh page
- ✅ Check backend shows participationFee calculated

### "Webhook not processing"
- ✅ Check STRIPE_WEBHOOK_SECRET in .env
- ✅ Stripe automatically sends webhooks in test mode
- ✅ Check backend console for webhook logs

### "Payment shows as pending in DB"
- ⏱️ Wait 5-10 seconds for webhook
- 🔄 Refresh page
- 📍 Manually verify: Hit `/api/events/verify-payment?sessionId=...`

## Production Readiness Checklist

When ready for production:
- [ ] Get live Stripe keys (not test keys)
- [ ] Update STRIPE_SECRET_KEY in .env
- [ ] Update STRIPE_WEBHOOK_SECRET in .env
- [ ] Configure webhook in Stripe dashboard for production
- [ ] Set NODE_ENV=production
- [ ] Update CLIENT_URL to production domain
- [ ] Test with real card (optional)
- [ ] Monitor Stripe dashboard

## Quick Links

- 📊 Stripe Dashboard: https://dashboard.stripe.com
- 📋 Test Transactions: https://dashboard.stripe.com/test/payments
- 🔔 Webhooks: https://dashboard.stripe.com/test/webhooks
- 📚 Docs: See STRIPE_QUICK_START.md

---

**Status: ✅ Ready for Testing**

Start testing now with: `npm start` in both backend and frontend!
