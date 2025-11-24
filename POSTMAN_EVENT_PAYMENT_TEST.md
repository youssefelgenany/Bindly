# Postman Testing Guide - Event Payment Endpoint

## Endpoint: `POST /api/events/:id/pay`

This endpoint allows users (Student, Staff, TA, or Professor) to pay for an event they have registered for.

---

## Prerequisites

1. **User must be authenticated** - You need a valid JWT token
2. **User must be registered for the event** - Register first using `POST /api/events/:id/register`
3. **Event must have a price** - The event must have `price > 0`
4. **User must not have already paid** - Registration must not be marked as `paid: true`

---

## Test Users

All test users have password: `password123`

| Email | Type | Password | ID |
|-------|------|----------|-----|
| `student.test@student.guc.edu.eg` | Student | password123 | `6910c72c7c5d7da286e9e309` |
| `staff.test@guc.edu.eg` | Staff | password123 | `6910c72e7c5d7da286e9e314` |
| `ta.test@student.guc.edu.eg` | TA | password123 | `6910c72f7c5d7da286e9e318` |
| `professor.test@guc.edu.eg` | Professor | password123 | `6910c72d7c5d7da286e9e310` |

---

## Step-by-Step Testing Guide

### Step 1: Login as a Student/Staff/TA/Professor

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/login`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "email": "student.test@student.guc.edu.eg",
    "password": "password123"
  }
  ```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "6910c72c7c5d7da286e9e309",
    "email": "student.test@student.guc.edu.eg",
    "userType": "Student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Copy the token for the next steps**

---

### Step 2: Get Available Events (to find an event ID)

**Request:**
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/events/student`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>
  ```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Tech Conference 2024",
      "price": 100,
      "description": "...",
      ...
    },
    ...
  ]
}
```

**✅ Find an event with `price > 0` and copy its `_id`**

---

### Step 3: Register for the Event (if not already registered)

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/events/<EVENT_ID>/register`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>
  ```
- **Body** (raw JSON):
  ```json
  {}
  ```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration successful",
  "registration": {
    "_id": "...",
    "user": "...",
    "event": "...",
    "paid": false,
    ...
  }
}
```

---

### Step 4: Pay for Event - Wallet Payment

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/events/<EVENT_ID>/pay`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>
  ```
- **Body** (raw JSON):
  ```json
  {
    "paymentMethod": "wallet"
  }
  ```

**Expected Response (200 OK) - Success:**
```json
{
  "success": true,
  "msg": "Payment successful",
  "paymentId": "507f1f77bcf86cd799439012",
  "walletBalance": 50
}
```

**Expected Response (400 Bad Request) - Insufficient Balance:**
```json
{
  "success": false,
  "msg": "Insufficient wallet balance",
  "required": 100,
  "available": 50
}
```

---

### Step 5: Pay for Event - Card Payment (Stripe)

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/events/<EVENT_ID>/pay`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>
  ```
- **Body** (raw JSON):
  ```json
  {
    "paymentMethod": "card"
  }
  ```

**Expected Response (200 OK) - Redirect to Stripe:**
```json
{
  "success": true,
  "msg": "Redirect to payment",
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Note:** For card payments, you'll receive a Stripe checkout URL. The actual payment completion happens through Stripe's checkout page.

---

## Error Test Cases

### Test Case 1: Event Not Found
**Request:**
```
POST http://localhost:5000/api/events/invalid_event_id/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "msg": "Event not found"
}
```

---

### Test Case 2: Free Event (No Payment Required)
**Request:**
```
POST http://localhost:5000/api/events/<FREE_EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "msg": "This event is free and does not require payment"
}
```

---

### Test Case 3: Not Registered for Event
**Request:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "msg": "Registration not found. Please register for the event first."
}
```

---

### Test Case 4: Already Paid
**Request:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "msg": "Payment already completed for this event"
}
```

---

### Test Case 5: Invalid Payment Method
**Request:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "invalid_method"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "msg": "Invalid payment method. Use 'wallet' or 'card'"
}
```

---

### Test Case 6: Missing Authentication Token
**Request:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "msg": "No token provided"
}
```

---

### Test Case 7: Wrong User Type (e.g., Admin)
**Request:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "msg": "Insufficient permissions"
}
```

---

## Quick Reference - Copy & Paste

### Complete Flow (Wallet Payment):

**1. Login:**
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "student.test@student.guc.edu.eg",
  "password": "password123"
}
```

**2. Register for Event:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/register
Authorization: Bearer <TOKEN>
Content-Type: application/json

{}
```

**3. Pay with Wallet:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "wallet"
}
```

**4. Pay with Card:**
```
POST http://localhost:5000/api/events/<EVENT_ID>/pay
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "paymentMethod": "card"
}
```

---

## Testing Checklist

- [ ] Step 1: Login successful (get token)
- [ ] Step 2: Get events list (find event with price > 0)
- [ ] Step 3: Register for event (if needed)
- [ ] Step 4: Pay with wallet - Success (sufficient balance)
- [ ] Step 4: Pay with wallet - Insufficient balance error
- [ ] Step 5: Pay with card - Get Stripe checkout URL
- [ ] Error Test 1: Event not found (404)
- [ ] Error Test 2: Free event error (400)
- [ ] Error Test 3: Not registered error (404)
- [ ] Error Test 4: Already paid error (400)
- [ ] Error Test 5: Invalid payment method (400)
- [ ] Error Test 6: No token (401)
- [ ] Error Test 7: Wrong user type (403)

---

## Notes

1. **Wallet Balance**: To test wallet payments, ensure the user has sufficient wallet balance. You may need to add funds to the wallet first (if there's an endpoint for that).

2. **Stripe Setup**: For card payments, Stripe must be properly configured in your environment variables. If Stripe is not configured, you'll get an error message.

3. **Event Price**: Make sure the event has a `price` field set to a value greater than 0.

4. **Registration Status**: The user must be registered for the event before payment. The registration should have `paid: false`.

5. **Payment Records**: After successful payment, check:
   - Payment record is created in the database
   - Registration is marked as `paid: true`
   - Wallet balance is deducted (for wallet payments)
   - Receipt email is sent (check email logs)

---

## Environment Variables

Make sure these are set in your `.env` file:
- `JWT_SECRET` - For token generation
- `STRIPE_SECRET_KEY` - For card payments (optional)
- `FRONTEND_URL` - For Stripe redirect URLs


