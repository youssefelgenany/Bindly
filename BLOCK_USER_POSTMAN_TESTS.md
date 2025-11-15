# Block User Feature - Postman Testing Guide

## Prerequisites

1. **Postman** installed and running
2. Backend server running on `http://localhost:5000` (or your configured port)
3. Admin account with login credentials
4. A test user account to block

## Step 1: Get Admin Token

### Request Details
- **Method**: POST
- **URL**: `http://localhost:5000/api/auth/login`
- **Headers**: 
  ```
  Content-Type: application/json
  ```

### Request Body
```json
{
  "email": "admin@email.com",
  "password": "your_admin_password"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "admin_id_here",
    "email": "admin@email.com",
    "userType": "Admin",
    "status": "active",
    "isVerified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Save the token** - You'll need it for the next requests. Copy the entire token value.

### In Postman
1. In the response, look for the `token` field
2. Copy the entire token value (long string)
3. Store it in a variable or keep it for the next requests

---

## Step 2: Get All Users (Find Target User)

### Request Details
- **Method**: GET
- **URL**: `http://localhost:5000/api/admin/users`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_ADMIN_TOKEN_HERE>
  ```

Replace `<YOUR_ADMIN_TOKEN_HERE>` with the token from Step 1.

### Expected Response (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "_id": "user_id_1",
      "email": "student1@email.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Student",
      "status": "active",
      "isVerified": true,
      "createdAt": "2025-11-14T10:00:00.000Z"
    },
    {
      "_id": "user_id_2",
      "email": "student2@email.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "userType": "Student",
      "status": "active",
      "isVerified": true,
      "createdAt": "2025-11-14T10:05:00.000Z"
    }
    // ... more users
  ]
}
```

**✅ Note the `_id`** of the user you want to block (e.g., `user_id_2`)

---

## Step 3: Block a User

### Request Details
- **Method**: POST
- **URL**: `http://localhost:5000/api/admin/users/<USER_ID>/block`
  - Replace `<USER_ID>` with the user ID from Step 2 (e.g., `user_id_2`)
  
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_ADMIN_TOKEN_HERE>
  ```

- **Request Body** (Optional - reason is optional):
  ```json
  {
    "reason": "Violating community guidelines"
  }
  ```

### Complete Example
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/block
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body:
{
  "reason": "User violation of terms"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "User blocked successfully",
  "user": {
    "id": "user_id_2",
    "email": "student2@email.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Student",
    "status": "blocked"
  }
}
```

**✅ User is now blocked!** The status changed from `"active"` to `"blocked"`

---

## Step 4: Test Blocked User Login Attempt

### Request Details
- **Method**: POST
- **URL**: `http://localhost:5000/api/auth/login`
- **Headers**: 
  ```
  Content-Type: application/json
  ```

### Request Body (Use the blocked user's credentials)
```json
{
  "email": "student2@email.com",
  "password": "password123"
}
```

### Expected Response (403 Forbidden)
```json
{
  "success": false,
  "code": "ACCOUNT_BLOCKED",
  "message": "Your account is currently blocked. Please contact an administrator for assistance.",
  "user": {
    "id": "user_id_2",
    "email": "student2@email.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Student",
    "status": "blocked",
    "isVerified": true
  }
}
```

**✅ Login is blocked!** Response code is 403, and error code is `ACCOUNT_BLOCKED`

---

## Step 5: Test Blocked User Accessing Protected Endpoint

If you have a valid token from a blocked user (captured before blocking), test an endpoint:

### Request Details
- **Method**: GET
- **URL**: `http://localhost:5000/api/admin/users`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <BLOCKED_USER_TOKEN>
  ```

### Expected Response (403 Forbidden)
```json
{
  "success": false,
  "code": "ACCOUNT_BLOCKED",
  "message": "Your account has been blocked. Please contact an administrator."
}
```

**✅ Protected endpoints are blocked!** Middleware prevents access.

---

## Step 6: Unblock the User

### Request Details
- **Method**: POST
- **URL**: `http://localhost:5000/api/admin/users/<USER_ID>/unblock`
  - Replace `<USER_ID>` with the blocked user's ID
  
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_ADMIN_TOKEN_HERE>
  ```

- **Request Body**: (Empty body)
  ```json
  {}
  ```

### Complete Example
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/unblock
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body: {}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "user": {
    "id": "user_id_2",
    "email": "student2@email.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Student",
    "status": "active"
  }
}
```

**✅ User is now unblocked!** The status changed from `"blocked"` to `"active"`

---

## Step 7: Verify User Can Login Again

### Request Details
- **Method**: POST
- **URL**: `http://localhost:5000/api/auth/login`
- **Headers**: 
  ```
  Content-Type: application/json
  ```

### Request Body (Use the unblocked user's credentials)
```json
{
  "email": "student2@email.com",
  "password": "password123"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id_2",
    "email": "student2@email.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "Student",
    "status": "active",
    "isVerified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ User can login again!** Login is successful with valid token.

---

## Error Test Cases

### Test Case 1: Block Already Blocked User

**Request**:
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/block
```

**Expected Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "User is already blocked"
}
```

### Test Case 2: Unblock Already Active User

**Request**:
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/unblock
```

**Expected Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "User is already active"
}
```

### Test Case 3: Block Non-existent User

**Request**:
```
POST http://localhost:5000/api/admin/users/invalid_user_id/block
```

**Expected Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "User not found"
}
```

### Test Case 4: Block Without Admin Permission

**Request**:
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/block
Authorization: Bearer <STUDENT_TOKEN>  (non-admin token)
```

**Expected Response (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### Test Case 5: Block Without Authorization

**Request**:
```
POST http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/block
(No Authorization header)
```

**Expected Response (401 Unauthorized)**:
```json
{
  "msg": "No token provided"
}
```

---

## Postman Setup Tips

### Using Environment Variables

1. **Create a new environment** in Postman:
   - Click "Environments" in the sidebar
   - Click "Create"
   - Name it "Block User Testing"

2. **Add variables**:
   ```
   admin_token: (leave empty initially)
   admin_email: admin@email.com
   admin_password: your_password
   base_url: http://localhost:5000
   user_id: (leave empty, update after Step 2)
   blocked_user_email: student2@email.com
   blocked_user_password: password123
   ```

3. **Use in requests**:
   - URL: `{{base_url}}/api/auth/login`
   - Header: `Authorization: Bearer {{admin_token}}`

### Automatic Token Extraction

After login request, go to **Tests** tab and add:
```javascript
if (pm.response.code === 200) {
    pm.environment.set("admin_token", pm.response.json().token);
    pm.environment.set("user_id", "copy_user_id_here"); // Update manually
}
```

---

## Testing Checklist

- [ ] Admin can login successfully (Step 1)
- [ ] Can retrieve all users (Step 2)
- [ ] Can block an active user (Step 3)
- [ ] Blocked user cannot login (Step 4)
- [ ] Blocked user cannot access protected endpoints (Step 5)
- [ ] Can unblock a blocked user (Step 6)
- [ ] Unblocked user can login again (Step 7)
- [ ] Cannot block already blocked user (Error Test 1)
- [ ] Cannot unblock already active user (Error Test 2)
- [ ] Blocking non-existent user returns 404 (Error Test 3)
- [ ] Non-admin cannot block user (Error Test 4)
- [ ] Missing auth token returns 401 (Error Test 5)

---

## Quick Reference - Copy & Paste URLs

```
Login:
POST http://localhost:5000/api/auth/login

Get Users:
GET http://localhost:5000/api/admin/users

Block User:
POST http://localhost:5000/api/admin/users/<USER_ID>/block

Unblock User:
POST http://localhost:5000/api/admin/users/<USER_ID>/unblock
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No token provided" | Add `Authorization: Bearer <token>` header |
| "Insufficient permissions" | Use admin token, not student token |
| "User not found" | Verify the user ID is correct from Step 2 |
| "User is already blocked" | User was already blocked, try a different user |
| Login after unblock fails | Restart backend, or clear browser cache |
| CORS error | Check backend CORS settings |
| Connection refused | Verify backend is running on port 5000 |

