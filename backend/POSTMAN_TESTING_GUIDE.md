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
