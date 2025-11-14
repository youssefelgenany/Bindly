# Postman Testing - Step 3: Block User (LIVE TEST)

## Using Real Data from Step 2

### Selected Test User
```json
{
  "_id": "691711517e31ac237e2ac001",
  "email": "leena.elbadawi@student.guc.edu.eg",
  "firstName": "Leena",
  "lastName": "Elbadawi",
  "userType": "Student",
  "status": "active",
  "isVerified": true
}
```

---

## Step 3: Block This User

### In Postman:

1. **Create a new request** or go to next tab
2. **Set Method**: `POST`
3. **Set URL**: 
```
http://localhost:5000/api/admin/users/691711517e31ac237e2ac001/block
```

4. **Set Headers**:
   - Key: `Content-Type`
   - Value: `application/json`
   
   - Key: `Authorization`
   - Value: `Bearer <YOUR_ADMIN_TOKEN_FROM_STEP_1>`

5. **Set Body** (raw, JSON):
```json
{
  "reason": "Testing block user feature"
}
```

6. **Click Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "User blocked successfully",
  "user": {
    "id": "691711517e31ac237e2ac001",
    "email": "leena.elbadawi@student.guc.edu.eg",
    "firstName": "Leena",
    "lastName": "Elbadawi",
    "userType": "Student",
    "status": "blocked"
  }
}
```

**✅ Status changed from `active` to `blocked`**

---

## Step 4: Try to Login as Blocked User

### In Postman:

1. **Create a new request**
2. **Set Method**: `POST`
3. **Set URL**:
```
http://localhost:5000/api/auth/login
```

4. **Set Headers**:
   - Key: `Content-Type`
   - Value: `application/json`

5. **Set Body** (raw, JSON):
```json
{
  "email": "leena.elbadawi@student.guc.edu.eg",
  "password": "password123"
}
```

> **Note**: You need to know the actual password. If unsure, try a common test password or check your test data documentation.

6. **Click Send**

### Expected Response (403 Forbidden):
```json
{
  "success": false,
  "code": "ACCOUNT_BLOCKED",
  "message": "Your account is currently blocked. Please contact an administrator for assistance.",
  "user": {
    "id": "691711517e31ac237e2ac001",
    "email": "leena.elbadawi@student.guc.edu.eg",
    "firstName": "Leena",
    "lastName": "Elbadawi",
    "userType": "Student",
    "status": "blocked",
    "isVerified": true
  }
}
```

**✅ Login is blocked with error code `ACCOUNT_BLOCKED`**

---

## Step 5: Unblock the User

### In Postman:

1. **Create a new request**
2. **Set Method**: `POST`
3. **Set URL**:
```
http://localhost:5000/api/admin/users/691711517e31ac237e2ac001/unblock
```

4. **Set Headers**:
   - Key: `Content-Type`
   - Value: `application/json`
   
   - Key: `Authorization`
   - Value: `Bearer <YOUR_ADMIN_TOKEN_FROM_STEP_1>`

5. **Set Body** (raw, JSON):
```json
{}
```

6. **Click Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "user": {
    "id": "691711517e31ac237e2ac001",
    "email": "leena.elbadawi@student.guc.edu.eg",
    "firstName": "Leena",
    "lastName": "Elbadawi",
    "userType": "Student",
    "status": "active"
  }
}
```

**✅ Status changed from `blocked` to `active`**

---

## Step 6: Verify User Can Login Again

### In Postman:

1. **Create a new request**
2. **Set Method**: `POST`
3. **Set URL**:
```
http://localhost:5000/api/auth/login
```

4. **Set Headers**:
   - Key: `Content-Type`
   - Value: `application/json`

5. **Set Body** (raw, JSON):
```json
{
  "email": "leena.elbadawi@student.guc.edu.eg",
  "password": "password123"
}
```

6. **Click Send**

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "691711517e31ac237e2ac001",
    "email": "leena.elbadawi@student.guc.edu.eg",
    "firstName": "Leena",
    "lastName": "Elbadawi",
    "userType": "Student",
    "status": "active",
    "isVerified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ User can login successfully**

---

## Alternative Test Users from Your Data

If you want to test with different users:

### Students (Active):
- `leena.elbadawi@student.guc.edu.eg` (ID: `691711517e31ac237e2ac001`) ✅ Active
- `mazenmossad@student.guc.edu.eg` (ID: `6917720c7d9c47e5dee11ec1`) ✅ Active
- `youssefstudent2@student.guc.edu.eg` (ID: `68f2963972710e5b5bf2a1f2`) ✅ Active

### Staff (Active):
- `youssefstaff@guc.edu.eg` (ID: `69163ac40bfbdcda9468b466`) ✅ Active
- `salmaahmed@guc.edu.eg` (ID: `68f386b921f65a136d96d41a`) ✅ Active

### Professors (Active):
- `youssef.elgenany@student.guc.edu.eg` (ID: `69160943e6e9905a9478ab3a`) ✅ Active
- `eyadprof@guc.edu.eg` (ID: `68f618bc40ae8cb1cdab310d`) ✅ Active

### Vendors (Active):
- `mazenmossad.01@gmail.com` (ID: `68f0ddb2c16dbad1bc0ce5be`) ✅ Active
- `youssefkhaled120@gmail.com` (ID: `68f9ed8d6ae91f851900871c`) ✅ Active

### Already Blocked Users (to test error):
- `salma@student.guc.edu.eg` (ID: `6914aa8889ef2ccfd61e4c25`) ❌ Blocked
- `student1@student.guc.edu.eg` (ID: `68f0ae0f630fba8251dccad7`) ❌ Blocked

---

## Quick Copy-Paste Commands for Testing

### Block Leena:
```
POST http://localhost:5000/api/admin/users/691711517e31ac237e2ac001/block
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "reason": "Testing block user feature"
}
```

### Try Leena Login:
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "leena.elbadawi@student.guc.edu.eg",
  "password": "password123"
}
```

### Unblock Leena:
```
POST http://localhost:5000/api/admin/users/691711517e31ac237e2ac001/unblock
Authorization: Bearer <TOKEN>
Content-Type: application/json

{}
```

---

## Status Tracking

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 3 | Block user | status: "blocked" | ⏳ Ready to test |
| 4 | Try login | Error 403 ACCOUNT_BLOCKED | ⏳ Ready to test |
| 5 | Unblock user | status: "active" | ⏳ Ready to test |
| 6 | Try login again | Success 200 with token | ⏳ Ready to test |

