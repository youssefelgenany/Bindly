# Stripe Payment Integration for Vendor Booth/Bazaar Participation Fees

## Overview

This document explains how Stripe payment is integrated for vendor participation fees in the Bindly platform. When a vendor's booth/bazaar request is accepted, they have 3 days to pay the participation fee via Stripe.

## How It Works

### 1. **Request Acceptance Flow**
- Admin accepts a vendor's booth/bazaar request
- System automatically calculates participation fee based on:
  - **For Bazaar**: Booth size (2x2, 4x4) and location
  - **For Booth**: Duration (weeks) and location
- Payment deadline is set to 3 days from acceptance
- Vendor receives acceptance email with fee and deadline

### 2. **Vendor Payment Flow**
```
Vendor Dashboard → Payment Button → Stripe Checkout → Payment Confirmation
```

1. Vendor navigates to "My Accepted Events"
2. Finds the accepted request and clicks "Payment" button
3. Modal shows amount due and payment deadline
4. Clicking "Pay Now" redirects to Stripe checkout
5. After successful payment, Stripe redirects back to success page
6. Payment status is marked as "paid"

## Environment Variables Required

Add these to your `.env` file in the `backend` directory:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URLs for Stripe redirects
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
```

### Getting Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API Keys**
3. Copy the **Secret Key** (starts with `sk_`)
4. Copy the **Publishable Key** (for future use, starts with `pk_`)

### Setting Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `http://your-backend-url/api/webhooks/stripe`
4. Events to listen for: `checkout.session.completed`
5. Copy the **Signing Secret** (starts with `whsec_`)

## Testing Stripe Locally

### Using Stripe Test Mode

Stripe provides test card numbers for testing:

**Successful Payment:**
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)

**Payment Requires Authentication:**
- Card Number: `4000 0025 0000 3155`
- Expiry: Any future date
- CVC: Any 3 digits

**Always Declined:**
- Card Number: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

### Running Locally

1. **Start Backend Server**
   ```bash
   cd backend
   npm install stripe  # if not already installed
   npm start
   ```

2. **Start Frontend Dev Server**
   ```bash
   cd frontend
   npm start
   ```

3. **Test Payment Flow**
   - Log in as Admin → Accept a vendor request
   - Log in as Vendor → Go to "My Accepted Events"
   - Click "Payment" on the accepted request
   - Use Stripe test card numbers to complete payment

## API Endpoints

### Create Stripe Checkout Session (Vendor Payment)
```
POST /api/vendor-requests/:requestId/payment
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "paymentMethod": "card"
}

Response (200 OK):
{
  "success": true,
  "message": "Stripe checkout session created",
  "checkoutUrl": "https://checkout.stripe.com/pay/...",
  "sessionId": "cs_test_..."
}
```

### Stripe Webhook (Automatic)
```
POST /api/webhooks/stripe
Content-Type: application/json

Handles:
- checkout.session.completed: Updates payment status to "paid"
- Sends receipt email to vendor
- Updates vendor request status
```

## Fee Calculation

### Bazaar Booth Fees
| Size | Base | Main Entrance (1.5x) | Food Court (1.3x) | Parking (0.9x) |
|------|------|-----|---------|---------|
| 2x2  | 100  | 150 | 130     | 90      |
| 4x4  | 200  | 300 | 260     | 180     |

### Platform Booth Fees
| Duration | Base | Main Entrance (1.5x) | Food Court (1.3x) |
|----------|------|-----|---------|
| 1 Week   | 150  | 225 | 195     |
| 2 Weeks  | 300  | 450 | 390     |
| 4 Weeks  | 600  | 900 | 780     |

**Location Multipliers:**
- `main-entrance`: 1.5x
- `food-court`: 1.3x
- `central-plaza`: 1.2x
- `student-center`: 1.1x
- `parking-lot`: 0.9x
- `garden-section`: 1.0x
- `library-area`: 1.0x
- `gym-entrance`: 1.0x
- `auditorium-hall`: 1.1x
- `cafeteria-area`: 1.0x

## Payment Workflow in Backend

### 1. Accept Request (Admin)
```javascript
// Admin accepts vendor request
PUT /api/vendor-requests/:requestId/update-status
{
  "status": "accepted"
}

// Backend automatically:
// 1. Calculates participation fee
// 2. Sets paymentStatus = "pending"
// 3. Sets paymentDeadline = now + 3 days
// 4. Sends acceptance email with payment details
```

### 2. Vendor Initiates Payment
```javascript
// Vendor requests checkout session
POST /api/vendor-requests/:requestId/payment
{
  "paymentMethod": "card"
}

// Backend:
// 1. Creates Payment record with status "pending"
// 2. Creates Stripe checkout session
// 3. Returns checkout URL
```

### 3. Stripe Webhook Processing
```javascript
// Stripe sends webhook when payment completes
POST /api/webhooks/stripe (webhook)

// Backend:
// 1. Verifies webhook signature
// 2. Finds Payment and VendorRequest records
// 3. Updates payment status to "success"
// 4. Updates vendorRequest.paymentStatus to "paid"
// 5. Sends receipt email
// 6. Records paidAt timestamp
```

## Frontend Components

### VendorAcceptedEvents.jsx
- Displays accepted requests with payment status
- Shows "Payment" button for unpaid requests
- Shows "✓ Paid" for completed payments
- Opens payment modal with amount and deadline
- Redirects to Stripe checkout on submission

### PaymentSuccess.jsx
- Displays success message after payment
- Shows event details and amount paid
- Provides navigation back to dashboard

### PaymentCancel.jsx
- Displayed if vendor cancels payment on Stripe
- Shows information about retry options
- Allows returning to dashboard or retrying payment

## Troubleshooting

### "Stripe is not configured"
- ✅ Check `.env` file has `STRIPE_SECRET_KEY`
- ✅ Restart backend server after adding `.env`
- ✅ For development, check `NODE_ENV` is not "production"

### Payment appears in webhook but not in database
- Check webhook logs in Stripe dashboard
- Verify webhook secret is correct
- Check backend console for processing errors
- Manually trigger webhook replay from Stripe dashboard

### Vendor not receiving confirmation email
- Check SMTP is configured in `.env`
- Emails are stored in database if SMTP fails
- View stored emails at: `GET /api/dev/emails`

### Payment shows as pending but never completes
- Webhook may not have been delivered
- Manually verify in Stripe dashboard
- Use `GET /api/events/verify-payment?sessionId=...` endpoint

## Testing Checklist

- [ ] Stripe keys added to `.env`
- [ ] Webhooks configured in Stripe dashboard
- [ ] Backend and frontend running locally
- [ ] Admin can accept vendor request
- [ ] Payment fee calculated correctly
- [ ] Vendor receives acceptance email
- [ ] Vendor can click Payment button
- [ ] Redirects to Stripe checkout
- [ ] Can enter test card details
- [ ] Payment succeeds
- [ ] Redirects to success page
- [ ] Payment status updated to "paid"
- [ ] Receipt email sent
- [ ] Cannot pay again (button shows "✓ Paid")

## Production Deployment

1. **Get Live Stripe Keys**
   - Switch from "Test Mode" to "Live Mode" in Stripe dashboard
   - Copy live secret key (starts with `sk_live_`)

2. **Update Environment**
   - Add live keys to production `.env`
   - Update webhook secret to live webhook secret
   - Ensure `FRONTEND_URL` points to production domain

3. **Verify Webhooks**
   - Add production webhook in Stripe dashboard
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Enable event: `checkout.session.completed`

4. **Test with Real Card**
   - Use actual test card or small payment
   - Verify payment completes
   - Check database for Payment record
   - Verify vendor receives email

## Related Files

- Backend: `controllers/vendorRequestController.js` - Payment endpoint
- Backend: `controllers/stripeWebhookController.js` - Webhook handler
- Frontend: `pages/VendorAcceptedEvents.jsx` - Payment UI
- Frontend: `pages/PaymentSuccess.jsx` - Success page
- Frontend: `pages/PaymentCancel.jsx` - Cancellation page
- Models: `models/paymentModel.js` - Payment schema
- Models: `models/vendorRequest.js` - VendorRequest schema

## Support

For issues or questions:
- Check backend console for errors
- Enable Stripe debug logging
- Review webhook logs in Stripe dashboard
- Contact: events@guc.edu.eg
