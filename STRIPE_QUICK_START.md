# Quick Start: Stripe Payment for Vendor Booth Fees

## 5-Minute Setup

### 1. Get Stripe Keys (2 min)
1. Go to https://stripe.com and sign up (or login)
2. Go to **Developers** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_`)

### 2. Configure Backend (2 min)
Create/update `.env` file in `backend/` folder:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_key_here
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
```

### 3. Start Application (1 min)
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

## Test the Payment Flow

### 1. Accept a Vendor Request (as Admin)
- Navigate to Admin → Vendor Requests
- Accept any pending booth/bazaar request
- Vendor receives email with payment details

### 2. Make Payment (as Vendor)
- Login as Vendor
- Go to "My Accepted Events"
- Click "Payment" on the accepted request
- Review amount and deadline
- Click "Pay Now"

### 3. Complete Payment
- You'll be redirected to Stripe checkout
- Enter test card: **4242 4242 4242 4242**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- Click "Pay"

### 4. Verify Success
- Should see success page
- Database shows `paymentStatus: "paid"`
- "Payment" button changes to "✓ Paid"

## Test Cards

| Scenario | Card Number | Result |
|----------|-------------|--------|
| ✅ Success | 4242 4242 4242 4242 | Payment succeeds |
| ⚠️ Decline | 4000 0000 0000 0002 | Payment declined |
| 🔐 Auth Required | 4000 0025 0000 3155 | Extra verification |

For any date/CVC, use: Expiry `12/25`, CVC `123`

## Optional: Webhook Testing (Advanced)

To test webhooks locally without Stripe CLI:
1. Stripe automatically sends webhooks when payment completes
2. Check backend console for webhook logs
3. In production, configure webhook endpoint in Stripe dashboard

## Files You Need to Know About

### Configuration
- `backend/.env` - Your Stripe keys go here

### Frontend
- `frontend/src/pages/VendorAcceptedEvents.jsx` - Payment button
- `frontend/src/pages/PaymentSuccess.jsx` - Success page
- `frontend/src/pages/PaymentCancel.jsx` - Cancellation page

### Backend
- `backend/controllers/vendorRequestController.js` - Creates checkout session
- `backend/controllers/stripeWebhookController.js` - Processes payments
- `backend/models/paymentModel.js` - Payment records

## Common Issues

**"Stripe is not configured"**
- ✅ Check STRIPE_SECRET_KEY in .env
- ✅ Restart backend after adding .env

**"Failed to initiate payment"**
- ✅ Check backend is running (port 5000)
- ✅ Check FRONTEND_URL is correct in .env

**Payment not shown in database**
- ✅ Webhook might be delayed (check in 10 seconds)
- ✅ Check backend console for webhook errors
- ✅ Manually verify: Hit `/api/events/verify-payment?sessionId=...`

## Next: Production Setup

When ready to deploy:
1. Get **live** Stripe keys (not test keys)
2. Switch Stripe dashboard to "Live Mode"
3. Add webhook endpoint for production domain
4. Update `.env` with live keys
5. Update FRONTEND_URL to your domain

See `STRIPE_PAYMENT_SETUP.md` for full production guide.

## Support

- Backend Console: Shows logs for debugging
- Stripe Dashboard: View all transactions
- Email Testing: Check `GET /api/dev/emails` if SMTP not configured

**Questions?** Check `STRIPE_PAYMENT_SETUP.md` or contact events@guc.edu.eg
