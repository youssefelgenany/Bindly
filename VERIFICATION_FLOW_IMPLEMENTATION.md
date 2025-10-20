# Staff/TA/Professor Verification Flow Implementation

## Overview
This document describes the complete verification flow implementation for Staff/TA/Professor users in the Bindly platform.

## Flow Description

### 1. User Signup
- When a Staff/TA/Professor signs up, they are created with `isVerified: false` and `status: 'active'`
- They receive a message that their account is pending admin verification
- They cannot log in until verified

### 2. Admin Role Assignment
- Admin can view all pending Staff/TA/Professor requests in the admin interface
- Admin assigns the correct role (Staff/TA/Professor) to the user
- **NEW**: When role is assigned, a verification email is automatically sent to the user
- The verification email contains a link that redirects to the login page

### 3. Email Verification
- User receives verification email with a secure token
- User clicks the verification link
- Link redirects to the login page
- User's account is marked as verified (`isVerified: true`)

### 4. Login Process
- Before verification: Login fails with "AWAITING_VERIFICATION" error
- After verification: Login succeeds normally

## Technical Implementation

### Backend Changes

#### 1. Updated `adminController.js`
- Modified `updateUserRole` function to automatically send verification email after role assignment
- Added verification token generation and email sending logic

#### 2. Updated `authVerifyController.js`
- Fixed verification link to properly redirect to login page
- Uses `FRONTEND_URL` environment variable for proper redirection

#### 3. Updated `mailer.js`
- Fixed verification URL to use correct endpoint (`/api/auth/verify-email`)
- Improved email template and error handling

#### 4. User Model (`userModel.js`)
- Already correctly configured to set Staff/TA/Professor as unverified on signup
- Students remain verified, Vendors remain verified

### Frontend Changes

#### 1. Updated `AdminUsers.jsx`
- Added "Send Verification Email" button for Staff/TA/Professor users
- Updated role assignment success message to indicate email was sent
- Improved UI to show verification status clearly

#### 2. Updated `adminApi.js`
- Added `sendVerificationEmail` function for manual email sending
- Improved error handling for verification operations

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User signup (Staff/TA/Professor start unverified)
- `POST /api/auth/login` - User login (fails if unverified)
- `GET /api/auth/verify-email?token=xxx` - Email verification endpoint

### Admin Management
- `GET /api/admin/users` - Get all users (excludes admin accounts)
- `PUT /api/admin/users/:userId/role` - Assign role and send verification email
- `PUT /api/admin/users/:userId/verification` - Manually verify/unverify user
- `POST /api/admin/users/:userId/send-verification-email` - Send verification email

## Environment Variables

Required environment variables:
- `FRONTEND_URL` - Frontend application URL (e.g., http://localhost:3000)
- `BACKEND_URL` - Backend API URL (e.g., http://localhost:5000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

## Testing

A test script `test-verification-flow.js` is provided to verify the complete flow:

```bash
node test-verification-flow.js
```

The test verifies:
1. Staff signup creates unverified user
2. Login fails before verification
3. Admin can assign role and send verification email
4. Login still fails before email verification
5. Manual verification allows login
6. Login succeeds after verification

## Security Features

1. **Verification Tokens**: Cryptographically secure random tokens with 24-hour expiration
2. **Email Verification**: Users must click verification link to activate account
3. **Role-based Access**: Only admins can assign roles and send verification emails
4. **Login Protection**: Unverified users cannot log in regardless of correct credentials

## User Experience

### For Staff/TA/Professor Users:
1. Sign up with GUC email
2. Receive message about pending verification
3. Wait for admin to assign role
4. Receive verification email
5. Click verification link
6. Redirected to login page
7. Can now log in successfully

### For Admins:
1. View pending Staff/TA/Professor requests
2. Assign appropriate role (automatically sends verification email)
3. Optionally send additional verification emails
4. Monitor verification status

## Error Handling

- Clear error messages for unverified users
- Proper HTTP status codes (403 for unverified, 401 for invalid credentials)
- Graceful handling of expired verification tokens
- SMTP configuration validation

## Future Enhancements

1. **Email Templates**: Customizable email templates for verification emails
2. **Resend Verification**: Allow users to request new verification emails
3. **Bulk Operations**: Admin interface for bulk role assignments
4. **Audit Logging**: Track verification events for security
5. **Email Notifications**: Notify admins of new pending verifications
