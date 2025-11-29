# Bindly

A comprehensive event management platform for the German University in Cairo (GUC), designed to facilitate event organization, registration, and management for students, staff, professors, vendors, and administrators.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [User Types](#user-types)
- [Key Features](#key-features)
- [Contributing](#contributing)

## ✨ Features

### Event Management
- **Multiple Event Types**: Bazaars, Trips, Workshops, Conferences, and Booths
- **Event Registration**: Student and professor registration with capacity management
- **Event Approval Workflow**: Admin approval system with edit requests
- **Event Restrictions**: Support for restricted events with user/type-based access
- **Event Archiving**: Archive past events for historical reference

### User Management
- **Multi-User Type Support**: Students, Staff, TAs, Professors, Vendors, Admins, and Event Office
- **Email Verification**: Secure email verification system
- **User Blocking**: Admin capability to block/unblock users
- **Profile Management**: Comprehensive user profiles with role-based access

### Payment Integration
- **Stripe Integration**: Secure payment processing for event registrations
- **Payment Receipts**: Automated email receipts with QR codes
- **Payment Verification**: Webhook-based payment verification system

### Vendor Management
- **Vendor Registration**: Vendor onboarding with document verification
- **Booth Management**: Platform booth requests and management
- **Vendor Loyalty Programs**: Loyalty program support for vendors
- **Bazaar Management**: Vendor participation in bazaars

### Additional Features
- **Gym Management**: Gym session scheduling and court bookings
- **Workshop Management**: Professor-led workshops with completion tracking
- **Announcements**: System-wide announcements
- **Notifications**: Real-time notifications via Socket.IO
- **Dashboard Analytics**: Role-based dashboards with statistics
- **File Uploads**: Support for images, PDFs, and documents

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Stripe** for payment processing
- **Socket.IO** for real-time notifications
- **Nodemailer** for email services
- **Multer** for file uploads
- **PDFKit** for PDF generation
- **QRCode** for QR code generation

### Frontend
- **React** with React Router
- **Axios** for API calls
- **Socket.IO Client** for real-time features

## 📦 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB Atlas** account (or local MongoDB instance)
- **Stripe** account (for payment features)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dyalaelsmery/Bindly.git
   cd Bindly
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```
   
   This will install dependencies for:
   - Root directory
   - Backend directory
   - Frontend directory

## ⚙️ Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=7d

# Email Configuration (for Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe Configuration (optional, for payment features)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Frontend Configuration

The frontend is configured to proxy API requests to `http://localhost:5000` by default (see `frontend/package.json`).

## 🏃 Running the Application

### Development Mode

Run both backend and frontend concurrently:
```bash
npm run dev
```

### Run Separately

**Backend only:**
```bash
npm run start:backend
# or
cd backend
npm start
```

**Frontend only:**
```bash
npm run start:frontend
# or
cd frontend
npm start
```

### Production Mode

**Backend:**
```bash
cd backend
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build folder using a static server
```

## 📁 Project Structure

```
Bindly/
├── backend/                 # Backend server
│   ├── controllers/        # Route controllers
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── uploads/            # Uploaded files
│   ├── scripts/            # Utility scripts
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── App.jsx        # Main app component
│   └── public/            # Static assets
└── README.md              # This file
```

## 📚 API Documentation

### Authentication API
See [backend/AUTH_API_DOCUMENTATION.md](backend/AUTH_API_DOCUMENTATION.md) for detailed authentication endpoints.

### Main API Endpoints

- `/api/auth` - Authentication (signup, login, verification)
- `/api/admin` - Admin operations
- `/api/events` - Event management
- `/api/workshops` - Workshop management
- `/api/bazaars` - Bazaar management
- `/api/trips` - Trip management
- `/api/vendor` - Vendor operations
- `/api/vendor-requests` - Vendor request management
- `/api/courts` - Court booking
- `/api/gym` - Gym management
- `/api/gym-sessions` - Gym session management
- `/api/booths` - Booth management
- `/api/announcements` - Announcements
- `/api/dashboard` - Dashboard data
- `/api/notifications` - Notifications
- `/api/student-registrations` - Student registrations
- `/api/professors` - Professor operations

### Testing

- See [backend/POSTMAN_TESTING_GUIDE.md](backend/POSTMAN_TESTING_GUIDE.md) for Postman testing instructions
- See [POSTMAN_FINAL_TESTING_GUIDE.md](POSTMAN_FINAL_TESTING_GUIDE.md) for comprehensive testing guide

## 👥 User Types

### Student
- Must use `@student.guc.edu.eg` email
- Requires GUC ID
- Can register for events, workshops, trips
- Can book courts
- Can view and manage registrations

### Staff/TA/Professor
- Must use `@guc.edu.eg` email
- Requires GUC ID
- Can create and manage events
- Professors can create workshops
- Access to events office dashboard

### Vendor
- Can use any email
- Requires company name
- Must provide vendor logo and tax card
- Can request platform booths
- Can participate in bazaars
- Access to vendor dashboard

### Admin
- Full system access
- User management (block/unblock, verify)
- Event approval/rejection
- Vendor request management
- System configuration

### Event Office
- Event management and approval
- Event office dashboard access

## 🔑 Key Features

### Event Registration Flow
1. Event creation by Staff/TA/Professor
2. Admin approval/rejection
3. Student/Professor registration
4. Payment processing (if applicable)
5. Confirmation emails with receipts
6. Event completion tracking

### Payment Flow
1. User registers for paid event
2. Stripe checkout session created
3. Payment processed
4. Webhook verification
5. Registration confirmed
6. Receipt email sent with QR code

### Vendor Onboarding
1. Vendor signs up with documents
2. Admin reviews vendor request
3. Admin approves/rejects vendor
4. Vendor gains access to platform
5. Vendor can request booths and participate in bazaars

## 📝 Additional Documentation

- [Email Setup Guide](backend/EMAIL_SETUP_GUIDE.md)
- [Stripe Payment Setup](backend/STRIPE_PAYMENT_SETUP.md)
- [Environment Setup](backend/ENV_SETUP.md)
- [Block User Feature](BLOCK_USER_FEATURE.md)
- [Payment Receipt Email Implementation](PAYMENT_RECEIPT_EMAIL_IMPLEMENTATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure `MONGO_URI` is correctly set in `backend/.env`
- Check MongoDB Atlas network access settings
- Verify connection string format

### Port Already in Use
- Change `PORT` in `backend/.env` if port 5000 is occupied
- Update frontend proxy configuration if backend port changes

### Email Not Sending
- Verify email credentials in `.env`
- For Gmail, use App Password instead of regular password
- Check email service configuration

### Stripe Webhook Issues
- Ensure webhook secret is correctly configured
- Use Stripe CLI for local webhook testing
- Verify webhook endpoint URL in Stripe dashboard

## 📞 Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/dyalaelsmery/Bindly/issues).

---

**Note**: This is an active development project. Some features may be in progress or subject to change.
