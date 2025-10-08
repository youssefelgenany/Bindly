# Authentication API Documentation

## Overview
This authentication system supports signup for different user types with appropriate validation and security measures.

## User Types
- **Student**: Must use GUC email (@student.guc.edu.eg) and provide GUC ID
- **Staff**: Must use GUC email (@guc.edu.eg) and provide GUC ID  
- **TA**: Must use GUC email (@guc.edu.eg) and provide GUC ID
- **Professor**: Must use GUC email (@guc.edu.eg) and provide GUC ID
- **Vendor**: Can use any email and must provide company name

## API Endpoints

### 1. User Signup
**POST** `/api/auth/signup`

#### Request Body
```json
{
  "email": "user@student.guc.edu.eg",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "Student",
  "gucId": "34-1234"
}
```

#### For Vendors:
Multipart form-data fields and files:

- Fields:
  - `email`, `password`, `firstName`, `lastName`, `userType` = `Vendor`, `companyName`
- Files (required):
  - `vendorLogo` (image)
  - `vendorTaxCard` (image or PDF)

Example using curl:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: multipart/form-data" \
  -F email=vendor@company.com \
  -F password=password123 \
  -F firstName=Jane \
  -F lastName=Smith \
  -F userType=Vendor \
  -F companyName="Tech Solutions Inc" \
  -F vendorLogo=@/path/to/logo.png \
  -F vendorTaxCard=@/path/to/taxcard.pdf
```

#### Success Response (201)
```json
{
  "success": true,
  "message": "User created. Verification email sent.",
  "user": {
    "id": "user_id",
    "email": "user@student.guc.edu.eg",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "Student",
    "gucId": "34-1234",
    "companyName": null,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": null
}
```

#### Error Responses
- **400**: Validation errors
- **409**: User already exists
- **500**: Server error

### 2. User Login
**POST** `/api/auth/login`

#### Request Body
```json
{
  "email": "user@student.guc.edu.eg",
  "password": "password123"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@student.guc.edu.eg",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "Student",
    "gucId": "34-1234",
    "companyName": null,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 3. Verify Email
**GET** `/api/auth/verify-email?token=...`

- Marks the Student account as verified if the token is valid and not expired
- Redirects to the frontend login page (`FRONTEND_URL` + `/login`)

#### Possible Responses
- 302 Redirect to login on success
- 400 Invalid/expired link

## Validation Rules

### Email Validation
- Must be a valid email format
- GUC users (Student, Staff, TA, Professor) must use:
  - `@student.guc.edu.eg` for students
  - `@guc.edu.eg` for staff, TAs, and professors
- Vendors can use any valid email

### Password Validation
- Minimum 6 characters

### Required Fields by User Type
- **All users**: email, password, firstName, lastName, userType
- **GUC users**: gucId (required)
- **Vendors**: companyName (required)

## Security Features

### Password Hashing
- Passwords are automatically hashed using bcrypt before saving
- Salt rounds: 10

### JWT Tokens
- Tokens expire after 7 days
- Include user ID, email, and user type
- Use for authenticating protected routes

### Middleware
- `authenticateToken`: Verifies JWT tokens
- `requireRole`: Checks user permissions for specific roles

## Environment Variables
Add these to your `.env` file:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bindly
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

# SMTP settings
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAIL_FROM="Bindly <no-reply@bindly.app>"
```

## Static Files
- Uploaded files are served at `/uploads/...` from the backend server.

## Usage Examples

### Protecting Routes
```javascript
const { authenticateToken, requireRole } = require('./middleware/authMiddleware');

// Protect a route
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
router.get('/admin', authenticateToken, requireRole(['Staff', 'Professor']), (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

### Frontend Integration
```javascript
// Signup request
const signupData = {
  email: 'john.doe@student.guc.edu.eg',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'Student',
  gucId: '34-1234'
};

fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(signupData)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    localStorage.setItem('token', data.token);
    // Redirect to dashboard
  }
});
```

## Installation
1. Install dependencies:
```bash
npm install bcryptjs express-validator jsonwebtoken
```

2. Add environment variables to `.env` file

3. Start the server:
```bash
npm run dev
```

## Testing
You can test the API using tools like Postman or curl:

```bash
# Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@student.guc.edu.eg",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "userType": "Student",
    "gucId": "34-1234"
  }'
```
