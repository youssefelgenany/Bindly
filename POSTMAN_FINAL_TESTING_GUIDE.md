# Postman Testing - Revised Steps with Known Test Users

## ✅ Test Users with Confirmed Passwords

All these users have password: `password123`

| Email | Type | Password | ID | Status |
|-------|------|----------|-----|--------|
| `student.test@student.guc.edu.eg` | Student | password123 | `6910c72c7c5d7da286e9e309` | active |
| `admin.test@guc.edu.eg` | Admin | password123 | `6910c72d7c5d7da286e9e30c` | active |
| `professor.test@guc.edu.eg` | Professor | password123 | `6910c72d7c5d7da286e9e310` | active |
| `staff.test@guc.edu.eg` | Staff | password123 | `6910c72e7c5d7da286e9e314` | active |
| `ta.test@student.guc.edu.eg` | TA | password123 | `6910c72f7c5d7da286e9e318` | active |
| `events.office.test@guc.edu.eg` | Events Office | password123 | `6910c7307c5d7da286e9e31c` | active |

---

## Step 1: Login as Admin (Admin Account for Testing)

### In Postman:

1. **Create a new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:5000/api/auth/login`
4. **Headers**:
   - `Content-Type: application/json`

5. **Body**:
```json
{
  "email": "admin.test@guc.edu.eg",
  "password": "password123"
}
```

6. **Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "6910c72d7c5d7da286e9e30c",
    "email": "admin.test@guc.edu.eg",
    "userType": "Admin",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Copy this token for next steps**

---

## Step 2: Get All Users

### In Postman:

1. **Create a new request**
2. **Method**: `GET`
3. **URL**: `http://localhost:5000/api/admin/users`
4. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>`

5. **Send**

### Expected:
You'll get a list of all users. Look for the test student user ID: `6910c72c7c5d7da286e9e309`

---

## Step 3: Block the Student User

### In Postman:

1. **Create a new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:5000/api/admin/users/6910c72c7c5d7da286e9e309/block`
4. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>`

5. **Body**:
```json
{
  "reason": "Testing block feature"
}
```

6. **Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "User blocked successfully",
  "user": {
    "id": "6910c72c7c5d7da286e9e309",
    "email": "student.test@student.guc.edu.eg",
    "firstName": "Ahmed",
    "lastName": "Ali",
    "userType": "Student",
    "status": "blocked"
  }
}
```

**✅ Status changed from `active` to `blocked`**

---

## Step 4: Try to Login as Blocked Student

### In Postman:

1. **Create a new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:5000/api/auth/login`
4. **Headers**:
   - `Content-Type: application/json`

5. **Body**:
```json
{
  "email": "student.test@student.guc.edu.eg",
  "password": "password123"
}
```

6. **Send**

### Expected Response (403 Forbidden):
```json
{
  "success": false,
  "code": "ACCOUNT_BLOCKED",
  "message": "Your account is currently blocked. Please contact an administrator for assistance.",
  "user": {
    "id": "6910c72c7c5d7da286e9e309",
    "email": "student.test@student.guc.edu.eg",
    "firstName": "Ahmed",
    "lastName": "Ali",
    "userType": "Student",
    "status": "blocked",
    "isVerified": true
  }
}
```

**✅ Login is blocked with error code `ACCOUNT_BLOCKED`**

---

## Step 5: Unblock the Student User

### In Postman:

1. **Create a new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:5000/api/admin/users/6910c72c7c5d7da286e9e309/unblock`
4. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer <YOUR_TOKEN_FROM_STEP_1>`

5. **Body**:
```json
{}
```

6. **Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "user": {
    "id": "6910c72c7c5d7da286e9e309",
    "email": "student.test@student.guc.edu.eg",
    "firstName": "Ahmed",
    "lastName": "Ali",
    "userType": "Student",
    "status": "active"
  }
}
```

**✅ Status changed from `blocked` to `active`**

---

## Step 6: Verify Student Can Login Again

### In Postman:

1. **Create a new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:5000/api/auth/login`
4. **Headers**:
   - `Content-Type: application/json`

5. **Body**:
```json
{
  "email": "student.test@student.guc.edu.eg",
  "password": "password123"
}
```

6. **Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "6910c72c7c5d7da286e9e309",
    "email": "student.test@student.guc.edu.eg",
    "firstName": "Ahmed",
    "lastName": "Ali",
    "userType": "Student",
    "status": "active",
    "isVerified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ User can login successfully again**

---

## Alternative Test Users to Try

You can repeat the test with any of these users:

### Professor Test:
- Block: `POST /api/admin/users/6910c72d7c5d7da286e9e310/block`
- Login: `professor.test@guc.edu.eg` / `password123`

### Staff Test:
- Block: `POST /api/admin/users/6910c72e7c5d7da286e9e314/block`
- Login: `staff.test@guc.edu.eg` / `password123`

### TA Test:
- Block: `POST /api/admin/users/6910c72f7c5d7da286e9e318/block`
- Login: `ta.test@student.guc.edu.eg` / `password123`

---

## Error Test Cases

### Try to Block Already Blocked User:
```
POST /api/admin/users/6910c72c7c5d7da286e9e309/block
```
**Expected (400)**: `"User is already blocked"`

### Try to Unblock Already Active User:
```
POST /api/admin/users/6910c72c7c5d7da286e9e309/unblock
```
**Expected (400)**: `"User is already active"`

### Block Without Auth Token:
```
POST /api/admin/users/6910c72c7c5d7da286e9e309/block
(No Authorization header)
```
**Expected (401)**: `"No token provided"`

### Block With Non-Admin Token:
```
POST /api/admin/users/6910c72c7c5d7da286e9e309/block
Authorization: Bearer <STUDENT_TOKEN>
```
**Expected (403)**: `"Insufficient permissions"`

---

## Quick Reference - Copy & Paste

### Login Admin:
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin.test@guc.edu.eg",
  "password": "password123"
}
```

### Block Student:
```
POST http://localhost:5000/api/admin/users/6910c72c7c5d7da286e9e309/block
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "reason": "Testing block feature"
}
```

### Try Login Blocked Student:
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "student.test@student.guc.edu.eg",
  "password": "password123"
}
```

### Unblock Student:
```
POST http://localhost:5000/api/admin/users/6910c72c7c5d7da286e9e309/unblock
Authorization: Bearer <TOKEN>
Content-Type: application/json

{}
```

### Login Unblocked Student:
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "student.test@student.guc.edu.eg",
  "password": "password123"
}
```

---

## Testing Checklist

- [ ] Step 1: Admin login successful (get token)
- [ ] Step 2: Get all users (verify student ID exists)
- [ ] Step 3: Block student (status → blocked)
- [ ] Step 4: Blocked student cannot login (403 ACCOUNT_BLOCKED)
- [ ] Step 5: Unblock student (status → active)
- [ ] Step 6: Unblocked student can login (200 with token)
- [ ] Error Test 1: Cannot block already blocked user (400)
- [ ] Error Test 2: Cannot unblock already active user (400)
- [ ] Error Test 3: No token returns 401
- [ ] Error Test 4: Non-admin returns 403

