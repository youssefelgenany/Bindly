# Block User Feature - Implementation Guide

## Overview
As an Admin, you can now block any user from accessing the application. When a user is blocked, they cannot log in or access any protected endpoints.

## Feature Implementation

### 1. **Database Model** (`backend/models/userModel.js`)
- User model includes a `status` field with two possible values:
  - `'active'` - User can access the application
  - `'blocked'` - User is prevented from accessing the application
- All new users start with `status: 'blocked'` until verified by an admin

### 2. **Authentication Controller** (`backend/controllers/authController.js`)
#### Updated Login Validation
- **Added**: Enhanced error handling for blocked users
- **Error Code**: `ACCOUNT_BLOCKED`
- **Status Code**: 403 (Forbidden)
- **Response**:
  ```json
  {
    "success": false,
    "code": "ACCOUNT_BLOCKED",
    "message": "Your account is currently blocked. Please contact an administrator for assistance.",
    "user": { /* user details */ }
  }
  ```

### 3. **Auth Middleware** (`backend/middleware/authMiddleware.js`)
#### Added Status Check
- **Location**: `protect` middleware
- **Functionality**: Blocks any API call from blocked users
- **Response**:
  ```json
  {
    "success": false,
    "code": "ACCOUNT_BLOCKED",
    "message": "Your account has been blocked. Please contact an administrator."
  }
  ```

### 4. **Admin Controller** (`backend/controllers/adminController.js`)

#### Existing Function: `updateUserStatus`
- Already implemented for toggling user status
- Usage: `PATCH /api/admin/users/:userId/status`
- Body: `{ isActive: boolean }`

#### New Functions:

##### `blockUser` ✨
- **Endpoint**: `POST /api/admin/users/:userId/block`
- **Description**: Blocks a specific user account
- **Authentication**: Admin only
- **Request Body** (Optional):
  ```json
  {
    "reason": "User violation of terms"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User blocked successfully",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Student",
      "status": "blocked"
    }
  }
  ```
- **Error Responses**:
  - 404: User not found
  - 400: User already blocked

##### `unblockUser` ✨
- **Endpoint**: `POST /api/admin/users/:userId/unblock`
- **Description**: Unblocks a user account
- **Authentication**: Admin only
- **Response**:
  ```json
  {
    "success": true,
    "message": "User unblocked successfully",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Student",
      "status": "active"
    }
  }
  ```
- **Error Responses**:
  - 404: User not found
  - 400: User already active

### 5. **Admin Routes** (`backend/routes/adminRoutes.js`)
```javascript
// Block/Unblock routes
router.post('/users/:userId/block', protect, permit('admin'), blockUser);
router.post('/users/:userId/unblock', protect, permit('admin'), unblockUser);
```

## API Endpoints

### Get All Users
```
GET /api/admin/users
```
Returns all users with their current status (active/blocked)

### Update User Status (Existing)
```
PATCH /api/admin/users/:userId/status
Body: { isActive: boolean }
```

### Block User (New)
```
POST /api/admin/users/:userId/block
Body: { reason?: string } (optional)
```

### Unblock User (New)
```
POST /api/admin/users/:userId/unblock
```

## User Flow

### When a User is Blocked:
1. **Existing Session**: Active tokens become unusable immediately due to middleware check
2. **Login Attempt**: Returns `ACCOUNT_BLOCKED` error with status 403
3. **Protected Endpoints**: Middleware rejects all API requests with blocked status

### When a User is Unblocked:
1. User can log in again with valid credentials
2. User gains access to all protected endpoints
3. Status changes from `'blocked'` to `'active'`

## Frontend Integration

### Login Error Handling
The frontend should handle the `ACCOUNT_BLOCKED` error code:
```javascript
if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_BLOCKED') {
  // Show user-friendly message about account being blocked
  setErrorMessage('Your account has been blocked. Please contact an administrator.');
}
```

### Admin Panel Usage
- Go to Admin Users section
- Select a user
- Click "Block User" to block
- Click "Unblock User" to unblock
- The user's status will update to reflect the change

## Testing Checklist

- [ ] Admin can block an active user
- [ ] Admin can unblock a blocked user
- [ ] Blocked users cannot log in
- [ ] Blocked users' existing sessions are invalidated
- [ ] Blocked users cannot access protected endpoints
- [ ] Error codes are correct (ACCOUNT_BLOCKED)
- [ ] HTTP status codes are correct (403 for blocked)
- [ ] Only admins can block/unblock users
- [ ] Cannot block an already blocked user
- [ ] Cannot unblock an already active user

## Database Queries

### Find All Blocked Users
```javascript
const blockedUsers = await User.find({ status: 'blocked' });
```

### Find All Active Users
```javascript
const activeUsers = await User.find({ status: 'active' });
```

### Count Blocked Users
```javascript
const count = await User.countDocuments({ status: 'blocked' });
```

## Security Notes

1. **Token Validation**: Tokens are checked in the `protect` middleware
2. **Role-based Access**: Only admins can block/unblock users
3. **Status Persistence**: Status changes are immediately reflected
4. **Password Hash**: User passwords are not affected by blocking
5. **Account Recovery**: Users can be unblocked by admins at any time

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| User not found | 404 | User not found |
| User already blocked | 400 | User is already blocked |
| User already active | 400 | User is already active |
| Account blocked on login | 403 | Your account is currently blocked. Please contact an administrator for assistance. |
| Account blocked on API call | 403 | Your account has been blocked. Please contact an administrator. |
| Invalid permission | 403 | Insufficient permissions |

## Implementation Summary

✅ **Completed**:
1. User model with status field
2. Login validation for blocked users
3. Middleware check for blocked status
4. Block user endpoint
5. Unblock user endpoint
6. Admin routes configured
7. Error handling with proper status codes

