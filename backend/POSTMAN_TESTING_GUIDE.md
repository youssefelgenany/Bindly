# Postman Testing Guide for Bindly Authentication

## Setup

### 1. Environment Variables
Create a new environment in Postman with these variables:
- `base_url`: `http://localhost:5000`
- `frontend_url`: `http://localhost:3000`

### 2. Install Dependencies
Make sure you've installed the new dependencies:
```bash
cd backend
npm install
```

### 3. Environment File
Create/update your `.env` file with:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

# SMTP settings (for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Bindly <no-reply@bindly.app>"
```

## Test Cases

### 1. Student Signup (with email verification)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "john.doe@student.guc.edu.eg",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "Student",
  "gucId": "34-1234"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User created. Verification email sent.",
  "user": {
    "id": "user_id",
    "email": "john.doe@student.guc.edu.eg",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "Student",
    "gucId": "34-1234",
    "companyName": null,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Staff Signup (no verification required)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "staff@guc.edu.eg",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "userType": "Staff",
  "gucId": "STAFF-001"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "email": "staff@guc.edu.eg",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Staff",
    "gucId": "STAFF-001",
    "companyName": null,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Vendor Signup (with file uploads)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: Remove `Content-Type` (let Postman set it automatically for multipart)
- Body (form-data):
  - `email`: `vendor@company.com`
  - `password`: `password123`
  - `firstName`: `Mike`
  - `lastName`: `Johnson`
  - `userType`: `Vendor`
  - `companyName`: `Tech Solutions Inc`
  - `vendorLogo`: (Select File) - Choose an image file (PNG, JPG, etc.)
  - `vendorTaxCard`: (Select File) - Choose an image or PDF file

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "email": "vendor@company.com",
    "firstName": "Mike",
    "lastName": "Johnson",
    "userType": "Vendor",
    "gucId": null,
    "companyName": "Tech Solutions Inc",
    "vendorLogoPath": "/uploads/logo-123456789.png",
    "vendorTaxCardPath": "/uploads/taxcard-123456789.pdf",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Student Login (before verification)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "john.doe@student.guc.edu.eg",
  "password": "password123"
}
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in"
}
```

### 5. Staff Login (should work)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "staff@guc.edu.eg",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "staff@guc.edu.eg",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Staff",
    "gucId": "STAFF-001",
    "companyName": null,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 6. Email Verification (for Student)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/auth/verify-email?token=VERIFICATION_TOKEN_FROM_EMAIL`
- Note: You'll need to check your email for the verification link and extract the token

**Expected Response:**
- Status: 302 Redirect
- Location: `{{frontend_url}}/login`

### 7. Student Login (after verification)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "john.doe@student.guc.edu.eg",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "john.doe@student.guc.edu.eg",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "Student",
    "gucId": "34-1234",
    "companyName": null,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

## Error Test Cases

### 1. Invalid GUC Email for Student

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "invalid@gmail.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "Student",
  "gucId": "34-1234"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "GUC users must use a valid GUC email address (@student.guc.edu.eg or @guc.edu.eg)"
}
```

### 2. Vendor without Files

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "vendor@company.com",
  "password": "password123",
  "firstName": "Mike",
  "lastName": "Johnson",
  "userType": "Vendor",
  "companyName": "Tech Solutions Inc"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Vendor must upload both logo and tax card"
}
```

### 3. Duplicate Email

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "john.doe@student.guc.edu.eg",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "Student",
  "gucId": "34-1234"
}
```

**Expected Response (409):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

## Testing File Uploads

### 1. Test Uploaded Files Access

After successful vendor signup, test if files are accessible:

**Request:**
- Method: `GET`
- URL: `{{base_url}}/uploads/FILENAME_FROM_RESPONSE`
- Example: `{{base_url}}/uploads/logo-123456789.png`

**Expected Response:**
- Status: 200
- Content-Type: image/png or application/pdf
- File content

## Postman Collection Setup

### 1. Create a Collection
1. Create a new collection called "Bindly Auth API"
2. Add all the requests above
3. Set up environment variables

### 2. Pre-request Scripts
For requests that need the base URL, add this pre-request script:
```javascript
pm.environment.set("base_url", "http://localhost:5000");
```

### 3. Tests Scripts
Add these tests to your requests:

**For successful signup:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has success true", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("User type is correct", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.user.userType).to.eql("Student");
});
```

**For successful login:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
});

pm.test("Save token for future requests", function () {
    var jsonData = pm.response.json();
    pm.environment.set("auth_token", jsonData.token);
});
```

## Troubleshooting

### 1. Server Not Starting
- Check if MongoDB is running
- Verify environment variables
- Check console for errors

### 2. Email Not Sending
- Verify SMTP settings in .env
- Check if using Gmail, enable 2FA and use app password
- Check server logs for email errors

### 3. File Upload Issues
- Ensure uploads directory exists
- Check file size limits (5MB max)
- Verify file types (images/PDF only)

### 4. Database Issues
- Clear database between tests if needed
- Check MongoDB connection string
- Verify collection permissions

## Quick Test Sequence

1. Start your server: `npm run dev`
2. Test Student signup
3. Check email for verification link
4. Test Student login (should fail)
5. Click verification link or use GET request
6. Test Student login (should succeed)
7. Test Staff signup and login
8. Test Vendor signup with files
9. Test Vendor login
10. Test error cases

This should give you comprehensive coverage of all authentication features!

---

## Vendor Payment System Testing Guide

### Prerequisites
1. You need two accounts:
   - **Admin account** (to accept vendor requests)
   - **Vendor account** (to make payments)
2. At least one vendor request that is pending or accepted

---

## Step-by-Step Testing

### Step 1: Login as Admin

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userType": "Admin",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Action:** Copy the `token` from the response. Save it as `admin_token` in Postman environment.

---

### Step 2: Get Vendor Requests (as Admin)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor-requests`
- Headers:
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": true,
  "requests": [
    {
      "_id": "68f302e4c3d0d324de8a03af",
      "status": "pending",
      "eventName": "bazzzaaaaarr",
      "eventType": "bazaar",
      "vendor": {
        "_id": "68f0ddb2c16dbad1bc0ce5be",
        "email": "vendor@example.com"
      },
      ...
    }
  ]
}
```

**Action:** Copy a `_id` from a pending request. Save it as `vendor_request_id` in Postman environment.

---

### Step 3: Accept Vendor Request (as Admin)

**Request:**
- Method: `PATCH`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/status`
- Headers:
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "status": "accepted"
}
```

**Expected Response:**
```json
{
  "message": "Vendor request accepted successfully.",
  "updatedRequest": {
    "_id": "68f302e4c3d0d324de8a03af",
    "status": "accepted",
    "participationFee": 150,
    "paymentStatus": "pending",
    "paymentDeadline": "2025-01-20T12:00:00.000Z",
    ...
  }
}
```

**Check Backend Console:**
You should see:
```
💰 Calculated participation fee: 150 EGP
📅 Payment deadline: 2025-01-20T12:00:00.000Z
✅ Email notification sent to vendor: vendor@example.com
```

**Action:** Note the `participationFee` and `paymentDeadline` from the response.

---

### Step 4: Login as Vendor

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "mazenmossad.01@gmail.com",
  "password": "your-vendor-password"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userType": "Vendor",
    "id": "68f0ddb2c16dbad1bc0ce5be",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Action:** Copy the `token` from the response. Save it as `vendor_token` in Postman environment.

---

### Step 5: View Payment Details (as Vendor)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "requestId": "68f302e4c3d0d324de8a03af",
    "eventName": "bazzzaaaaarr",
    "eventType": "bazaar",
    "amount": 150,
    "paymentStatus": "pending",
    "paymentDeadline": "2025-01-20T12:00:00.000Z",
    "paidAt": null,
    "daysUntilDeadline": 3,
    "isOverdue": false,
    "isPaid": false
  }
}
```

**Verify:**
- ✅ `amount` matches the fee calculated in Step 3
- ✅ `paymentDeadline` is 3 days from acceptance
- ✅ `paymentStatus` is "pending"
- ✅ `isPaid` is false

---

### Step 6A: Pay with Wallet (as Vendor)

**Prerequisites:** Vendor must have sufficient wallet balance.

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "paymentMethod": "wallet"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "payment": {
    "id": "68f5a1b2c3d4e5f6g7h8i9j0k",
    "amount": 150,
    "method": "wallet",
    "status": "success",
    "paidAt": "2025-01-17T12:00:00.000Z"
  }
}
```

**Expected Response (Insufficient Balance):**
```json
{
  "success": false,
  "message": "Insufficient wallet balance",
  "required": 150,
  "available": 50
}
```

**Verify:**
1. Check payment status again (Step 5) - should show `isPaid: true`
2. Check vendor's wallet balance was deducted
3. Check backend console for payment confirmation

---

### Step 6B: Pay with Card (as Vendor)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "paymentMethod": "card"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Stripe checkout session created",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Action:**
1. Copy the `checkoutUrl` from the response
2. Open it in a browser
3. Use Stripe test card: `4242 4242 4242 4242`
4. Use any future expiry date (e.g., 12/25)
5. Use any 3-digit CVC (e.g., 123)
6. Complete the payment

**After Payment:**
- Stripe webhook will automatically mark the payment as successful
- Check backend console for webhook processing
- Verify payment status (Step 5) - should show `isPaid: true`

---

### Step 7: Verify Payment Status (as Vendor)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response (After Payment):**
```json
{
  "success": true,
  "payment": {
    "requestId": "68f302e4c3d0d324de8a03af",
    "amount": 150,
    "paymentStatus": "paid",
    "paidAt": "2025-01-17T12:00:00.000Z",
    "isPaid": true,
    ...
  }
}
```

**Verify:**
- ✅ `paymentStatus` is "paid"
- ✅ `paidAt` has a timestamp
- ✅ `isPaid` is true

---

## Error Testing

### Test 1: Try to pay for non-existent request

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor-requests/invalid-id/payment`
- Headers: `Authorization: Bearer {{vendor_token}}`

**Expected Response:**
```json
{
  "success": false,
  "message": "Vendor request not found"
}
```

---

### Test 2: Try to pay for someone else's request

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers: `Authorization: Bearer {{other_vendor_token}}`
- Body: `{ "paymentMethod": "wallet" }`

**Expected Response:**
```json
{
  "success": false,
  "message": "You can only pay for your own vendor requests"
}
```

---

### Test 3: Try to pay for pending request

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor-requests/{{pending_request_id}}/payment`
- Headers: `Authorization: Bearer {{vendor_token}}`

**Expected Response:**
```json
{
  "success": false,
  "message": "Payment is only required for accepted requests"
}
```

---

### Test 4: Try to pay with invalid payment method

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/payment`
- Headers: `Authorization: Bearer {{vendor_token}}`
- Body: `{ "paymentMethod": "invalid" }`

**Expected Response:**
```json
{
  "success": false,
  "message": "Payment method must be 'wallet' or 'card'"
}
```

---

### Test 5: Try to pay already paid request

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{paid_request_id}}/payment`
- Headers: `Authorization: Bearer {{vendor_token}}`
- Body: `{ "paymentMethod": "wallet" }`

**Expected Response:**
```json
{
  "success": false,
  "message": "Payment already completed for this request"
}
```

---

## Fee Calculation Examples

### Bazaar Fee Calculation

**2x2 Booth:**
- Base: 100 EGP
- Main Entrance (1.5x): 150 EGP
- Food Court (1.3x): 130 EGP
- Parking Lot (0.9x): 90 EGP

**4x4 Booth:**
- Base: 200 EGP
- Main Entrance (1.5x): 300 EGP
- Food Court (1.3x): 260 EGP
- Parking Lot (0.9x): 180 EGP

### Booth Fee Calculation

**1 Week:**
- Base: 150 EGP
- Main Entrance (1.5x): 225 EGP
- Food Court (1.3x): 195 EGP

**2 Weeks:**
- Base: 300 EGP
- Main Entrance (1.5x): 450 EGP
- Food Court (1.3x): 390 EGP

**4 Weeks:**
- Base: 600 EGP
- Main Entrance (1.5x): 900 EGP
- Food Court (1.3x): 780 EGP

---

## Quick Test Checklist

- [ ] Login as Admin
- [ ] Get vendor requests list
- [ ] Accept a vendor request
- [ ] Verify fee calculation in response
- [ ] Check backend console for fee calculation log
- [ ] Login as Vendor
- [ ] View payment details
- [ ] Verify fee amount and deadline
- [ ] Pay with wallet (if sufficient balance)
- [ ] OR Pay with card (Stripe)
- [ ] Verify payment status updated
- [ ] Test error cases (invalid request, wrong vendor, etc.)

---

## Troubleshooting

### Payment not showing as paid
- Check Stripe webhook is configured
- Check backend console for webhook logs
- Manually verify payment in Stripe dashboard

### Fee calculation error
- Check request has required fields (boothSize for bazaar, durationWeeks for booth)
- Check backend console for calculation errors
- Verify location is valid enum value

### Wallet payment fails
- Check vendor has sufficient balance
- Verify walletBalance field exists in User model
- Check walletTransactions array is being updated

### Email not received
- Check SMTP settings in .env
- Check backend console for email logs
- Verify email is stored in database (if SMTP not configured)
- Check `/api/dev/emails` endpoint for stored emails

---

## Postman Collection Variables

Set these in your Postman environment:

```
admin_token = <token from admin login>
vendor_token = <token from vendor login>
vendor_request_id = <ID of vendor request>
base_url = http://localhost:5000
```

This completes the comprehensive testing guide for the vendor payment system!

---

## Payment Receipt Email Testing Guide

### Prerequisites
1. Vendor account with wallet balance (or use card payment)
2. At least one accepted vendor request that hasn't been paid yet

---

## Step-by-Step: Test Payment Receipt Email

### Step 1: Login as Vendor

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "mazenmossad.01@gmail.com",
  "password": "your-password"
}
```

**Action:** Copy the `token` from the response. Save it as `vendor_token`.

---

### Step 2: Create a Vendor Request (with details for receipt)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "eventType": "platformBooth",
  "durationWeeks": 2,
  "boothLocation": "main-entrance",
  "boothSize": "4x4",
  "attendees": [
    {
      "name": "Test User",
      "email": "test@example.com"
    }
  ],
  "message": "Testing receipt email with details"
}
```

**Expected Response:**
```json
{
  "message": "Application submitted"
}
```

**Action:** Copy the `_id` from the response (if provided) or get it from Step 3.

---

### Step 3: Get Your Vendor Requests (to find the request ID)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor/my/requests?status=pending`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`

**Action:** Find the request you just created and copy its `_id`. Save it as `request_id`.

---

### Step 4: Login as Admin

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Action:** Copy the `token` from the response. Save it as `admin_token`.

---

### Step 5: Accept the Vendor Request (as Admin)

**Request:**
- Method: `PATCH`
- URL: `{{base_url}}/api/vendor-requests/{{request_id}}/status`
- Headers:
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "status": "accepted"
}
```

**Expected Response:**
```json
{
  "message": "Vendor request accepted successfully.",
  "updatedRequest": {
    "_id": "...",
    "participationFee": 450,
    "paymentStatus": "pending",
    "paymentDeadline": "...",
    "eventType": "platformBooth",
    "durationWeeks": 2,
    "boothLocation": "main-entrance",
    "boothSize": "4x4",
    ...
  }
}
```

**Check Backend Console:**
You should see:
```
💰 Calculated participation fee: 450 EGP
📅 Payment deadline: ...
✅ Email notification sent to vendor: ...
```

---

### Step 6: Ensure Wallet Balance (if paying with wallet)

**If wallet balance is insufficient, add balance:**
```bash
cd backend
node add-wallet-balance.js mazenmossad.01@gmail.com 500
```

---

### Step 7: Pay with Wallet (as Vendor)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{request_id}}/payment`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "paymentMethod": "wallet"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "payment": {
    "id": "...",
    "amount": 450,
    "method": "wallet",
    "status": "success",
    "paidAt": "2025-11-14T..."
  }
}
```

**Check Backend Console:**
You should see:
```
✅ Payment receipt email sent to vendor: mazenmossad.01@gmail.com
```
or
```
✅ Payment receipt email stored in database for development
📧 View emails at: http://localhost:5000/api/dev/emails
```

---

### Step 8: View the Receipt Email

**Option A: Check Development Email Storage**

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/dev/emails`
- Headers: None needed

**Look for:**
- Email with `type: "payment_receipt"`
- Subject: `Payment Receipt - Platform Booth - {Event Name}` or similar
- Contains all payment details

**Option B: Check Your Email Inbox**

If SMTP is configured, check your email inbox for the receipt.

---

### Step 9: Verify Receipt Email Contents

The receipt email should contain:

**✅ Basic Information:**
- Greeting: "Hi Mazen," (personal name, not company name)
- Event: "Platform Booth - {Event Name}" or "Bazaar - {Event Name}"

**✅ Additional Details (if applicable):**
- Event Type: "Platform Booth" / "Bazaar" / etc.
- Booth Size: "4x4" (if applicable)
- Duration: "2 week(s)" (if applicable)
- Location: "Main Entrance" (if applicable)

**✅ Payment Information:**
- Amount Paid: "450.00 EGP" (in green)
- Payment Method: "Wallet Balance" or "Credit/Debit Card"
- Payment Date: Formatted date and time

**✅ Confirmation:**
- "✓ Payment Confirmed"
- Message: "Your participation fee has been paid successfully. Your vendor request is now confirmed!"

---

## Test Different Scenarios

### Test 1: Bazaar Receipt (with booth size and location)

**Create Request:**
```json
{
  "eventType": "bazaar",
  "boothSize": "4x4",
  "boothLocation": "main-entrance",
  "attendees": [{"name": "Test", "email": "test@example.com"}]
}
```

**Expected Receipt Shows:**
- Event: "Bazaar - {Event Name}"
- Event Type: "Bazaar"
- Booth Size: "4x4"
- Location: "Main Entrance"
- Amount: 300 EGP (200 × 1.5)

---

### Test 2: Booth Receipt (with duration and location)

**Create Request:**
```json
{
  "eventType": "platformBooth",
  "durationWeeks": 3,
  "boothLocation": "food-court",
  "attendees": [{"name": "Test", "email": "test@example.com"}]
}
```

**Expected Receipt Shows:**
- Event: "Platform Booth - {Event Name}"
- Event Type: "Platform Booth"
- Duration: "3 week(s)"
- Location: "Food Court"
- Amount: 585 EGP ((150 × 3) × 1.3)

---

### Test 3: Card Payment Receipt

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests/{{request_id}}/payment`
- Body: `{"paymentMethod": "card"}`

**Complete payment in Stripe checkout, then:**
- Receipt email will be sent automatically
- Check `/api/dev/emails` or your inbox

---

## Quick Test Checklist

- [ ] Login as Vendor
- [ ] Create vendor request with details (booth size, duration, location)
- [ ] Login as Admin
- [ ] Accept vendor request
- [ ] Verify fee calculated correctly
- [ ] Pay with wallet (or card)
- [ ] Check backend console for receipt email log
- [ ] View receipt email at `/api/dev/emails`
- [ ] Verify receipt contains:
  - [ ] Personal greeting (not company name)
  - [ ] Event name with type
  - [ ] Event Type field
  - [ ] Booth Size (if applicable)
  - [ ] Duration (if applicable)
  - [ ] Location (if applicable)
  - [ ] Amount paid
  - [ ] Payment method
  - [ ] Payment date
  - [ ] Confirmation message

---

## Troubleshooting

### Receipt email not showing
- Check backend console for email logs
- Check `/api/dev/emails` endpoint
- Verify SMTP settings if using production mode

### Missing details in receipt
- Ensure vendor request has all fields (boothSize, durationWeeks, boothLocation)
- Check that request was accepted (status = "accepted")
- Verify payment was successful

### Email shows "Vendor Request" instead of event name
- Check if vendor request has `eventName` field populated
- For platform booths, event name might be auto-generated
- Check backend console for event name

---

This completes the payment receipt email testing guide!

---

## QR Code Email Testing Guide

### Overview
When visitors register for a bazaar or booth event, QR codes are automatically generated and sent to all vendors who have accepted requests for that event.

### Prerequisites
1. A bazaar or booth event created and approved
2. At least one vendor request accepted for that event
3. A user account to register as a visitor

---

## Step-by-Step: Test QR Code Email to Vendors

### Step 1: Create/Get a Bazaar or Booth Event

**Option A: Use Existing Event**
- Get event ID from your database or previous API calls

**Option B: Create New Event (as Admin)**
- Method: `POST`
- URL: `{{base_url}}/api/events`
- Headers:
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "title": "Test Bazaar for QR Codes",
  "description": "Testing QR code email feature",
  "type": "bazaar",
  "location": "Main Hall",
  "startDate": "2025-12-01T10:00:00.000Z",
  "endDate": "2025-12-05T18:00:00.000Z",
  "status": "approved"
}
```

**Action:** Copy the event `_id` from the response. Save it as `event_id`.

---

### Step 2: Create Vendor Request (as Vendor)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/vendor-requests`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "eventType": "bazaar",
  "boothSize": "4x4",
  "attendees": [
    {
      "name": "Vendor Staff",
      "email": "staff@vendor.com"
    }
  ],
  "message": "Testing QR code emails"
}
```

**Action:** Copy the request `_id` if provided, or get it from Step 3.

---

### Step 3: Accept Vendor Request (as Admin)

**Request:**
- Method: `PATCH`
- URL: `{{base_url}}/api/vendor-requests/{{vendor_request_id}}/status`
- Headers:
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "status": "accepted"
}
```

**Expected Response:**
```json
{
  "message": "Vendor request accepted successfully.",
  "updatedRequest": {
    "status": "accepted",
    ...
  }
}
```

---

### Step 4: Register as Visitor (as User)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/events/{{event_id}}/register`
- Headers:
  - `Authorization: Bearer {{user_token}}`
  - `Content-Type: application/json`
- Body: None needed

**Expected Response:**
```json
{
  "msg": "Successfully registered for event",
  "holderType": "event",
  "registration": {
    "_id": "...",
    "event": "...",
    "user": "...",
    "qrCode": "data:image/png;base64,...",
    "qrCodeData": "{...}",
    ...
  }
}
```

**Check Backend Console:**
You should see:
```
✅ QR codes email sent to vendor: vendor@email.com
```
or
```
✅ QR codes email stored in database for vendor: vendor@email.com
📧 View emails at: http://localhost:5000/api/dev/emails
```

---

### Step 5: View QR Code Email

**Option A: Check Development Email Storage**

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/dev/emails`
- Headers: None needed

**Look for:**
- Email with `type: "vendor_qr_codes"`
- Subject: `QR Codes for Registered Visitors - {Event Name}`
- Contains QR code images for all registered visitors

**Option B: Check Vendor Email Inbox**

If SMTP is configured, check the vendor's email inbox.

---

### Step 6: Verify QR Code Email Contents

The email should contain:

**✅ Header:**
- Bindly branding
- Subject: "QR Codes for Registered Visitors - {Event Name}"

**✅ Event Details:**
- Event Name
- Event Type (Bazaar/Booth/Platform Booth)
- Location
- Start Date

**✅ Visitor QR Codes:**
- For each registered visitor:
  - Visitor name and email
  - Registration date/time
  - QR code image (scannable)
  - Instructions on how to use

**✅ Instructions:**
- How to use QR codes at the booth
- Verification process

---

## Test Multiple Visitors

### Register Multiple Visitors

Repeat Step 4 with different user accounts. Each time a new visitor registers:
- QR code is generated for that visitor
- Email is sent to all vendors with **all** registered visitors' QR codes
- Vendors receive updated list each time

---

## Test Different Event Types

### Test 1: Bazaar Event
- Create bazaar event
- Accept vendor request
- Register visitors
- Verify QR codes sent to vendor

### Test 2: Booth Event
- Create booth event
- Accept vendor request
- Register visitors
- Verify QR codes sent to vendor

### Test 3: Platform Booth
- Create platform booth request
- Accept request (creates event automatically)
- Register visitors
- Verify QR codes sent to vendor

---

## Quick Test Checklist

- [ ] Create/Get bazaar or booth event
- [ ] Create vendor request
- [ ] Accept vendor request
- [ ] Register as visitor
- [ ] Check backend console for email log
- [ ] View QR code email at `/api/dev/emails`
- [ ] Verify email contains:
  - [ ] Event details
  - [ ] Visitor information
  - [ ] QR code images
  - [ ] Usage instructions
- [ ] Register additional visitors
- [ ] Verify vendors receive updated QR codes

---

## Troubleshooting

### QR codes not generated
- Check that event type is 'bazaar', 'booth', 'platformBooth', or 'standaloneBooth'
- Verify registration was successful
- Check backend console for QR code generation errors

### Email not sent to vendor
- Verify vendor request is accepted (status = "accepted")
- Check vendor email is valid
- Check backend console for email errors
- Verify SMTP settings (or check `/api/dev/emails` for development mode)

### QR code email missing visitors
- Verify visitors registered successfully
- Check that registrations have QR codes generated
- Ensure vendor request is linked to the correct event

### QR code not scannable
- Verify QR code is base64 encoded image
- Check QR code data contains valid JSON
- Ensure QR code image is displayed correctly in email

---

## QR Code Data Structure

Each QR code contains:
```json
{
  "registrationId": "registration_id",
  "userId": "user_id",
  "eventId": "event_id",
  "eventName": "Event Name",
  "userName": "Visitor Name",
  "userEmail": "visitor@email.com",
  "timestamp": "2025-11-14T..."
}
```

---

This completes the QR code email testing guide!

---

## Cancel Vendor Request Testing Guide

### Overview
Vendors can cancel their participation requests, but only if they haven't paid yet. Once payment is made, cancellation is not allowed.

### Prerequisites
1. A vendor account
2. At least one vendor request (pending or accepted, but not paid)

---

## Step-by-Step: Test Cancel Vendor Request

### Step 1: Login as Vendor

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "mazenmossad.01@gmail.com",
  "password": "your-password"
}
```

**Action:** Copy the `token` from the response. Save it as `vendor_token`.

---

### Step 2: Get Your Vendor Requests

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor/my/requests`
- Headers: `Authorization: Bearer {{vendor_token}}`

**Action:** Find a request that hasn't been paid yet (paymentStatus is null or "pending", and paidAt is null). Copy its `_id`. Save it as `request_id`.

---

### Step 3: Cancel the Vendor Request

**Request:**
- Method: `DELETE`
- URL: `{{base_url}}/api/vendor-requests/{{request_id}}`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`
- Body: None needed

**Expected Response:**
```json
{
  "success": true,
  "message": "Vendor request cancelled successfully",
  "vendorRequest": {
    "id": "...",
    "status": "cancelled",
    "eventType": "bazaar",
    "eventName": "..."
  }
}
```

**Check Backend Console:**
You should see:
```
✅ Vendor request cancelled successfully: ...
```

---

### Step 4: Verify Cancellation

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/vendor/my/requests`
- Headers: `Authorization: Bearer {{vendor_token}}`

**Expected:** The cancelled request should have `status: "cancelled"`.

---

## Test Error Cases

### Test 1: Cancel Already Paid Request

**Prerequisites:** You need a vendor request that has been paid.

**Request:**
- Method: `DELETE`
- URL: `{{base_url}}/api/vendor-requests/{{paid_request_id}}`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": false,
  "message": "Cannot cancel vendor request. Payment has already been made. Please contact the Events Office for assistance.",
  "paymentStatus": "paid",
  "paidAt": "2025-11-14T..."
}
```

---

### Test 2: Cancel Already Cancelled Request

**Request:**
- Method: `DELETE`
- URL: `{{base_url}}/api/vendor-requests/{{cancelled_request_id}}`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": false,
  "message": "This vendor request has already been cancelled"
}
```

---

### Test 3: Cancel Another Vendor's Request

**Request:**
- Method: `DELETE`
- URL: `{{base_url}}/api/vendor-requests/{{other_vendor_request_id}}`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": false,
  "message": "You can only cancel your own vendor requests"
}
```

---

### Test 4: Cancel with Invalid Request ID

**Request:**
- Method: `DELETE`
- URL: `{{base_url}}/api/vendor-requests/invalid-id`
- Headers:
  - `Authorization: Bearer {{vendor_token}}`
  - `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid request ID format"
}
```

---

## Quick Test Checklist

- [ ] Login as Vendor
- [ ] Get your vendor requests
- [ ] Find a request that hasn't been paid
- [ ] Cancel the request
- [ ] Verify cancellation was successful
- [ ] Test error cases:
  - [ ] Try to cancel a paid request (should fail)
  - [ ] Try to cancel an already cancelled request (should fail)
  - [ ] Try to cancel another vendor's request (should fail)

---

## Expected Behavior

### ✅ Can Cancel:
- Request with `status: "pending"` and no payment
- Request with `status: "accepted"` but `paymentStatus: "pending"` (not paid yet)
- Request with `status: "accepted"` and `paymentStatus: null` (no payment required)

### ❌ Cannot Cancel:
- Request with `paymentStatus: "paid"`
- Request with `paidAt` set (payment made)
- Request that is already `status: "cancelled"`
- Request owned by another vendor

---

## What Happens When Cancelled

1. **Status Updated:** `status` changes to `"cancelled"`
2. **Payment Fields Cleared:** If `paymentStatus` was `"pending"`, it's set to `null` along with `paymentDeadline`
3. **Request Remains:** The request is not deleted, just marked as cancelled for record-keeping

---

This completes the cancel vendor request testing guide!