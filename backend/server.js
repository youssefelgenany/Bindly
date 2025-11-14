// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Stripe webhook endpoint (must be before JSON middleware, uses raw body)
// Only register if stripe is available
try {
  const stripeController = require('./controllers/stripeWebhookController');
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeController);
} catch (error) {
  console.warn('⚠️ Stripe webhook controller not available. Stripe webhook endpoint disabled.');
  // Register a placeholder endpoint to prevent 404 errors
  app.post('/api/webhooks/stripe', (req, res) => {
    res.status(503).json({ error: 'Stripe webhook functionality is not available. Please install stripe package.' });
  });
}

// Middleware
// Configure JSON parser to handle empty bodies gracefully
app.use(express.json({
  strict: false
}));
// Handle empty JSON body errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // Empty or invalid JSON body - set to empty object
    req.body = {};
    return next();
  }
  next(err);
});
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // React app URL
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require('./routes/authRoutes');
const bazaarRoutes = require('./routes/bazaarRoutes');
const tripRoutes = require('./routes/tripRoutes');
const gymRoutes = require('./routes/gymRoutes');
const vendorRequestRoutes = require('./routes/vendorRequestRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const professorRoutes = require("./routes/professorRoutes");
const workshopRoutes = require("./routes/workshopRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const studentRegistrationRoutes = require("./routes/studentRegistrationRoutes");
const courtRoutes = require("./routes/courtRoutes");
const boothRoutes = require("./routes/boothRoutes");
const gymSessionRoutes = require("./routes/gymSessionRoutes");
const devEmailRoutes = require("./routes/devEmailRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { verifyByToken } = require("./controllers/authVerifyController");

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/gym", gymRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/vendor-requests", vendorRequestRoutes);
app.use("/api/bazaars", bazaarRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/professors", professorRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/student-registrations", studentRegistrationRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/booths", boothRoutes);
app.use("/api/gym-sessions", gymSessionRoutes);
app.use("/api/notifications", notificationRoutes);

// Development email routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use("/api/dev", devEmailRoutes);
}

// Email verification link route
app.get("/api/verify", verifyByToken);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    const { initializeNotificationScheduler } = require('./services/notificationScheduler');
    initializeNotificationScheduler();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
