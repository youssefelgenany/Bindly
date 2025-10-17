// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
<<<<<<< HEAD
app.use(cors({
  origin: 'http://localhost:3000', // React app URL
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/authRoutes');
const bazaarRoutes = require('./routes/bazaarRoutes');
const tripRoutes = require('./routes/tripRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gymRoutes = require('./routes/gymRoutes');
const vendorRequestRoutes = require('./routes/vendorRequestRoutes');
const professorRoutes = require('./routes/professorRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { verifyByToken } = require('./controllers/authVerifyController');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/bazaars', bazaarRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/vendor-requests', vendorRequestRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/events', eventRoutes);

// Email verification link route
app.get('/api/verify', verifyByToken);
=======
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes once only
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

// Email verification link route
app.get("/api/verify", verifyByToken);
>>>>>>> 3d44e049b711fdc9901d70135416234d35764b85

// Test route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
